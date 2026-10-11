
import { API_CONFIG } from '../config/api';
import {requestJson, parseGatewayError, requestJsonWithBody} from './grpcGateway.ts'
import type { DescMessage, MessageShape } from '@bufbuild/protobuf';
import { fromJsonString, toJsonString, create } from '@bufbuild/protobuf';

import {
  ListWalletsResponseSchema,
  WalletUpdateSchema,
  WalletSchema,
  CreateWalletRequestSchema,
  CreateWalletResponseSchema,
  DeleteWalletResponseSchema,
  type ListWalletsResponse,
  type WalletUpdate,
  type CreateWalletRequest,
  type CreateWalletResponse,
  type DeleteWalletResponse,
} from '../gen/wallet/v1/wallet_pb';

export const walletService = {
  listWallets: () =>
    requestJson('GET', '/v1/wallets', ListWalletsResponseSchema),

  /**
   * Read the grpc-gateway server stream. Server-streaming responses are
   * newline-delimited JSON messages, just like the price stream above.
   */
  streamWallets: async function* (symbols: string[] = [], signal?: AbortSignal): AsyncGenerator<WalletUpdate> {
    const url = new URL('/v1/wallets/stream', API_CONFIG.baseUrl);
    for (const symbol of symbols) {
      url.searchParams.append('symbols', symbol.toLowerCase());
    }

    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = sessionStorage.getItem('kc_access_token');
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url.toString(), { headers, signal });
    if (!response.ok) {
      const text = await response.text();
      throw parseGatewayError(text, response.status);
    }
    if (!response.body) throw new Error('Wallet stream is not available');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffered = '';

    const consume = (line: string): WalletUpdate | undefined => {
      const trimmed = line.trim();
      if (!trimmed) return undefined;

      const update = fromJsonString(WalletUpdateSchema, trimmed, {
        ignoreUnknownFields: true,
      });
      if (update.wallet) return update;

      // Some stream handlers serialize the WalletUpdate payload directly
      // instead of wrapping it as { wallet: ... }. Normalize that shape too.
      try {
        const raw = JSON.parse(trimmed)
        if (raw.result != undefined) {
          const payload = raw.result.wallet ?? raw;
          const wallet = fromJsonString(WalletSchema, JSON.stringify(payload), {
            ignoreUnknownFields: true,
          });
          return create(WalletUpdateSchema, { wallet });
        }
      } catch {
        return update;
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      buffered += decoder.decode(value, { stream: !done });
      const lines = buffered.split(/\r?\n/);
      buffered = lines.pop() ?? '';
      for (const line of lines) {
        const update = consume(line);
        if (update) yield update;
      }
      if (done) {
        const update = consume(buffered);
        if (update) yield update;
        break;
      }
    }
  },

  createWallet: (req: MessageShape<typeof CreateWalletRequestSchema>) =>
    requestJsonWithBody(
      'POST',
      '/v1/wallets',
      CreateWalletRequestSchema,
      req,
      CreateWalletResponseSchema,
    ),

  deleteWallet: (id: string) =>
    requestJson(
      'DELETE',
      `/v1/wallets/${encodeURIComponent(id)}`,
      DeleteWalletResponseSchema,
    ),
};