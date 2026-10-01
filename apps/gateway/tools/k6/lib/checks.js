import { check } from 'k6';
import { StatusOK } from 'k6/net/grpc';

// Keep transport checks generic: not every proto response contains a wallets field.
export function checkHttpResponse(res, expectedStatus = 200, validator = null) {
    const checks = {
        [`HTTP status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
        'HTTP response has body': (r) => r.body !== undefined,
    };
    if (validator) checks['HTTP response matches schema'] = validator;
    return check(res, checks);
}

export function checkGrpcResponse(res, expectedStatus = StatusOK, validator = null) {
    const checks = {
        'gRPC status is OK': (r) => r.status === expectedStatus,
        'gRPC response has message': (r) => r.message !== null && r.message !== undefined,
    };
    if (validator) checks['gRPC response matches schema'] = validator;
    return check(res, checks);
}