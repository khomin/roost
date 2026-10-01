import grpc from 'k6/net/grpc';
import { CONFIG } from './config.js';

export function getGrpcClient(proto = 'wallet/v1/wallet.proto') {
    const client = new grpc.Client();
    client.load(CONFIG.IMPORT_PATHS, proto);
    return client;
}

export function connectGrpcClient(client) {
    client.connect(CONFIG.GRPC_TARGET, {
        plaintext: CONFIG.GRPC_TLS !== 'true',
    });
    return client;
}