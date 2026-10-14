# Roost

A self-hosted camera server for RTSP/USB cameras.

- **apps/vision (C++)** — captures video via GStreamer, encodes, pushes frames into IPC (`/dev/shm/roost_<camera-id>`)
- **apps/gateway (Go)** — reads frames from shm, manages cameras, forwards to WebRTC
- **apps/web (React)** — live grid, per-camera status, WebRTC playback

![Live dashboard](docs/screenshots/live-dashboard.png)

## Status

Roost is a work in progress. This is what exists today:

| Works | Not there yet |
|---|---|
| USB (V4L2) and RTSP cameras | Object detection (the pipeline has a branch for it, nothing consumes it) |
| Live view in the browser over WebRTC, several viewers per camera | Recording and playback |
| Add, pause, resume and delete cameras from the dashboard | Snapshots and live events |
| Per-camera mode: always on, or on demand | |
| Cameras that die are detected and retried automatically | |
| Login through Keycloak | |

Development and testing so far has been on Linux (Ubuntu) only.

```mermaid
flowchart LR
    Cam[USB / RTSP cameras]

    subgraph Vision["vision (C++)"]
        Gst[GStreamer pipeline]
    end

    subgraph Gateway["gateway (Go)"]
        Loop[Camera control loop]
        Pump[Frame pump]
        Hub[WebRTC hub]
        API[REST / gRPC API]
    end

    DB[(Postgres)]
    Web[web dashboard]

    Cam --> Gst
    Loop -->|gRPC: start / stop stream| Gst
    Gst -->|H.264 frames, POSIX shared memory| Pump
    Pump --> Hub
    Hub -->|WebRTC video| Web
    Web -->|REST| API
    API --> DB
    Loop --> DB
```

Vision and gateway exchange frames through shared memory, so **they must run on the same machine**.

### Camera modes

- **Always on**: the pipeline runs around the clock.
- **On demand**: the pipeline starts when the first viewer opens the camera and stops 15 seconds after the last one leaves.

A camera can also be **paused**, which keeps it stopped whatever its mode.

## Repository layout

```
api/            Protobuf definitions and buf config (source of all generated code)
apps/gateway/   Go gateway, DB migrations, compose files, Keycloak realm
apps/vision/    C++ vision service
apps/web/       React dashboard
scripts/        Build helpers (gRPC for the C++ side)
```

## Getting started

### 1. Prerequisites

- Go 1.26+
- Node.js 20+
- CMake 3.22+ and a C++20 compiler
- Docker with Compose
- [buf](https://buf.build/docs/installation)
- GStreamer development packages and plugins:

```bash
sudo apt-get update
sudo apt-get install -y \
    libgstreamer1.0-dev \
    libgstreamer-plugins-base1.0-dev \
    libgstreamer-plugins-bad1.0-dev \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav \
    gstreamer1.0-tools
```

### 2. Clone with submodules

gRPC and spdlog are vendored as submodules, so the clone needs `--recurse-submodules`:

```bash
git clone https://github.com/khomin/roost.git --recurse-submodules
cd roost
```

### 3. Build gRPC for the C++ service

The vision service links against a local gRPC build in `.lib_pack/`, which is not in the repository. Build it once, **from the repository root**, before building vision:

```bash
./scripts/build_grpc.sh
```

This compiles gRPC and its dependencies from source into `.lib_pack/grpc` and takes a while.

### 4. Generate code from the protobuf files

The generated Go, TypeScript and C++ code is not committed. Generate it after cloning and again after any change under `api/`:

```bash
cd api
buf dep update
buf generate --include-imports
cd ..
```

### 5. Start the infrastructure

The dev compose file starts Postgres, Keycloak, Redis, RabbitMQ, Prometheus and Grafana:

```bash
cd apps/gateway
cp .env.dev.example .env    # then fill in the values
docker compose -f compose.dev.yml up -d
```

Keycloak comes up on http://localhost:8081 with the `roost` realm imported. Create a user there to log in to the dashboard.

### Production deploy (Docker Compose)

`compose.prod.yml` at the repo root builds and runs all three services plus infrastructure in Docker. It is meant for a single-machine deploy (e.g. an Intel NUC on your LAN) and does **not** need Kubernetes.

#### Prerequisites

- Docker with Compose
- Git submodules initialised (`git submodule update --init`)
- `.lib_pack/grpc` built (step 3 above)

#### Build and run

```bash
cp apps/gateway/.env.example apps/gateway/.env
# Edit .env — set real passwords and:
#   KEYCLOAK_HOST  = machine's LAN IP (e.g. 192.168.31.100)
#   NUC_HOST       = same IP (baked into the web bundle for API/auth URLs)

docker compose -f compose.prod.yml --env-file apps/gateway/.env up -d --build
```

The web dashboard will be at `http://<NUC_HOST>`, the gateway API at `:8080` and Keycloak at `:8081`.

#### How it works

- **gateway** runs with `network_mode: host` so it can reach all services via `localhost`, matching the dev setup. It also needs host IPC to read shared memory from vision.
- **vision** runs with `ipc: host` so its POSIX shared memory (`/dev/shm/roost_*`) is visible to the gateway. USB cameras are accessible via `device_cgroup_rules` — cameras can be plugged and unplugged at runtime.
- **web** is a static Vite build served by nginx. `VITE_API_URL` and `VITE_KEYCLOAK_URL` are baked at image build time from `NUC_HOST`.

#### Sending to another machine

```bash
rsync -avz --exclude node_modules --exclude apps/vision/build --exclude .git \
  ~/Documents/PROJECTS/roost/ user@host:~/roost/
```

Then SSH in and run the build commands above.

### 6. Run the vision service

```bash
cd apps/vision
cmake -S . -B build
cmake --build build
./build/roost_vision --port 50052
```

### 7. Run the gateway

Run it from `apps/gateway`, because it loads `.env`, `config.yaml` and the migrations relative to that directory:

```bash
cd apps/gateway
go run .
```

The gateway applies database migrations on startup. The REST API listens on port 8080 and gRPC on 50051.

### 8. Run the dashboard

```bash
cd apps/web
npm install
npm run dev
```

Open http://localhost:5173, log in, and add a camera on the **Cameras** page:

| Type | Source example |
|---|---|
| USB | `/dev/video0` |
| RTSP | `rtsp://user:pass@192.168.1.10:554/stream` |

## Development notes

### Running migrations by hand

The gateway migrates on startup, so this is only needed to roll back or inspect:

```bash
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

migrate -path $PWD/apps/gateway/internal/db/migrations \
    -database "postgres://USER:PASSWORD@localhost:5432/DBNAME?sslmode=disable" up
```

### WebRTC test page

`apps/gateway/tools/index.html` is a single-file viewer for one camera. It is useful for checking the stream without the dashboard; set the camera ID in the file.

### Ports

| Service | Port |
|---|---|
| Dashboard (Vite dev server) | 5173 |
| Gateway REST | 8080 |
| Gateway gRPC | 50051 |
| Vision gRPC | 50052 |
| Keycloak | 8081 |
| Postgres | 5432 |
| Grafana | 3000 |
| Prometheus | 9091 |
| Redis | 6379 |
