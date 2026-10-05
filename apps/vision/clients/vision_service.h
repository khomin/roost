#pragma once

#include "vision.pb.h"
#include "vision/vision.grpc.pb.h"
#include <grpcpp/grpcpp.h>

class VisionServiceImpl : public vision::v1::CameraService::Service {
  virtual ::grpc::Status StartStream(::grpc::ServerContext* context, const ::vision::v1::StartStreamRequest* request, ::grpc::ServerWriter< ::vision::v1::FrameChunk>* writer) {
    auto id = request->camera_id();
    writer->Write(const vision::v1::FrameChunk &msg, grpc::WriteOptions options);
    return ::grpc::Status::CANCELLED;
  }

  // VisionServiceImpl(std::shared_ptr<grpc::Channel> channel)
  //     : stub_(vision::v1::CameraService::NewStub(channel)) {}

    // bool doSomething() {
    //     vision::v1::StartStreamRequest request{};
    //     request.set_camera_id(Arg_ &&arg, Args_ args...)
    // }

//   bool GetCamera(const std::string &camera_id, roost::v1::Camera *camera) {
//     roost::v1::GetCameraRequest request;
//     request.set_id(camera_id);

//     grpc::ClientContext context;
//     grpc::Status status = stub_->GetCamera(&context, request, camera);

//     if (status.ok()) {
//       return true;
//     } else {
//       std::cout << "RPC failed: " << status.error_message() << std::endl;
//       return false;
//     }
//   }

private:
  std::unique_ptr<vision::v1::CameraService::Stub> stub_;
};
