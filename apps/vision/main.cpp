#include <csignal>
#include <atomic>

#include "spdlog/spdlog.h"
#include <grpcpp/ext/proto_server_reflection_plugin.h>
#include "clients/vision_service.h"

std::atomic<bool> shutdown_;
std::condition_variable cv;
std::mutex mtx;

void signalHandler(int signal) {
    std::lock_guard<std::mutex> lock(mtx);
    shutdown_ = true;
    cv.notify_all();
}

struct Args {
    std::string host = "0.0.0.0";
    int         port = 50052;
    std::string config_path;
};

Args parseArgs(int argc, char* argv[]) {
    Args a;
    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];

        auto next = [&]() -> std::string {
            if (i + 1 >= argc) {
                throw std::runtime_error("missing value for " + arg);
            }
            return argv[++i];
        };

        if (arg == "--port" || arg == "-p") {
            a.port = std::stoi(next());
        } else if (arg == "--host") {
            a.host = next();
        } else if (arg == "--config" || arg == "-c") {
            a.config_path = next();
        } else if (arg == "--help" || arg == "-h") {
            std::cout << "usage: vision [--host H] [--port P] [--config F]\n";
            std::exit(0);
        } else {
            throw std::runtime_error("unknown flag: " + arg);
        }
    }
    return a;
}

int main(int argc, char* argv[]) {
    std::signal(SIGINT,  signalHandler);
    std::signal(SIGTERM, signalHandler);

    spdlog::info("roost vision");

    Args args;
    try {
        args = parseArgs(argc, argv);
    } catch (const std::exception& e) {
        spdlog::error("bad args: {}", e.what());
        return 1;
    }
    const std::string address = args.host + ":" + std::to_string(args.port);

    spdlog::info("using address {}", address);

    gst_init(&argc, &argv);

    VisionServiceImpl service;

    // start grpc
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