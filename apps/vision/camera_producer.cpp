#include "camera_producer.h"

#include <fcntl.h>
#include <sys/mman.h>
#include <unistd.h>
#include <cstring>
#include <stdexcept>

#include <spdlog/spdlog.h>

#include "shared_layout.h"

// camera_producer.cpp
CameraProducer::CameraProducer(std::string camera_id,
                               std::string source_path,
                               vision::v1::CameraType type)
    : camera_id_(std::move(camera_id))
    , source_path_(std::move(source_path))
    , type_(type)
    , shm_name_("/roost_" + camera_id_)
{}

CameraProducer::~CameraProducer() {
    stop();
}

std::string CameraProducer::buildPipeline() const {
    switch (type_) {
    case vision::v1::CAMERA_TYPE_RTSP:
        return "rtspsrc location=" + source_path_ + " latency=0 ! "
                                                    "rtph264depay ! h264parse ! "
                                                    "video/x-h264,stream-format=avc,alignment=au ! "
                                                    "appsink name=sink max-buffers=2 drop=true sync=false";
    case vision::v1::CAMERA_TYPE_USB:
        // USB camera, raw frames for YOLO, H.264 for output
        return "v4l2src device=" + source_path_ + " ! "
                                                  "videoconvert ! video/x-raw,format=BGR ! "
                                                  "tee name=t "
                                                  "t. ! queue ! appsink name=raw_sink "
                                                  "t. ! queue ! videoconvert ! x264enc key-int-max=30 speed-preset=ultrafast ! "
                                                  "h264parse config-interval=-1 ! "
                                                  "video/x-h264,stream-format=avc,alignment=au ! "
                                                  "appsink name=encoded_sink async=false";
    default:
        throw std::runtime_error("unknown camera type");
    }
}

std::string CameraProducer::start() {
    // 1. Shared memory first — if this fails, don't touch GStreamer.
    setupShm();

    // 2. Detector (you can make this optional / lazy if it's heavy).
    // detector_ = std::make_unique<YoloDetector>(/* model path, etc. */);

    // 3. Build the pipeline.
    GError* err = nullptr;
    auto desc = buildPipeline();
    spdlog::info("pipeline for {}: {}", camera_id_, desc);

    pipeline_ = gst_parse_launch(desc.c_str(), &err);
    if (!pipeline_) {
        std::string msg = err ? err->message : "unknown";
        if (err) g_error_free(err);
        teardownShm();
        // detector_.reset();
        throw std::runtime_error("pipeline build failed: " + msg);
    }

    // 4. Get BOTH sinks by the names used in the pipeline.
    raw_sink_     = gst_bin_get_by_name(GST_BIN(pipeline_), "raw_sink");
    encoded_sink_ = gst_bin_get_by_name(GST_BIN(pipeline_), "encoded_sink");

    if (!raw_sink_ || !encoded_sink_) {
        if (raw_sink_)     { gst_object_unref(raw_sink_);     raw_sink_ = nullptr; }
        if (encoded_sink_) { gst_object_unref(encoded_sink_); encoded_sink_ = nullptr; }
        gst_object_unref(pipeline_);
        pipeline_ = nullptr;
        teardownShm();
        // detector_.reset();
        throw std::runtime_error("appsink not found (raw_sink/encoded_sink)");
    }

    // 5. Start playing.
    auto ret = gst_element_set_state(pipeline_, GST_STATE_PLAYING);
    if (ret == GST_STATE_CHANGE_FAILURE) {
        gst_object_unref(raw_sink_);     raw_sink_ = nullptr;
        gst_object_unref(encoded_sink_); encoded_sink_ = nullptr;
        gst_object_unref(pipeline_);     pipeline_ = nullptr;
        teardownShm();
        // detector_.reset();
        throw std::runtime_error("set_state(PLAYING) failed");
    }

    // 6. Wait until it actually reaches PLAYING (or times out).
    GstState state = GST_STATE_VOID_PENDING;
    GstState pending = GST_STATE_VOID_PENDING;
    ret = gst_element_get_state(pipeline_, &state, &pending, 15 * GST_SECOND);
    if (ret != GST_STATE_CHANGE_SUCCESS) {
        gst_element_set_state(pipeline_, GST_STATE_NULL);
        gst_object_unref(raw_sink_);     raw_sink_ = nullptr;
        gst_object_unref(encoded_sink_); encoded_sink_ = nullptr;
        gst_object_unref(pipeline_);     pipeline_ = nullptr;
        teardownShm();
        // detector_.reset();
        throw std::runtime_error(
            "pipeline did not reach PLAYING within 15s (state=" +
            std::string(gst_element_state_get_name(state)) + ")"
        );
    }

    // 7. Spin up the capture loop.
    running_ = true;
    capture_thread_ = std::thread([this] { captureLoop(); });

    spdlog::info("camera {} started, shm={}", camera_id_, shm_name_);
    return shm_name_;
}
void CameraProducer::stop() {
    if (!running_.exchange(false)) return;

    if (capture_thread_.joinable()) {
        capture_thread_.join();
    }

    if (pipeline_) {
        gst_element_set_state(pipeline_, GST_STATE_NULL);
        gst_element_get_state(pipeline_, nullptr, nullptr, GST_CLOCK_TIME_NONE);
    }
    if (raw_sink_) {
        gst_object_unref(raw_sink_);
        raw_sink_ = nullptr;
    }
    if (pipeline_) {
        gst_object_unref(pipeline_);
        pipeline_ = nullptr;
    }

    teardownShm();
    spdlog::info("camera {} stopped", camera_id_);
}

