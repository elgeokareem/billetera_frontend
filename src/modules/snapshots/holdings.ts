import { compare, sum, sumKnown } from "../shared/money";
import type { SnapshotAsset } from "./types";

export interface Holding {
  asset: string;
  /** Free, locked and frozen, summed over every wallet. */
  amount: string;
  /** The USD value of the priced rows, or null when none of them is priced. */
  usd: string | null;
  /** True when every row of the coin is priced. */
  priced: boolean;
}

/**
 * Merges a snapshot's rows into one row per coin, across the spot and funding wallets. Amounts and USD values add up with
 * full precision. The result is sorted by USD value, largest first, with unpriced coins last and then by coin.
 */
export function mergeHoldings(assets: readonly SnapshotAsset[]): Holding[] {
  const byAsset = new Map<string, SnapshotAsset[]>();
  for (const row of assets) {
    byAsset.set(row.asset, [...(byAsset.get(row.asset) ?? []), row]);
  }

  const holdings = [...byAsset].map(([asset, rows]) => ({
    asset,
    amount: sum(
      rows.map((row) => sum([row.free, row.locked, row.freeze])),
    ),
    usd: sumKnown(rows.map((row) => row.usd_value)),
    priced: rows.every((row) => row.priced),
  }));

  holdings.sort((a, b) => {
    if (a.usd === null || b.usd === null) {
      if (a.usd === null && b.usd === null) {
        return a.asset.localeCompare(b.asset);
      }
      return a.usd === null ? 1 : -1;
    }
    return compare(b.usd, a.usd) || a.asset.localeCompare(b.asset);
  });
  return holdings;
}

/** A holding of one coin in one wallet, or in all of them: the free, locked and frozen parts, and what they add up to. */
export interface CoinHolding {
  /** Free, locked and frozen together. */
  amount: string;
  free: string;
  locked: string;
  frozen: string;
  /** The USD value of the priced rows, or null when every row is unpriced. Zero when there are no rows. */
  usd: string | null;
  /** True when every row is priced. A holding with no rows is priced, as the API has a coin it doesn't hold. */
  priced: boolean;
}

/** The holding of a set of rows. With no rows, every amount is zero. */
function holdingOf(rows: readonly SnapshotAsset[]): CoinHolding {
  if (rows.length === 0) {
    return { amount: "0", free: "0", locked: "0", frozen: "0", usd: "0", priced: true };
  }
  return {
    amount: sum(rows.map((row) => sum([row.free, row.locked, row.freeze]))),
    free: sum(rows.map((row) => row.free)),
    locked: sum(rows.map((row) => row.locked)),
    frozen: sum(rows.map((row) => row.freeze)),
    usd: sumKnown(rows.map((row) => row.usd_value)),
    priced: rows.every((row) => row.priced),
  };
}

/**
 * One coin's holding in one snapshot: in total, and in each wallet. held is false when the snapshot has no row of the coin,
 * and then every amount is zero. The sums are exact, the same as mergeHoldings.
 */
export function coinHoldings(assets: readonly SnapshotAsset[], asset: string) {
  const rows = assets.filter((row) => row.asset === asset);
  return {
    held: rows.length > 0,
    total: holdingOf(rows),
    spot: holdingOf(rows.filter((row) => row.wallet_type === "spot")),
    funding: holdingOf(rows.filter((row) => row.wallet_type === "funding")),
  };
}
