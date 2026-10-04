#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SOURCE_DIR="$PWD/apps/vision/external/grpc"
BUILD_DIR="$PROJECT_ROOT/.lib_pack/grpc_build"
INSTALL_DIR="$PROJECT_ROOT/.lib_pack/grpc"
ARCH=${1:-x86}

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

CMAKE_FLAGS=(
    "-DCMAKE_INSTALL_PREFIX=$INSTALL_DIR"
    "-DCMAKE_BUILD_TYPE=Release"
    "-DgRPC_INSTALL=ON"
    "-DgRPC_BUILD_TESTS=OFF"
    "-DgRPC_ABSL_PROVIDER=module"
    "-DgRPC_CARES_PROVIDER=module"
    "-DgRPC_PROTOBUF_PROVIDER=module"
    "-DgRPC_SSL_PROVIDER=module"
    "-DgRPC_RE2_PROVIDER=module"
    "-DgRPC_ZLIB_PROVIDER=module"
    "-DCMAKE_CXX_STANDARD=17"
    "-DBUILD_SHARED_LIBS=ON"
)

cmake "${CMAKE_FLAGS[@]}" "$SOURCE_DIR"

make -j4
make install