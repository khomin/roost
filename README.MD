+-------------------------------------------------------+
|                  C++ Ingest Daemon                    |
|                                                       |
|  [Capture] ---> [Motion / Object Engine]               |
|     |                    |                            |
|     | (writes frame)     | (detects event)            |
|     v                    v                            |
|  POSIX SHM          gRPC Event Stream                 |
+-----|--------------------|----------------------------+
    |                    |
    v                    v
+-------------------------------------------------------+
|                  Go Orchestrator                      |
|                                                       |
|  [Read SHM]        [Handle Event]                     |
|  (S3 / WebRTC)     (Trigger S3 recording / Alerts)    |
+-------------------------------------------------------+


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