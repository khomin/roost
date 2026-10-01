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

buf dep update
buf generate