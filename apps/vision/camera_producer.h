#pragma once

#include <atomic>
#include <cstdint>
#include <string>
#include <thread>
#include <gst/gst.h>
#include <gst/app/gstappsink.h>

#include "shared_layout.h"   // your SharedRingBuffer struct

#include "vision/vision.grpc.pb.h"

// camera_producer.hpp
#pragma once

#include <atomic>
#include <cstdint>
#include <string>
#include <thread>

#include <gst/gst.h>
#include <gst/app/gstappsink.h>
// #include <opencv2/core.hpp>

#include "shared_layout.h"   // FrameHeader, SharedRingBuffer, roost::ipc::*

class YoloDetector;   // forward decl — you'll define this separately

class CameraProducer {
public:
    CameraProducer(std::string camera_id,
                   std::string source_path,
                   vision::v1::CameraType type);
    ~CameraProducer();

    std::string start();
    void stop();

    const std::string& shmName() const { return shm_name_; }
    bool isRunning() const { return running_.load(); }

private:
    // Setup / teardown
    void setupShm();
    void teardownShm();
    std::string buildPipeline() const;
    void captureLoop();

    // Frame plumbing
    // cv::Mat sampleToMat(GstSample* sample);
    void pushFrame(const uint8_t* data, uint32_t size, uint64_t timestamp_ns, bool is_keyframe);

    // void sendDetections(const std::vector<Detection>& dets, uint64_t ts);

    // State
    std::string camera_id_;
    std::string source_path_;
    vision::v1::CameraType type_;
    std::string shm_name_;

    // GStreamer
    GstElement* pipeline_    = nullptr;
    GstElement* raw_sink_    = nullptr;   // appsink name=raw_sink
    GstElement* encoded_sink_= nullptr;   // appsink name=encoded_sink

    // Shared memory
    int shm_fd_ = -1;
    SharedRingBuffer* shm_ = nullptr;
    size_t shm_size_ = 0;

    // Threading
    std::thread capture_thread_;
    std::atomic<bool> running_{false};
    bool ring_full_logged_ = false;

    // Detector (owned)
    // std::unique_ptr<YoloDetector> detector_;
};