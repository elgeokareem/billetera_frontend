import { apiInstant } from "../shared/dateRange";
import type { SnapshotHistoryQuery } from "../snapshots/api";

/** The earliest instant of the all-time check. The app's snapshots are all newer, so nothing older can be missed. */
export const EVER_FROM = "2000-01-01T00:00:00Z";

/**
 * The all-time check of a coin, from 2000 to now, with one point per month. That is about 320 months, well under the 2000
 * buckets the API allows. Its points show whether any snapshot ever held the coin.
 */
export function everHeldQuery(now: Date): SnapshotHistoryQuery {
  return { from: EVER_FROM, to: apiInstant(now), bucket: "month", tz: "UTC" };
}
