import { useQuery } from "@tanstack/react-query";
import {
  fetchAssetHistory,
  fetchLatestSnapshot,
  fetchSnapshotHistory,
  type SnapshotHistoryQuery,
} from "./api";

export const snapshotKeys = {
  latest: ["snapshots", "latest"] as const,
  history: (query: SnapshotHistoryQuery) =>
    ["snapshots", "history", query] as const,
  asset: (asset: string, query: SnapshotHistoryQuery) =>
    ["snapshots", "asset", asset, query] as const,
};

/** The newest snapshot, or null when the user has none yet. */
export function useLatestSnapshot() {
  return useQuery({
    queryKey: snapshotKeys.latest,
    queryFn: fetchLatestSnapshot,
  });
}

export function useSnapshotHistory(query: SnapshotHistoryQuery) {
  return useQuery({
    queryKey: snapshotKeys.history(query),
    queryFn: () => fetchSnapshotHistory(query),
  });
}

/**
 * One coin's holding over time. Pass enabled as false while the query shouldn't run yet, such as before the latest snapshot
 * says whether the coin is held.
 */
export function useAssetHistory(
  asset: string,
  query: SnapshotHistoryQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: snapshotKeys.asset(asset, query),
    queryFn: () => fetchAssetHistory(asset, query),
    enabled,
  });
}
