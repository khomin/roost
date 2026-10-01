import http from 'k6/http';
import { CONFIG } from '../../lib/config.js';
import { checkGrpcResponse, checkHttpResponse } from '../../lib/checks.js';
import { connectGrpcClient, getGrpcClient } from '../../lib/clients.js';

const client = getGrpcClient();
let isConnected = false;

export function listWalletsHttp(token = null) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = http.get(`${CONFIG.HTTP_BASE_URL}/v1/wallets`, { headers, tags: { endpoint: 'ListWallets' } });
    checkHttpResponse(res, 200, (r) => {
        try {
            const body = r.json();
            return Number.isInteger(body.total) && Array.isArray(body.wallet);
        } catch (_) {
            return false;
        }
    });
    return res;
}

export function listWalletsGrpc(token = null) {
    if (!isConnected) {
        connectGrpcClient(client)
        isConnected = true;
    }
    const params = token ? { metadata: { authorization: `Bearer ${token}` } } : {};
    const res = client.invoke('wallet.v1.WalletService/ListWallets', {}, params);

    checkGrpcResponse(res);
    return res;
}

export function closeGrpcClient() {
    client.close();
}