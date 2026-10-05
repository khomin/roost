cmake_minimum_required(VERSION 3.22)

set(PROJECT_NAME roost_vision)
project(${PROJECT_NAME} CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED YES)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

set(CONFIG_BUILD_TESTING OFF)

add_subdirectory(external/config-cxx)
add_subdirectory(external/spdlog)

add_executable(${PROJECT_NAME}
    main.cpp
    gen/v1/vision/vision.grpc.pb.cc
    gen/v1/vision/vision.grpc.pb.h
    gen/v1/vision/vision.pb.cc
    gen/v1/vision/vision.pb.h
    gen/google/api/annotations.grpc.pb.cc
    gen/google/api/annotations.grpc.pb.h
    gen/google/api/annotations.pb.cc
    gen/google/api/annotations.pb.h
    gen/google/api/http.grpc.pb.cc
    gen/google/api/http.grpc.pb.h
    gen/google/api/http.pb.cc
    gen/google/api/http.pb.h
    clients/vision_service.h
    clients/vision_service.cpp
    camera_manager.h
    camera_manager.cpp
    camera_producer.h
    camera_producer.cpp
    shared_layout.h
)

list(APPEND CMAKE_PREFIX_PATH
    "${CMAKE_SOURCE_DIR}/../../.lib_pack/grpc"
)

find_package(PkgConfig REQUIRED)
pkg_check_modules(GST REQUIRED gstreamer-1.0)
pkg_check_modules(GST_APP REQUIRED gstreamer-app-1.0)

find_package(Protobuf CONFIG REQUIRED)
find_package(gRPC CONFIG REQUIRED)

target_include_directories(${PROJECT_NAME} PUBLIC
    ./
    ./clients
    ./gen/
    ./gen/v1/
    ./gen/v1/vision
    ../../.lib_pack/grpc/include
    ${GST_INCLUDE_DIRS}
    ${GST_APP_INCLUDE_DIRS}
)

target_link_libraries(${PROJECT_NAME} PUBLIC
    config-cxx
    spdlog::spdlog_header_only
    gRPC::grpc++
    gRPC::grpc++_reflection
    ${GST_LIBRARIES}
    ${GST_APP_LIBRARIES}
)

# ${OPENCV_LIBRARIES}
# target_precompile_headers(config-cxx PUBLIC "<algorithm>")

# add_custom_command(TARGET ${PROJECT} POST_BUILD
#     COMMAND ${CMAKE_COMMAND} -E copy
#             "${CMAKE_CURRENT_SOURCE_DIR}/config.json"
#             "$<TARGET_FILE_DIR:${PROJECT}>/config/config.json"
#     COMMENT "Copying config.json to the executable directory"
# )