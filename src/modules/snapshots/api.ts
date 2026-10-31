import axios from "axios";
import type { Operations, Schemas } from "../shared/api-types";
import type { AssetHistory, Snapshot, SnapshotHistory } from "./types";

export type SnapshotHistoryQuery = NonNullable<
  Operations["snapshots.history"]["parameters"]["query"]
>;

/**
 * GET /snapshots/latest. A user with no snapshot yet gets a 404, which isn't an error here: it's null, and the page asks
 * the user to sync.
 */
export async function fetchLatestSnapshot(): Promise<Snapshot | null> {
  try {
    const { data } = await axios.get<
      Schemas["snapshots.SnapshotEnvelope"]
    >("/snapshots/latest");
    return data.snapshot;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function fetchSnapshotHistory(query: SnapshotHistoryQuery) {
  const { data } = await axios.get<SnapshotHistory>("/snapshots", {
    params: query,
  });
  return data;
}

/**
 * GET /snapshots/assets/:asset. The code is encoded as one path segment, so it can't change the path. The API answers
 * 400 invalid asset to a code that isn't a symbol, so the caller checks the code before it asks.
 */
export async function fetchAssetHistory(
  asset: string,
  query: SnapshotHistoryQuery,
) {
  const { data } = await axios.get<AssetHistory>(
    `/snapshots/assets/${encodeURIComponent(asset)}`,
    { params: query },
  );
  return data;
}
