#!/bin/bash
set -e

# 1. Paths & Setup
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SOURCE_DIR="$PROJECT_ROOT/.lib_pack/grpc_src"
BUILD_DIR="$PROJECT_ROOT/.lib_pack/grpc_build"
INSTALL_DIR="$PROJECT_ROOT/.lib_pack/grpc"
ARCH=${1:-x86}

# 2. Clone with submodules (Specific version requested)
if [ ! -d "$SOURCE_DIR" ]; then
    echo "--- Cloning gRPC v1.66.0 ---"
    git clone --recurse-submodules -b v1.66.0 --depth 1 --shallow-submodules https://github.com/grpc/grpc "$SOURCE_DIR" || exit 1
fi

# 3. Clean and Setup Build Directory
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

# 4. Configure Flags
# gRPC uses 'absl', 'protobuf', and 're2'. We tell it to build them bundled.
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

if [ "$ARCH" == "arm64" ]; then
    echo "--- Building gRPC for ARM64 ---"
    # We MUST tell gRPC where the x86 protoc is. 
    # If you have it installed on your PC: 'which protoc'
    # Otherwise, you have to build host-tools first.
    CMAKE_FLAGS+=(
        "-DCMAKE_TOOLCHAIN_FILE=$SCRIPT_DIR/toolchain-arm64.cmake"
        "-DgRPC_BUILD_CODEGEN=OFF" # Don't try to run ARM plugins on x86
    )
else
    echo "--- Building gRPC for x86 ---"
fi

# 5. Run CMake
cmake "${CMAKE_FLAGS[@]}" "$SOURCE_DIR"

# 6. Build and Install
make -j$(nproc)
make install

# #!/bin/bash

# set -e

# SRC_DIR="grpc"
# REPO_URL="https://github.com/grpc/grpc"
# LIB_PACK=".lib_pack"
# INSTALL_DIR="$PWD/$LIB_PACK/build_grpc"
# TEMP_BUILD_DIR="build_grpc"
# ROOT_PATH=$PWD

# if [ ! -d $LIB_PACK ]; then
#     echo "--- making $LIB_PACK_NAME"
#     mkdir $LIB_PACK
# fi

# cd $LIB_PACK

# if [ -d $SRC_DIR ]; then
#     echo "--- $REPO_DIR already cloned. Skipping clone. ---"
# else
#     echo "--- Cloning $REPO_DIR ---"
#     git clone --recurse-submodules -b v1.76.0 --depth 1 --shallow-submodules $REPO_URL || exit 1
# fi

# cd $SRC_DIR

# if [ ! -d $TEMP_BUILD_DIR ]; then
#     echo "--- making $TEMP_BUILD_DIR $PWD"
#     mkdir $TEMP_BUILD_DIR
# fi
# cd $TEMP_BUILD_DIR

# # x86
# # cmake ../ \
# #     -DgRPC_INSTALL=ON \
# #     -DCMAKE_BUILD_TYPE=RELEASE \
# #     -DgRPC_BUILD_TESTS=OFF \
# #     -DCMAKE_CXX_STANDARD=17 \
# #     -DABSL_ROOT_DIR=$INSTALL_DIR/x86 \
# #     -DBUILD_SHARED_LIBS=ON \
# #     -DCMAKE_INSTALL_PREFIX=$INSTALL_DIR/x86 || exit 1
# # make -j16
# # cmake --install . --prefix $INSTALL_DIR/x86

# # arm
# cmake ../ \
#     -DCMAKE_TOOLCHAIN_FILE=$ROOT_PATH/toolchain-arm64.cmake \
#     -DCMAKE_BUILD_TYPE=RELEASE \
#     -DCMAKE_POSITION_INDEPENDENT_CODE=ON \
#     -DgRPC_INSTALL=ON \
#     -DgRPC_BUILD_TESTS=OFF \
#     -DCMAKE_CXX_STANDARD=17 \
#     -DABSL_ROOT_DIR=$INSTALL_DIR/am \
#     -DBUILD_SHARED_LIBS=ON \
#     -DCMAKE_INSTALL_PREFIX=$INSTALL_DIR/arn || exit 1
# make -j16
# cmake --install . --prefix $INSTALL_DIR/arm