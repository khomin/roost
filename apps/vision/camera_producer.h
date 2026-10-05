#pragma once

#include <atomic>
#include <cstdint>
#include <string>
#include <thread>
#include <gst/gst.h>
#include <gst/app/gstappsink.h>

#include "shared_layout.h"   // your SharedRingBuffer struct

#include "vision/vision.grpc.pb.h"

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

    void pushFrame(const uint8_t* data, uint32_t size, uint64_t timestamp_ns, bool is_keyframe);

private:
    void setupShm();
    void teardownShm();
    void captureLoop();
    std::string buildPipeline() const;

    std::string camera_id_;
    std::string source_path_;
    vision::v1::CameraType type_;
    std::string shm_name_;

    // Shared memory
    int shm_fd_ = -1;
    SharedRingBuffer* shm_ = nullptr;
    size_t shm_size_ = 0;

    // GStreamer
    GstElement* pipeline_ = nullptr;
    GstElement* sink_ = nullptr;

    // Threading
    std::thread capture_thread_;
    std::atomic<bool> running_{false};
};