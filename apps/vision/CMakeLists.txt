cmake_minimum_required(VERSION 3.22)

set(PROJECT_NAME roost_vision)
project(${PROJECT_NAME} CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED YES)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# if (MSVC)
#     set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /std:c++20 /permissive- /bigobj")
# else ()
#     set(CMAKE_CXX_FLAGS
#         "${CMAKE_CXX_FLAGS} -Wall -Wextra -Wpedantic -Wconversion -Wformat"
#     )
# endif ()

set(CONFIG_BUILD_TESTING OFF)

add_subdirectory(external/config-cxx)
add_subdirectory(external/spdlog)

add_executable(${PROJECT_NAME}
    ./main.cpp
    ./gen/v1/vision/vision.grpc.pb.cc
    ./gen/v1/vision/vision.grpc.pb.h
    ./gen/v1/vision/vision.pb.cc
    ./gen/v1/vision/vision.pb.h
    /Users/panic/Documents/PROJECTS/roost/apps/vision/gen/google/api/annotations.grpc.pb.cc
    /Users/panic/Documents/PROJECTS/roost/apps/vision/gen/google/api/annotations.grpc.pb.h
    /Users/panic/Documents/PROJECTS/roost/apps/vision/gen/google/api/annotations.pb.cc
    /Users/panic/Documents/PROJECTS/roost/apps/vision/gen/google/api/annotations.pb.h
    /Users/panic/Documents/PROJECTS/roost/apps/vision/gen/google/api/http.grpc.pb.cc
    /Users/panic/Documents/PROJECTS/roost/apps/vision/gen/google/api/http.grpc.pb.h
    /Users/panic/Documents/PROJECTS/roost/apps/vision/gen/google/api/http.pb.cc
    /Users/panic/Documents/PROJECTS/roost/apps/vision/gen/google/api/http.pb.h
)

if (APPLE)
    file(GLOB GRPC_AND_DEPS_LIBRARIES
        ./../../.lib_pack/grpc/lib/*.dylib
    )
elseif(CMAKE_SYSTEM_NAME STREQUAL "Linux")
    file(GLOB GRPC_AND_DEPS_LIBRARIES
        ./../../.lib_pack/grpc/lib/*.so
    )
endif()

target_include_directories(${PROJECT_NAME} PUBLIC
    ./
    ./gen/
    ./gen/v1/
    ./gen/v1/vision
    # /../../.lib_pack/grpc/include
    # /../../.lib_pack/grpc/include/google
    /Users/panic/Documents/PROJECTS/roost/.lib_pack/grpc/include
)

target_link_libraries(${PROJECT_NAME} PUBLIC
    config-cxx
    spdlog::spdlog_header_only
    ${GRPC_AND_DEPS_LIBRARIES}
)

# ${OPENCV_LIBRARIES}
# target_precompile_headers(config-cxx PUBLIC "<algorithm>")

# add_custom_command(TARGET ${PROJECT} POST_BUILD
#     COMMAND ${CMAKE_COMMAND} -E copy
#             "${CMAKE_CURRENT_SOURCE_DIR}/config.json"
#             "$<TARGET_FILE_DIR:${PROJECT}>/config/config.json"
#     COMMENT "Copying config.json to the executable directory"
# )