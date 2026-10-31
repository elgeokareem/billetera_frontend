import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { Schemas } from "../shared/api-types";
import { type BinanceCredentials, sessionQuery } from "../shared/session";

export interface CredentialsValues {
  apiKey: string;
  apiSecret: string;
}

/**
 * PUT /binance/credentials. Its answer has the same shape as GET, so it becomes the session data as it is.
 * The variables hold the secret, so the mutation is dropped from the cache as soon as it's no longer observed,
 * rather than kept for the default five minutes.
 */
export function useSaveCredentials() {
  const queryClient = useQueryClient();

  return useMutation({
    gcTime: 0,
    mutationFn: async ({ apiKey, apiSecret }: CredentialsValues) => {
      const { data } = await axios.put<
        Schemas["binance.CredentialsResponse"]
      >("/binance/credentials", {
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim(),
      });
      return data.credentials;
    },
    onSuccess: (credentials) => {
      queryClient.setQueryData(sessionQuery.queryKey, credentials);
    },
  });
}

/** DELETE /binance/credentials. A 404 means the key is already gone, which is the result we want anyway. */
export function useDeleteCredentials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        await axios.delete("/binance/credentials");
      } catch (error) {
        if (!(axios.isAxiosError(error) && error.response?.status === 404)) {
          throw error;
        }
      }
    },
    onSuccess: () => {
      const withoutKey: BinanceCredentials = { configured: false };
      queryClient.setQueryData(sessionQuery.queryKey, withoutKey);
    },
  });
}

/** Runs the balance sync and the movements sync side by side. It fails when either one fails, once both are done. */
export function useSyncBinanceData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const results = await Promise.allSettled([
        axios.post("/binance/sync"),
        axios.post("/binance/movements/sync"),
      ]);
      const failed = results.find((result) => result.status === "rejected");
      if (failed) {
        throw failed.reason;
      }
    },
    onSettled: () => {
      // Every view refetches what the syncs changed, even after a failure: one of the two may have saved its data. The
      // session isn't one of them.
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== sessionQuery.queryKey[0],
      });
    },
    onError: () => {
      // A failed sync can mean Binance refused the key, which the server then marks as rejected. Read the session
      // again so the rejected banner shows it without waiting for the cache to expire.
      queryClient.invalidateQueries({ queryKey: sessionQuery.queryKey });
    },
  });
}
