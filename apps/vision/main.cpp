// #include <condition_variable>
#include <csignal>
#include <iostream>
#include <atomic>

#include "spdlog/spdlog.h"
#include "config-cxx/config.h"

#include "vision/vision.grpc.pb.h"

#include "clients/vision_service.h""

std::mutex mtx;
std::atomic<bool> ready_to_exit{};
std::condition_variable condition;

void signalHandler(int signal) {
  std::lock_guard<std::mutex> lock(mtx);
  ready_to_exit = true;
  condition.notify_all();
}

int main() {
  std::signal(SIGINT, signalHandler);

  config::Config config;

  VisionServiceImpl visionService{};

  // visionService.Start

  // config.get<std::string>("");

  //
  // read basic immutable config

  //
  // start grpc to received commands

  //
  // start some command hadler to run camera streams

  std::cout << "hello" << std::endl;

  return 0;
}
