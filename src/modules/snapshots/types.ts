// The balance snapshots the API returns, derived from backend/docs/openapi/openapi.json. Money is a decimal string.

import type { Schemas } from "../shared/api-types";

export type WalletType = Schemas["binance.SnapshotAssetResponse"]["wallet_type"];

export type SnapshotAsset = Schemas["binance.SnapshotAssetResponse"];

/** The body of GET /snapshots/latest, and the snapshot in POST /binance/sync. */
export type Snapshot = Schemas["binance.SnapshotResponse"];

/** One point of GET /snapshots: the last snapshot in its bucket. */
export type SnapshotPoint = Schemas["snapshots.HistoryPoint"];

export type SnapshotBucket = Schemas["snapshots.HistoryResponse"]["bucket"];

/** GET /snapshots. Points is empty when no snapshot falls in the range. */
export type SnapshotHistory = Schemas["snapshots.HistoryResponse"];

/**
 * One point of GET /snapshots/assets/:asset: a coin's holding in the snapshot that the bucket keeps. Amounts are exact decimal
 * strings. A snapshot without the coin is a zero point, and it's priced.
 */
export type AssetHistoryPoint = Schemas["snapshots.AssetHistoryPoint"];

/** GET /snapshots/assets/:asset. asset is the symbol, upper-cased. Points is empty when no snapshot falls in the range. */
export type AssetHistory = Schemas["snapshots.AssetHistoryResponse"];
