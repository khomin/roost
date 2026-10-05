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
        return "v4l2src device=" + source_path_ + " ! "
                                                  "videoconvert ! "
                                                  "appsink name=sink max-buffers=2 drop=true sync=false";
    default:
        throw std::runtime_error("unknown camera type");
    }
}

std::string CameraProducer::start() {
    setupShm();

    GError* err = nullptr;
    auto desc = buildPipeline();
    pipeline_ = gst_parse_launch(desc.c_str(), &err);
    if (!pipeline_) {
        std::string msg = err ? err->message : "unknown";
        if (err) g_error_free(err);
        teardownShm();
        throw std::runtime_error("pipeline build failed: " + msg);
    }

    sink_ = gst_bin_get_by_name(GST_BIN(pipeline_), "sink");
    if (!sink_) {
        teardownShm();
        gst_object_unref(pipeline_); pipeline_ = nullptr;
        throw std::runtime_error("appsink not found");
    }

    auto ret = gst_element_set_state(pipeline_, GST_STATE_PLAYING);
    if (ret == GST_STATE_CHANGE_FAILURE) {
        teardownShm();
        gst_object_unref(sink_);     sink_ = nullptr;
        gst_object_unref(pipeline_); pipeline_ = nullptr;
        throw std::runtime_error("set_state(PLAYING) failed");
    }

    GstState state, pending;
    ret = gst_element_get_state(pipeline_, &state, &pending, 5 * GST_SECOND);
    if (ret != GST_STATE_CHANGE_SUCCESS) {
        teardownShm();
        gst_element_set_state(pipeline_, GST_STATE_NULL);
        gst_object_unref(sink_);     sink_ = nullptr;
        gst_object_unref(pipeline_); pipeline_ = nullptr;
        throw std::runtime_error("pipeline did not reach PLAYING");
    }

    running_ = true;
    capture_thread_ = std::thread([this] { captureLoop(); });

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
    if (sink_) {
        gst_object_unref(sink_);
        sink_ = nullptr;
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
        GstSample* sample = gst_app_sink_try_pull_sample(GST_APP_SINK(sink_), 100 * GST_MSECOND);
        if (!sample) continue;   // timeout, check running_ again

        GstBuffer* buf = gst_sample_get_buffer(sample);
        GstMapInfo map;
        if (!gst_buffer_map(buf, &map, GST_MAP_READ)) {
            gst_sample_unref(sample);
            continue;
        }

        bool is_keyframe = !GST_BUFFER_FLAG_IS_SET(buf, GST_BUFFER_FLAG_DELTA_UNIT);
        uint64_t ts = GST_BUFFER_PTS(buf);   // or use now_ns()

        pushFrame(map.data, map.size, ts, is_keyframe);

        gst_buffer_unmap(buf, &map);
        gst_sample_unref(sample);
    }
}

void CameraProducer::pushFrame(const uint8_t* data,
                               uint32_t size,
                               uint64_t timestamp_ns,
                               bool is_keyframe)
{
    if (!shm_) return;

    // 1. Load current head and tail
    uint64_t head = __atomic_load_n(&shm_->head, __ATOMIC_RELAXED);
    uint64_t tail = __atomic_load_n(&shm_->tail, __ATOMIC_ACQUIRE);

    // 2. Ring full? (head + 1 == tail in a ring of SlotCount)
    //    We leave one slot empty to distinguish full from empty.
    if ((head + 1) % roost::ipc::SlotCount == tail) {
        spdlog::warn("ring full for camera {}, dropping frame", camera_id_);
        return;
    }

    // 3. Pick the slot
    uint64_t slot_index = head % roost::ipc::SlotCount;
    uint8_t* slot = shm_->slots[slot_index];

    // 4. Write the header
    FrameHeader* hdr = reinterpret_cast<FrameHeader*>(slot);
    hdr->timestamp_ns = timestamp_ns;
    hdr->size         = size;
    hdr->flags        = is_keyframe ? 1u : 0u;

    // 5. Write the payload immediately after the header
    uint8_t* payload = slot + sizeof(FrameHeader);
    uint32_t max_payload = roost::ipc::SlotSize - sizeof(FrameHeader);
    uint32_t to_copy = size < max_payload ? size : max_payload;
    std::memcpy(payload, data, to_copy);

    // 6. Publish: advance head with RELEASE.
    //    This guarantees the header + payload writes above are visible
    //    to any thread/process that sees the new head value.
    __atomic_store_n(&shm_->head, head + 1, __ATOMIC_RELEASE);
}