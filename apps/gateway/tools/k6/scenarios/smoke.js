import { sleep } from 'k6';
import { listWalletsHttp, listWalletsGrpc } from '../scripts/grpc/list_wallets.js';
import { walletHttp, userHttp, priceHttp, alertHttp } from '../scripts/http_api.js';
import { walletGrpc, userGrpc, priceGrpc, alertGrpc } from '../scripts/grpc_api.js';

const walletData = JSON.parse(open('../../generate_wallets/data.json'));
const token = __ENV.AUTH_TOKEN || null;
let walletsCreated = false;

export const options = {
    vus: 1,
    duration: '30s',
    thresholds: {
        http_req_duration: ['p(95)<200'], // 95% of requests must complete below 200ms
        grpc_req_duration: ['p(95)<100'],
    },
};

export default function () {
    listWalletsHttp(token);
    listWalletsGrpc(token);

    if (!walletsCreated && __ENV.CREATE_WALLETS !== 'false') {
        walletData.tokens.forEach((wallet) => walletHttp.create({
            address: wallet.addr,
            chain: wallet.chains,
            tokenSymbol: wallet.symbol,
            label: wallet.label || 'k6 smoke wallet',
        }, token));
        walletsCreated = true;
    }

    const wallets = walletHttp.list(token).json().wallet || [];
    const wallet = wallets[0];
    const symbol = __ENV.SYMBOL || 'BTC';

    if (wallet && wallet.id) {
        walletHttp.get(wallet.id, token);
        walletHttp.balances(wallet.id, 1, 30, token);
        walletHttp.update(wallet.id, { id: wallet.id, label: 'k6 smoke wallet', notify: false }, token);
        walletGrpc.get(wallet.id, token);
        walletGrpc.balances({ id: wallet.id, period: 1, limit: 30 }, token);
        walletGrpc.update({ id: wallet.id, label: 'k6 smoke wallet', notify: false }, token);
    }

    userHttp.current(token);
    userGrpc.current(token);
    priceHttp.coins(token);
    priceHttp.coin(symbol, token);
    priceHttp.search(symbol, token);
    priceHttp.prices([symbol], token);
    priceHttp.price(symbol, token);
    priceGrpc.coins(token);
    priceGrpc.coin(symbol, token);
    priceGrpc.search(symbol, token);
    priceGrpc.prices([symbol], token);
    priceGrpc.price(symbol, token);
    alertHttp.list(token);
    alertGrpc.list(token);

    if (__ENV.RUN_MUTATIONS === 'true') {
        const alert = { coinId: symbol, condition: 1, price: Number(__ENV.ALERT_PRICE || 1) };
        alertHttp.create(alert, token);
        alertGrpc.create(alert, token);
        if (__ENV.ALERT_ID) {
            alertHttp.update(__ENV.ALERT_ID, { id: __ENV.ALERT_ID, condition: 1, price: alert.price }, token);
            alertGrpc.update({ id: __ENV.ALERT_ID, condition: 1, price: alert.price }, token);
            alertHttp.pause(__ENV.ALERT_ID, token);
            alertGrpc.pause(__ENV.ALERT_ID, token);
            alertHttp.resume(__ENV.ALERT_ID, token);
            alertGrpc.resume(__ENV.ALERT_ID, token);
        }
    }
    sleep(1);
}