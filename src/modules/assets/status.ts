import { compare } from "../shared/money";
import type { AssetHistoryPoint } from "../snapshots/types";

/**
 * What the coin page shows for a coin code:
 * - held: the latest snapshot has the coin, so its wallets and amounts show.
 * - formerly: the latest snapshot doesn't have it, but an earlier one did. The amounts are zero and the history shows.
 * - unknown: nothing found it, so the page says Not found.
 */
export type CoinStatus = "held" | "formerly" | "unknown";

/** Whether a coin's history has any amount above zero. */
export function everHeldIn(points: readonly AssetHistoryPoint[]): boolean {
  return points.some((point) => compare(point.amount, "0") !== 0);
}

/**
 * The status of a coin the latest snapshot doesn't hold, from its checks. One check finding it settles it as formerly held.
 * Unknown needs every check to have run and found nothing, since each check can miss a holding; until then the status isn't
 * known, so it's undefined.
 */
export function absentCoinStatus(found: boolean, allChecksRan: boolean): CoinStatus | undefined {
  if (found) {
    return "formerly";
  }
  return allChecksRan ? "unknown" : undefined;
}
