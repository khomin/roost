#include <vector>
#include <condition_variable>
#include <csignal>

#include "config-cxx/Config.h"
// #include "async_network_client.h"
#include "detector.h"
#include "frame_source.h"

std::vector<std::string> load_coco_names(std::string names_string) {
    std::vector<std::string> coco_names;
    std::stringstream ss(names_string);
    std::string segment;

    while (std::getline(ss, segment, ',')) {
        segment.erase(0, segment.find_first_not_of(" \n\r\t"));
        segment.erase(segment.find_last_not_of(" \n\r\t") + 1);
        if (!segment.empty()) {
            coco_names.push_back(segment);
        }
    }
    return coco_names;
}

std::mutex mtx;
std::atomic<bool> ready_to_exit = false;
std::condition_variable condition;

void signalHandler(int signal) {
    std::lock_guard<std::mutex> lock(mtx);
    ready_to_exit = true;
    condition.notify_all();
}

int main() {
    std::signal(SIGINT, signalHandler);

    config::Config config;

    // processes frames
    Detector detector(
        load_coco_names(config.get<std::string>("CocoNames")),
        config.get<std::string>("YOLO.model_path")
    );

    detector.setTexture();

    // reads frames (camera, file)
    FrameSourceOpenCV source = FrameSourceOpenCV(config.get<int>("camera_id"));
    source.onFrame = [&](FrameItem& frame) {
        if (ready_to_exit) return;
        detector.pushFrame(frame);
        // signal_client.queueUpdate(item);
    };

    if (!source.open()) {
        std::cerr << "Failed to open camera source!" << std::endl;
        return 1;
    }
    detector.start();

    std::cout << "Engine running. Press Ctrl+C to stop." << std::endl;

    std::unique_lock<std::mutex> lock(mtx);
    condition.wait(lock, []{ return ready_to_exit.load() ; });

    std::cout << "Shutdown complete." << std::endl;

    return 0;
}

// AsyncNetworkClient signal_client(
//     config.get<std::string>("Networking.signal_ip") + ":" + std::to_string(config.get<int>("Networking.signal_port"))
// );





// detector.onFrame = [&](DetectionWorkItem& item) {
//     // signal_client.queueUpdate(item);
// };
// detector.run();
