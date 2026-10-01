#ifndef NETWORKCLIENT_H
#define NETWORKCLIENT_H

#include <string>
#include "protobuf/generated/tracker.pb.h"
#include "protobuf/generated/tracker.grpc.pb.h"
#include <grpcpp/grpcpp.h>

class NetworkClient {
public:
    NetworkClient(std::string ip, int port);
    ~NetworkClient();

    bool startStreaming();
    void stopStreaming();
    bool sendUpdate(const tracker::FrameUpdate& update);

    int add(tracker::TrackEvent* event);

private:
    // gRPC objects
    std::shared_ptr<grpc::Channel> channel_;
    std::shared_ptr<tracker::TrackerService::Stub> stub_;

    // The context holds metadata, deadlines, etc., for the RPC.
    std::shared_ptr<grpc::ClientContext> context_;

    // The stream writer object, used to push messages to the server.
    // W is the message type (FrameUpdate) and R is the response type (StreamStatus).
    std::shared_ptr<grpc::ClientWriter<tracker::FrameUpdate>> client_writer_;

    // The object that will hold the final response from the Go server.
    tracker::StreamStatus status_response_;
};

#endif // NETWORKCLIENT_H
