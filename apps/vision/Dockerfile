# Build context must be the project root so .lib_pack/grpc is reachable.
# In compose.prod.yml: context: .  dockerfile: apps/vision/Dockerfile

# Stage 1: Build
FROM ubuntu:24.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    cmake g++ pkg-config \
    libgstreamer1.0-dev \
    libgstreamer-plugins-base1.0-dev \
    libsystemd-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY . .

# CMakeLists.txt looks for ../../.lib_pack/grpc relative to apps/vision/,
# which resolves correctly when we set the source dir to apps/vision.
WORKDIR /build/apps/vision
RUN cmake -B build -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build -j$(nproc)

# Stage 2: Runtime
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    libgstreamer1.0-0 \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy the binary
WORKDIR /app
COPY --from=builder /build/apps/vision/build/roost_vision .

# Copy the pre-built gRPC shared libraries
COPY --from=builder /build/.lib_pack/grpc/lib/*.so* /usr/local/lib/
RUN ldconfig

EXPOSE 50052
CMD ["./roost_vision", "--host", "0.0.0.0", "--port", "50052"]
