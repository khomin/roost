// #ifndef CAMERA_MANAGER_H
// #define CAMERA_MANAGER_H

// #include <functional>
// #include <thread>
// #include "vision.grpc.pb.h"

// #include <gstreamer-1.0/gst/gst.h>

// class CameraManager {
// public:
//     using FrameCallback = std::function<void(const vision::v1::FrameChunk&)>;
//     using SubscriptionId = uint64_t;
//     struct Subscription {
//         uint64_t id;
//         // std::shared_ptr<FrameQueue> queue;
//     };

//     Subscription Subscribe(const std::string& camera_id);
//     void Unsubscribe(const std::string& camera_id, SubscriptionId id);

// private:
//     struct CameraStream {
//         GstElement* pipeline;              // the GStreamer pipeline
//         std::thread capture_thread;        // reads frames from appsink
//         // std::vector<Subscriber> subs;      // who's watching
//         std::atomic<bool> stop{false};
//     };

//     std::mutex mu_;
//     std::unordered_map<std::string, CameraStream> cameras_;
// };

// #endif // CAMERA_MANAGER_H
