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
