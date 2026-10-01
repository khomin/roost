import { checkGrpcResponse } from '../lib/checks.js';
import { connectGrpcClient, getGrpcClient } from '../lib/clients.js';

function service(proto) {
    const client = getGrpcClient(proto);
    let connected = false;
    return {
        call(method, message = {}, token = null) {
            if (!connected) {
                connectGrpcClient(client);
                connected = true;
            }
            const params = token ? { metadata: { authorization: `Bearer ${token}` } } : {};
            const response = client.invoke(method, message, params);
            checkGrpcResponse(response);
            return response;
        },
        close() {
            if (connected) client.close();
        },
    };
}

const wallets = service('wallet/v1/wallet.proto');
const prices = service('price/v1/price.proto');
const users = service('user/v1/user.proto');
const alerts = service('alert/v1/alert.proto');

export const walletGrpc = {
    list: (token) => wallets.call('wallet.v1.WalletService/ListWallets', {}, token),
    get: (id, token) => wallets.call('wallet.v1.WalletService/GetWallet', { id }, token),
    create: (request, token) => wallets.call('wallet.v1.WalletService/CreateWallet', request, token),
    update: (request, token) => wallets.call('wallet.v1.WalletService/UpdateWallet', request, token),
    remove: (id, token) => wallets.call('wallet.v1.WalletService/DeleteWallet', { id }, token),
    balances: (request, token) => wallets.call('wallet.v1.WalletService/ListWalletBalances', request, token),
};

export const userGrpc = {
    current: (token) => users.call('user.v1.UserService/GetUser', {}, token),
};

export const priceGrpc = {
    coins: (token) => prices.call('price.v1.PriceService/ListCoins', {}, token),
    coin: (id, token) => prices.call('price.v1.PriceService/GetCoin', { id }, token),
    search: (text, token) => prices.call('price.v1.PriceService/SearchCoin', { text }, token),
    prices: (symbols, token) => prices.call('price.v1.PriceService/GetPrices', { symbols }, token),
    price: (symbol, token) => prices.call('price.v1.PriceService/GetPrice', { symbol }, token),
};

export const alertGrpc = {
    list: (token) => alerts.call('alert.v1.AlertService/ListAlerts', {}, token),
    create: (request, token) => alerts.call('alert.v1.AlertService/CreateAlert', request, token),
    update: (request, token) => alerts.call('alert.v1.AlertService/UpdateAlert', request, token),
    pause: (id, token) => alerts.call('alert.v1.AlertService/PauseAlert', { id }, token),
    resume: (id, token) => alerts.call('alert.v1.AlertService/ResumeAlert', { id }, token),
    remove: (id, token) => alerts.call('alert.v1.AlertService/DeleteAlert', { id }, token),
};

export function closeGrpcServices() {
    wallets.close();
    prices.close();
    users.close();
    alerts.close();
}
