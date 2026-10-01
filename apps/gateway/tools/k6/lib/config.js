export const CONFIG = {
    HTTP_BASE_URL: __ENV.HTTP_BASE_URL || 'http://localhost:8080',
    GRPC_TARGET: __ENV.GRPC_TARGET || 'localhost:50051',
    AUTH_URL: __ENV.AUTH_URL || 'http://localhost:8080/v1/auth/token',

    // NOTE: you may use "buf export . --output ./backend/tools/k6/proto"
    // to copy annotations.proto to local fodler

    IMPORT_PATHS: [
        '../../../../proto',
    ],
};

