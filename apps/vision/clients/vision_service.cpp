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
    grpc::ServerWriter<vision::v1::StartStreamEvent>* writer)
{
    const std::string camera_id = request->camera_id();

    // helper
    auto fill = [&](CameraProducer* p) {
        vision::v1::StartStreamEvent ev{};
        auto result = new vision::v1::StartStreamResult();
        ev.set_allocated_started(result);
        result->set_shm_name(p->shmName());
        result->set_slot_count(roost::ipc::SlotCount);
        result->set_slot_size(roost::ipc::SlotSize);
        result->set_header_size(sizeof(FrameHeader));
        writer->Write(ev);
    };

    // if already running
    {
        std::lock_guard lock(mu_);
        auto it = producers_.find(camera_id);
        if (it != producers_.end()) {
            fill(it->second.get());
            return grpc::Status::OK;
        }
    }

    // start
    std::shared_ptr<CameraProducer> producer;
    try {
        producer = std::make_shared<CameraProducer>(
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

    // commit
    {
        std::lock_guard lock(mu_);
        auto [it, inserted] = producers_.try_emplace(camera_id, producer);
        if (!inserted) {
            // Lost the race. Stop ours, use the winner's.
            producer->stop();
            fill(it->second.get());
        } else {
            fill(it->second.get());
        }
    }
    while (!context->IsCancelled()) {
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }

    // stop
    {
        std::lock_guard lock(mu_);
        auto it = producers_.find(camera_id);
        if (it != producers_.end()) {
            producers_.erase(it);
            return grpc::Status::OK;
        }
    }
    return grpc::Status::OK;
}

grpc::Status VisionServiceImpl::StopStream(
    grpc::ServerContext* context,
    const vision::v1::StopStreamRequest* request,
    vision::v1::StopStreamResponse* response) {
    const std::string camera_id = request->camera_id();
    {
        std::lock_guard lock(mu_);
        auto it = producers_.find(camera_id);
        if (it != producers_.end()) {
            producers_.erase(it);
            return grpc::Status::OK;
        }
    }
    return grpc::Status::OK;
}