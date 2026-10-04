#include "api/gen/cpp/roost/v1/roost.grpc.pb.h"
#include <grpcpp/grpcpp.h>

class RoostClient {
public:
  RoostClient(std::shared_ptr<grpc::Channel> channel)
      : stub_(roost::v1::Roost::NewStub(channel)) {}

  // Example method: Get a camera by ID
  bool GetCamera(const std::string &camera_id, roost::v1::Camera *camera) {
    roost::v1::GetCameraRequest request;
    request.set_id(camera_id);

    grpc::ClientContext context;
    grpc::Status status = stub_->GetCamera(&context, request, camera);

    if (status.ok()) {
      return true;
    } else {
      std::cout << "RPC failed: " << status.error_message() << std::endl;
      return false;
    }
  }

private:
  std::unique_ptr<roost::v1::Roost::Stub> stub_;
};