void CameraProducer::setupShm() {
    shm_size_ = sizeof(SharedRingBuffer) + roost::ipc::SlotCount * roost::ipc::SlotSize;

    shm_fd_ = shm_open(shm_name_.c_str(), O_CREAT | O_RDWR, 0666);
    if (shm_fd_ == -1) {
        throw std::runtime_error("shm_open failed: " + std::string(strerror(errno)));
    }
    if (ftruncate(shm_fd_, shm_size_) == -1) {
        close(shm_fd_); shm_fd_ = -1;
        throw std::runtime_error("ftruncate failed");
    }

    void* addr = mmap(nullptr, shm_size_, PROT_READ | PROT_WRITE, MAP_SHARED, shm_fd_, 0);
    if (addr == MAP_FAILED) {
        close(shm_fd_); shm_fd_ = -1;
        throw std::runtime_error("mmap failed");
    }

    shm_ = static_cast<SharedRingBuffer*>(addr);
    __atomic_store_n(&shm_->head, 0, __ATOMIC_RELAXED);
    __atomic_store_n(&shm_->tail, 0, __ATOMIC_RELAXED);
}

void CameraProducer::teardownShm() {
    if (shm_) {
        munmap(shm_, shm_size_);
        shm_ = nullptr;
    }
    if (shm_fd_ != -1) {
        close(shm_fd_);
        shm_fd_ = -1;
    }
    if (!shm_name_.empty()) {
        shm_unlink(shm_name_.c_str());
    }
}

void CameraProducer::captureLoop() {
    while (running_.load()) {
        // 1. Raw frame for YOLO
        GstSample* raw = gst_app_sink_try_pull_sample(
            GST_APP_SINK(raw_sink_), 100 * GST_MSECOND);
        if (!raw) continue;
        uint64_t ts = GST_BUFFER_PTS(gst_sample_get_buffer(raw));

        // cv::Mat frame = sampleToMat(raw);
        // gst_sample_unref(raw);

        // if (frame.empty()) continue;

        // 2. YOLO
        // std::vector<Detection> dets;
        // if (detector_) {
        //     dets = detector_->infer(frame);
        // }

        // 3. Encoded frame for shm
        GstSample* enc = gst_app_sink_try_pull_sample(
            GST_APP_SINK(encoded_sink_), 100 * GST_MSECOND);
        if (!enc) continue;

        GstBuffer* buf = gst_sample_get_buffer(enc);
        GstMapInfo map;
        if (gst_buffer_map(buf, &map, GST_MAP_READ)) {
            bool is_keyframe = !GST_BUFFER_FLAG_IS_SET(buf, GST_BUFFER_FLAG_DELTA_UNIT);
            pushFrame(map.data, map.size, ts, is_keyframe);
            gst_buffer_unmap(buf, &map);
            if(is_keyframe) {
                spdlog::info("got keyframe");
            }
        }
        gst_sample_unref(enc);

        // 4. Detections out (gRPC or whatever you pick)
        // sendDetections(dets, ts);
    }
}

void CameraProducer::pushFrame(const uint8_t* data, uint32_t size,
                               uint64_t timestamp_ns, bool is_keyframe)
{
    if (!shm_) return;

    uint64_t head = __atomic_load_n(&shm_->head, __ATOMIC_RELAXED);
    uint64_t tail = __atomic_load_n(&shm_->tail, __ATOMIC_ACQUIRE);

    if ((head + 1) % roost::ipc::SlotCount == tail) {
        if (!ring_full_logged_) {
            spdlog::warn("ring full for {}, dropping frames", camera_id_);
            ring_full_logged_ = true;
        }
        return;
    }

    if (ring_full_logged_) {
        spdlog::info("ring drained for {}", camera_id_);
        ring_full_logged_ = false;
    }

    uint64_t slot_index = head % roost::ipc::SlotCount;
    uint8_t* slot = shm_->slots[slot_index];

    FrameHeader* hdr = reinterpret_cast<FrameHeader*>(slot);
    hdr->timestamp_ns = timestamp_ns;
    hdr->size         = size;
    hdr->flags        = is_keyframe ? 1u : 0u;

    uint8_t* payload = slot + sizeof(FrameHeader);
    uint32_t max_payload = roost::ipc::SlotSize - sizeof(FrameHeader);
    uint32_t to_copy = size < max_payload ? size : max_payload;
    std::memcpy(payload, data, to_copy);

    __atomic_store_n(&shm_->head, head + 1, __ATOMIC_RELEASE);
}