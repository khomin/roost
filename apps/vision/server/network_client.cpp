#include "network_client.h"
#include <thread>

NetworkClient::NetworkClient(std::string ip, int port) {
    // 1. Create a Channel to the Go server (using insecure credentials for local setup)
    std::string target_address = ip + ":" + std::to_string(port);
    channel_ = grpc::CreateChannel(target_address, grpc::InsecureChannelCredentials());

    // 2. Create the Stub (The Client Proxy that handles RPC calls)
    stub_ = tracker::TrackerService::NewStub(channel_);
    std::cout << "NetworkClient initialized for server: " << target_address << std::endl;
}

NetworkClient::~NetworkClient() {
    // TODO
}

int NetworkClient::add(tracker::TrackEvent* event) {
    return 0;
}

// --- StartStreaming ---
bool NetworkClient::startStreaming() {
    std::cout << "Opening new StreamUpdates RPC..." << std::endl;

    if (client_writer_ != nullptr) {
        // Important: You must explicitly close the stream to release resources.
        // Even though the Write() failed, the resources are still held.
        client_writer_->WritesDone();

        // Finish the RPC and get the final status
        grpc::Status status = client_writer_->Finish();

        // Delete the old writer object
        client_writer_ = nullptr;
    }

    if (context_ != nullptr) {
        context_ = nullptr;
    }
    context_ = std::make_shared<grpc::ClientContext>();

    // Initiate the streaming RPC call:
    // The stub creates the ClientWriter object, linking the context and the final response object.
    client_writer_ = stub_->StreamUpdates(context_.get(), &status_response_);

    if (!client_writer_) {
        std::cerr << "ERROR: Failed to create ClientWriter for stream." << std::endl;
        return false;
    }
    return true;
}

// --- sendUpdate (The new sendProtobuf) ---
bool NetworkClient::sendUpdate(const tracker::FrameUpdate& update) {
    // 1. The gRPC Write() call handles all serialization (Protobuf),
    //    framing (HTTP/2), and socket writes for you.
    bool success = client_writer_->Write(update);

    if (!success) {
        // This fails if the server closes the stream, the connection drops, etc.
        std::cerr << "WARNING: gRPC stream write failed. Stream may be closed." << std::endl;
        // The calling thread should now call StopStreaming() to finalize the RPC status.
    } else {
//        std::cout << "GOOD: gRPC sent frame len=" << update.encoded_frame().length()  << std::endl;
    }
    return success;
}

// --- StopStreaming ---
void NetworkClient::stopStreaming() {
    if (!client_writer_) {
        std::cerr << "Cannot stop streaming: writer not initialized." << std::endl;
        return;
    }

    // 1. Signal to the server that the client has finished sending data.
    client_writer_->WritesDone();

    // 2. Wait for the server to process the stream and send its final response.
    grpc::Status status = client_writer_->Finish();

    if (status.ok()) {
        std::cout << "Stream closed successfully. Server response success: "
                  << (status_response_.success() ? "Yes" : "No") << std::endl;
    } else {
        std::cerr << "RPC failed (" << status.error_code() << "): "
                  << status.error_message() << std::endl;
    }
    client_writer_ = nullptr;
}
