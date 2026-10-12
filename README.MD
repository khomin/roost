```mermaid
flowchart LR
    subgraph CPP["C++ Ingest Daemon"]
        Capture[Capture]
        Engine[Motion / Object Engine]
        SHM[(POSIX SHM)]
        GRPC[[gRPC Event Stream]]
        Capture -->|writes frame| SHM
        Engine -->|detects event| GRPC
        Capture --> Engine
    end

    subgraph GO["Go Orchestrator"]
        Read[Read SHM]
        Handle[Handle Event]
        S3[(S3 / WebRTC)]
        Alerts[/Alerts/]
        Read --> S3
        Handle --> S3
        Handle --> Alerts
    end

    SHM --> Read
    GRPC --> Handle
```
### Notes

```bash
git clone https://github.com/khomin/roost.git --recurse-submodules
cd ./roost

./scripts/build_grpc.sh

cd ./api
buf dep update
buf generate --include-imports
cd ../
```

```bash
sudo apt-get update
sudo apt-get install -y \
    libgstreamer1.0-dev \
    libgstreamer-plugins-base1.0-dev \
    libgstreamer-plugins-bad1.0-dev \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-libav \
    gstreamer1.0-tools

sudo apt-get install gstreamer1.0-plugins-good
sudo apt-get install gstreamer1.0-plugins-ugly
```

## Database migration notes

```bash
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

migrate -path $PWD/apps/gateway/internal/db/migrations \
-database "postgres://roost:super_secure_password@localhost:5432/roost?sslmode=disable" up
```