import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { create } from '@bufbuild/protobuf';
import type { MessageInitShape } from '@bufbuild/protobuf';
// import { walletService, priceService, alertService } from '../services/grpcGateway';
// import { CreateWalletRequestSchema } from '../gen/wallet/v1/wallet_pb';
// import {
//   CreateAlertRequestSchema,
//   UpdateAlertRequestSchema,
// } from '../gen/alert/v1/alert_pb';
// import { GetPricesResponseSchema } from '../gen/price/v1/price_pb';
import type {
  ListWalletsResponse,
  CreateWalletResponse,
  DeleteWalletResponse,
  ListCoinsResponse,
  // GetPricesResponse,
  // ListAlertsResponse,
  // Alert,
  // DeleteAlertResponse,
} from '../services/grpcGateway';

// ─── Query key factory ─────────────────────────────────────────────────────
export const queryKeys = {
  wallets: ['wallets'] as const,
  coins: ['coins'] as const,
  alerts: ['alerts'] as const,
  prices: (symbols: string[]) => ['prices', ...symbols] as const,
};

// ─── Wallets ───────────────────────────────────────────────────────────────

/** Fetch all wallets, then keep the same cache current with wallet events. */
export function useWallets() {
  const queryClient = useQueryClient();
  const query = useQuery<ListWalletsResponse>({
    queryKey: queryKeys.wallets,
    queryFn: () => walletService.listWallets(),
  });

  useEffect(() => {
    // Let the initial list establish the source of truth before applying
    // streamed updates. An empty symbols list means all wallets for the user.
    if (!query.isSuccess) return;

    const controller = new AbortController();
    let mounted = true;

    const run = async () => {
      while (mounted) {
        try {
          for await (const update of walletService.streamWallets([], controller.signal)) {
            if (!mounted) return;
            const streamedWallet = update.wallet;
            if (!streamedWallet) continue;

            queryClient.setQueryData<ListWalletsResponse>(
              queryKeys.wallets,
              (current) => {
                if (!current) return current;

                const index = current.wallet.findIndex((item) => item.id === streamedWallet.id);
                const wallets = [...current.wallet];
                if (index >= 0) {
                  wallets[index] = streamedWallet;
                } else {
                  wallets.push(streamedWallet);
                }

                return { ...current, total: wallets.length, wallet: wallets };
              },
            );
          }
        } catch {
          if (controller.signal.aborted || !mounted) return;
        }

        // Reconnect when the server closes the stream or a transient error occurs.
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    };

    void run();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [query.isSuccess, queryClient]);

  return query;
}

/** Create a new wallet */
export function useCreateWallet() {
  const qc = useQueryClient();
  return useMutation<
    CreateWalletResponse,
    Error,
    MessageInitShape<typeof CreateWalletRequestSchema>
  >({
    mutationFn: async (req) => {
      const message = create(CreateWalletRequestSchema, req);
      return walletService.createWallet(message);
    },
    onError(error) {
      return error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wallets });
    },
  });
}

/** Delete a wallet */
export function useDeleteWallet() {
  const qc = useQueryClient();
  return useMutation<DeleteWalletResponse, Error, string>({
    mutationFn: (id) => walletService.deleteWallet(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wallets });
    },
  });
}

// ─── Coins ─────────────────────────────────────────────────────────────────

/** Fetch the list of all supported coins */
export function useCoins() {
  return useQuery<ListCoinsResponse>({
    queryKey: queryKeys.coins,
    queryFn: () => priceService.listCoins(),
    // Coin list rarely changes – keep it fresh enough but not aggressively
    staleTime: 5 * 60 * 1000,
  });
}