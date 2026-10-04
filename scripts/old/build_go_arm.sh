#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Point to the cross-compiler
export CC="aarch64-linux-gnu-gcc"
export CXX="aarch64-linux-gnu-g++"

# Tell Go to use the ARM toolchain
export CGO_ENABLED=1
export GOOS=linux
export GOARCH=arm64

# If you have custom headers in your .lib_pack
export CGO_CFLAGS="-I$PROJECT_ROOT/.lib_pack/grpc/include -I$PROJECT_ROOT/.lib_pack/opencv/include"
export CGO_LDFLAGS="-L$PROJECT_ROOT/.lib_pack/grpc/lib -L$PROJECT_ROOT/.lib_pack/opencv/lib"

export PATH=$PATH:/usr/local/go/bin

go build -o service main.go