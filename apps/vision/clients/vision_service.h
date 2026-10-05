#pragma once

#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>

#include <grpcpp/grpcpp.h>
#include "vision.pb.h"
#include "vision/vision.grpc.pb.h"
#include "camera_producer.h"

class VisionServiceImpl final : public vision::v1::VisionService::Service {
public:
    VisionServiceImpl();
    ~VisionServiceImpl() override;

    grpc::Status StartStream(
        grpc::ServerContext* context,
        const vision::v1::StartStreamRequest* request,
        vision::v1::StartStreamResponse* response) override;

    grpc::Status StopStream(
        grpc::ServerContext* context,
        const vision::v1::StopStreamRequest* request,
        vision::v1::StopStreamResponse* response) override;

private:
    std::mutex mu_;
    std::unordered_map<std::string, std::unique_ptr<CameraProducer>> producers_;
};