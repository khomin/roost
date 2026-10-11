import { fromJsonString, toJsonString, create } from '@bufbuild/protobuf';
import type { DescMessage, MessageShape } from '@bufbuild/protobuf';
import { API_CONFIG } from '../config/api';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export class GatewayError extends Error {
  readonly grpcCode: number;
  readonly status: number;

  constructor(message: string, status: number, grpcCode: number) {
    super(message);
    this.name = 'GatewayError';
    this.status = status;
    this.grpcCode = grpcCode;
  }
}

// ─── Transport helpers ─────────────────────────────────────────────────────

export async function requestJson<Res extends DescMessage>(
  method: HttpMethod,
  path: string,
  resSchema: Res,
  query?: URLSearchParams,
): Promise<MessageShape<Res>> {
  return doFetch(method, path, resSchema, undefined, undefined, query);
}

export async function requestJsonWithBody<Req extends DescMessage, Res extends DescMessage>(
  method: HttpMethod,
  path: string,
  reqSchema: Req,
  req: MessageShape<Req>,
  resSchema: Res,
): Promise<MessageShape<Res>> {
  return doFetch(method, path, resSchema, reqSchema, req, undefined);
}

async function doFetch<Req extends DescMessage, Res extends DescMessage>(
  method: HttpMethod,
  path: string,
  resSchema: Res,
  reqSchema?: Req,
  req?: MessageShape<Req>,
  query?: URLSearchParams,
): Promise<MessageShape<Res>> {
  const url = new URL(path, API_CONFIG.baseUrl);
  if (query) url.search = query.toString();

  const headers: Record<string, string> = {};
  const token = sessionStorage.getItem('kc_access_token');
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: string | undefined;
  if (reqSchema && req) {
    headers['Content-Type'] = 'application/json';
    // grpc-gateway is configured with UseProtoNames, so emit snake_case fields
    body = toJsonString(reqSchema, req, { useProtoFieldName: true });
  }

  const response = await fetch(url.toString(), { method, headers, body });

  // Token expired/invalid – mirror the old axios interceptor behaviour
  if (response.status === 401) {
    sessionStorage.clear();
    window.location.href = '/';
    throw new GatewayError('Unauthorized', 401, 16);
  }

  const text = await response.text();

  if (!response.ok) {
    throw parseGatewayError(text, response.status);
  }

  if (!text) {
    return create(resSchema);
  }

  return fromJsonString(resSchema, text, { ignoreUnknownFields: true });
}

export function parseGatewayError(text: string, status: number): GatewayError {
  let message = `Request failed with status ${status}`;
  let grpcCode = 13; // INTERNAL
  try {
    const parsed = JSON.parse(text) as { message?: string; code?: number };
    if (parsed.message) message = parsed.message;
    if (typeof parsed.code === 'number') grpcCode = parsed.code;
  } catch {
    // Non-JSON error body – keep the generic message
  }
  return new GatewayError(message, status, grpcCode);
}