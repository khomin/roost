#ifndef ASYNCNETWORKCLIENT_H
#define ASYNCNETWORKCLIENT_H

#include <string>
#include <thread>
#include "safe_queue.h"
#include "detection_work_item.h"
#include "protobuf/generated/tracker.pb.h"
#include "protobuf/generated/tracker.grpc.pb.h"
#include <grpcpp/grpcpp.h>

const uint32_t DETECTOR_NODE_ID = 42;

class AsyncNetworkClient {
public:
    AsyncNetworkClient(std::string target_address) : target_(target_address), running_(true) {
        grpc::ChannelArguments args;
        // High-performance settings: fix the "slow reconnect"
        args.SetInt(GRPC_ARG_KEEPALIVE_TIME_MS, 5000);
        args.SetInt(GRPC_ARG_KEEPALIVE_TIMEOUT_MS, 2000);
        args.SetInt(GRPC_ARG_MIN_RECONNECT_BACKOFF_MS, 1000);
        args.SetInt(GRPC_ARG_MAX_RECONNECT_BACKOFF_MS, 3000);

        channel_ = grpc::CreateCustomChannel(target_, grpc::InsecureChannelCredentials(), args);
        stub_ = tracker::TrackerService::NewStub(channel_);

        // Start the background sender thread
        worker_thread_ = std::thread(&AsyncNetworkClient::sendLoop, this);
    }

    ~AsyncNetworkClient() {
        running_ = false;
        queue_.request_shutdown();
        if (worker_thread_.joinable()) {
            worker_thread_.join();
        }
    }

    void queueUpdate(DetectionWorkItem& item) {
        queue_.push(std::move(item));
    }

private:
    void sendLoop() {
        while (running_) {
            auto context = std::make_unique<grpc::ClientContext>();
            tracker::StreamStatus response;
            auto writer = stub_->StreamUpdates(context.get(), &response);

            if (!writer) {
                std::this_thread::sleep_for(std::chrono::seconds(1));
                continue; // Retry connection
            }

            while (running_) {
                auto work = queue_.pop();
                if(work.has_value()) {
                    tracker::FrameUpdate frame_update;
                    frame_update.set_frame_number(work->frame_count);

                    std::vector<uchar> buffer;
                    std::vector<int> compression_params;
                    // Optional: set JPEG quality (0-100), default is 95.
                    // Lower quality saves bandwidth.
                    compression_params.push_back(cv::IMWRITE_JPEG_QUALITY);
                    compression_params.push_back(80);

                    auto ok = cv::imencode(".jpeg", work->frame, buffer, compression_params);
                    if(ok) {
                        frame_update.set_encoded_frame(buffer.data(), buffer.size());
                    }

                    for (size_t i = 0; i < work->detections.size(); ++i) {
                        const cv::Rect& rect = work->detections[i];
                        tracker::TrackEvent* event = frame_update.add_events();

                        // --- Populate TrackEvent fields ---
                        event->set_tracker_id(DETECTOR_NODE_ID);
                        event->set_timestamp_ms(std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count());
                        event->set_class_name(work->names[i]);
                        event->set_class_id(work->class_ids[i]);
                        event->set_confidence(work->confidences[i]);

                        // --- Populate the BoundingBox sub-message ---
                        tracker::BoundingBox* bbox = event->mutable_box();
                        bbox->set_x(rect.x);
                        bbox->set_y(rect.y);
                        bbox->set_width(rect.width);
                        bbox->set_height(rect.height);
                    }

                    if (!writer->Write(frame_update)) {
                        std::cerr << "Stream broke. Attempting reconnect..." << std::endl;
                        break; // Exit inner loop to trigger reconnect
                    }
                }
            }
            writer->WritesDone();
            writer->Finish();
        }
    }

    std::string target_;
    bool running_;
    SafeQueue<DetectionWorkItem> queue_;
    std::thread worker_thread_;
    std::shared_ptr<grpc::Channel> channel_;
    std::unique_ptr<tracker::TrackerService::Stub> stub_;
};
#endif // ASYNCNETWORKCLIENT_H
