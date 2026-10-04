#!/bin/bash

ROOT_PATH=$PWD

SCRIPT_PATH=$(dirname $(readlink -f $0))
cd $SCRIPT_PATH

export PATH=$PATH:$ROOT_PATH/.lib_pack/grpc/bin/
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$ROOT_PATH/.lib_pack/grpc/lib/

export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin

echo "Using protobuf compiler: $(which protoc)"

mkdir -p ../go_service/grpc/generated
set -x

protoc \
    --go_out=$ROOT_PATH/go_service/grpc/generated  \
    --go-grpc_out=$ROOT_PATH/go_service/grpc/generated \
    --proto_path=$ROOT_PATH/protobuf \
    tracker.proto