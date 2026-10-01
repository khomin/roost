#!/bin/bash

ROOT_PATH=$PWD

SCRIPT_PATH=$(dirname $(readlink -f $0))

cd $SCRIPT_PATH

export PATH=$PATH:$ROOT_PATH/.lib_pack/grpc/bin/
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$ROOT_PATH/.lib_pack/grpc/lib/

echo "Using protobuf compiler: $(which protoc)"

mkdir -p ../cpp/protobuf/generated
set -x

protoc -I=../protobuf \
--cpp_out=../cpp/protobuf/generated \
--grpc_out=../cpp/protobuf/generated \
--plugin=protoc-gen-grpc=$(which grpc_cpp_plugin) \
--proto_path=../protobuf \
tracker.proto