import { apiInstant, daysBefore } from "../shared/dateRange";
import type { SnapshotHistoryQuery } from "../snapshots/api";

/** The ranges the charts offer, as days back from now. A year is 365 days. */
export const RANGE_DAYS = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
} as const;

export type RangeKey = keyof typeof RANGE_DAYS;

/** The order the range chips show, and the one that's picked first. */
export const RANGE_KEYS: readonly RangeKey[] = ["7d", "30d", "90d", "1y"];
export const DEFAULT_RANGE: RangeKey = "30d";

/**
 * The history of one range, ending now. No bucket is sent: the backend picks one from the length of the range (hourly up to 31
 * days, daily up to 731), and every preset stays under its 2000-bucket limit. tz is the browser's zone, so the buckets start at
 * its midnights.
 */
export function rangeQuery(now: Date, key: RangeKey, timeZone: string): SnapshotHistoryQuery {
  return { from: daysBefore(now, RANGE_DAYS[key]), to: apiInstant(now), tz: timeZone };
}

/** The earliest instant of the all-time check. The app's snapshots are all newer, so nothing older can be missed. */
export const EVER_FROM = "2000-01-01T00:00:00Z";

/**
 * The all-time check of a coin, from 2000 to now, with one point per month. That is about 320 months, well under the 2000
 * buckets the API allows. Its points show whether any snapshot ever held the coin.
 */
export function everHeldQuery(now: Date): SnapshotHistoryQuery {
  return { from: EVER_FROM, to: apiInstant(now), bucket: "month", tz: "UTC" };
}
