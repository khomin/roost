import http from 'k6/http';
import { CONFIG } from '../lib/config.js';
import { checkHttpResponse } from '../lib/checks.js';

function request(method, path, token, body = undefined, expectedStatus = 200) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const params = { headers, tags: { endpoint: path } };
    const response = body === undefined
        ? http.request(method, `${CONFIG.HTTP_BASE_URL}${path}`, null, params)
        : http.request(method, `${CONFIG.HTTP_BASE_URL}${path}`, JSON.stringify(body), params);
    checkHttpResponse(response, expectedStatus);
    return response;
}

const id = (value) => encodeURIComponent(value);

export const walletHttp = {
    list: (token) => request('GET', '/v1/wallets', token),
    get: (walletId, token) => request('GET', `/v1/wallets/${id(walletId)}`, token),
    create: (wallet, token) => request('POST', '/v1/wallets', token, wallet),
    update: (walletId, update, token) => request('PATCH', `/v1/wallets/${id(walletId)}`, token, update),
    remove: (walletId, token) => request('DELETE', `/v1/wallets/${id(walletId)}`, token),
    balances: (walletId, period = 7, limit = 30, token) =>
        request('GET', `/v1/wallets/${id(walletId)}/balances?period=${period}&limit=${limit}`, token),
    stream: (symbols = [], token) => request('GET', `/v1/wallets/stream?symbols=${symbols.map(id).join('&symbols=')}`, token),
};

export const userHttp = {
    current: (token) => request('GET', '/v1/user', token),
};

export const priceHttp = {
    coins: (token) => request('GET', '/v1/coins', token),
    coin: (coinId, token) => request('GET', `/v1/coins/${id(coinId)}`, token),
    search: (text, token) => request('POST', '/v1/coins/search', token, { text }),
    prices: (symbols = [], token) => request('GET', `/v1/prices?symbols=${symbols.map(id).join('&symbols=')}`, token),
    price: (symbol, token) => request('GET', `/v1/prices/${id(symbol)}`, token),
    stream: (symbols = [], token) => request('GET', `/v1/prices/stream?symbols=${symbols.map(id).join('&symbols=')}`, token),
};

export const alertHttp = {
    list: (token) => request('GET', '/v1/alerts', token),
    create: (alert, token) => request('POST', '/v1/alerts', token, alert),
    update: (alertId, update, token) => request('PATCH', `/v1/alerts/${id(alertId)}`, token, update),
    pause: (alertId, token) => request('POST', `/v1/alerts/${id(alertId)}:pause`, token, {}),
    resume: (alertId, token) => request('POST', `/v1/alerts/${id(alertId)}:resume`, token, {}),
    remove: (alertId, token) => request('DELETE', `/v1/alerts/${id(alertId)}`, token),
};
