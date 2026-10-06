// #include <condition_variable>
#include <csignal>
// #include <iostream>
#include <atomic>

#include "spdlog/spdlog.h"
#include "config-cxx/config.h"

#include <grpcpp/ext/proto_server_reflection_plugin.h>
#include "vision/vision.grpc.pb.h"

#include "clients/vision_service.h""

std::atomic<bool> shutdown_;
std::condition_variable cv;
std::mutex mtx;

void signalHandler(int signal) {
    std::lock_guard<std::mutex> lock(mtx);
    shutdown_ = true;
    cv.notify_all();
}

int main(int argc, char* argv[]) {
    std::signal(SIGINT,  signalHandler);
    std::signal(SIGTERM, signalHandler);

    spdlog::info("roost vision");

    gst_init(&argc, &argv);

    //
    // read basic immutable config
    // config::Config config;
    // config.get<std::string>("");

    //
    // start grpc to received commands

    const std::string address = "0.0.0.0:50052";

    VisionServiceImpl service;

    grpc::ServerBuilder builder;
    builder.AddListeningPort(address, grpc::InsecureServerCredentials());
    builder.RegisterService(&service);
    grpc::reflection::InitProtoReflectionServerBuilderPlugin();

    std::unique_ptr<grpc::Server> server = builder.BuildAndStart();
    if (!server) {
        spdlog::error("failed to start gRPC server on {}", address);
        return 1;
    }
    spdlog::info("vision service listening on {}", address);

    std::unique_lock<std::mutex> lock(mtx);
    cv.wait(lock, [&] { return shutdown_.load(); });

    spdlog::info("exit");

    return 0;
}