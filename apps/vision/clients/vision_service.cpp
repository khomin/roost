#include "vision_service.h"
#include <spdlog/spdlog.h>

VisionServiceImpl::VisionServiceImpl() = default;

VisionServiceImpl::~VisionServiceImpl() {
    std::lock_guard lock(mu_);
    producers_.clear();   // destructors stop GStreamer + unlink shm
}

grpc::Status VisionServiceImpl::StartStream(
    grpc::ServerContext* context,
    const vision::v1::StartStreamRequest* request,
    vision::v1::StartStreamResponse* response)
{
    const std::string camera_id = request->camera_id();

    // Helper: fill the response from a producer
    auto fill = [&](CameraProducer* p) {
        response->set_shm_name(p->shmName());
        response->set_slot_count(roost::ipc::SlotCount);
        response->set_slot_size(roost::ipc::SlotSize);
        response->set_header_size(sizeof(FrameHeader));
    };

    // 1. Fast path: already running?
    {
        std::lock_guard lock(mu_);
        auto it = producers_.find(camera_id);
        if (it != producers_.end()) {
            fill(it->second.get());
            return grpc::Status::OK;
        }
    }

    // 2. Not running. Start outside the lock.
    std::unique_ptr<CameraProducer> producer;
    try {
        producer = std::make_unique<CameraProducer>(
            camera_id,
            request->source_path(),
            request->type()
        );
        producer->start();
    } catch (const std::exception& e) {
        spdlog::error("camera {} failed: {}", camera_id, e.what());
        return grpc::Status(
            grpc::StatusCode::INTERNAL,
            std::string("start failed: ") + e.what()
            );
    }

    // 3. Commit. try_emplace handles the race.
    {
        std::lock_guard lock(mu_);
        auto [it, inserted] = producers_.try_emplace(
            camera_id, std::move(producer)
        );
        if (!inserted) {
            // Lost the race. Stop ours, use the winner's.
            producer->stop();
            fill(it->second.get());
        } else {
            fill(it->second.get());
        }
    }

    return grpc::Status::OK;
}

grpc::Status VisionServiceImpl::StopStream(
    grpc::ServerContext* context,
    const vision::v1::StopStreamRequest* request,
    vision::v1::StopStreamResponse* response) {
    return grpc::Status::OK;
}