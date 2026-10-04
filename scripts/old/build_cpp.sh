#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

BUILD_DIR="$PROJECT_ROOT/cpp/build"

export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$PROJECT_ROOT/.lib_pack/grpc/lib/
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$PROJECT_ROOT/.lib_pack/opencv/lib/

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

cmake ../ \
    -DCMAKE_TOOLCHAIN_FILE=$PROJECT_ROOT/scripts/toolchain-arm64.cmake

make -j$(nproc)

# make install
