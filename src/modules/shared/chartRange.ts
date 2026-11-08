import type { SnapshotHistoryQuery } from "../snapshots/api";
import { apiInstant, daysBefore } from "./dateRange";

/** The ranges the charts offer, as days back from now. A year is 365 days, and 24 hours is one day. */
export const RANGE_DAYS = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
} as const;

export type RangeKey = keyof typeof RANGE_DAYS;

/** The Assets chips, in the order they show. Assets has no 24-hour range. */
export const ASSET_RANGE_KEYS: readonly RangeKey[] = ["7d", "30d", "90d", "1y"];

/** The Dashboard's chips, in the order they show. */
export const DASHBOARD_RANGE_KEYS: readonly RangeKey[] = ["24h", "7d", "30d", "90d", "1y"];

/** The range that's picked first, on both charts. */
export const DEFAULT_RANGE: RangeKey = "30d";

/**
 * The history of one range, ending now. No bucket is sent: the backend picks one from the length of the range (raw up to 2
 * days, hourly up to 31, daily up to 731), and every preset stays under its 2000-bucket limit. tz is the browser's zone, so
 * the buckets start at its midnights.
 */
export function rangeQuery(now: Date, key: RangeKey, timeZone: string): SnapshotHistoryQuery {
  return { from: daysBefore(now, RANGE_DAYS[key]), to: apiInstant(now), tz: timeZone };
}

/**
 * The Dashboard's history query: from the start of the range, with no `to`, so the backend ends the range at the time of each
 * request. A Sync refetches it, and the new snapshot is on it. `from` is fixed when the page mounts, so the query key holds.
 */
export function openRangeQuery(now: Date, key: RangeKey, timeZone: string): SnapshotHistoryQuery {
  return { from: daysBefore(now, RANGE_DAYS[key]), tz: timeZone };
}

/**
 * The range a `range` search param names. It's kept only when it's one of the keys given and isn't the default, so the default
 * has no param. Anything else is left out, and the chart shows the default range, as it does with no param.
 */
export function parseRangeSearch(raw: Record<string, unknown>, keys: readonly RangeKey[]): { range?: RangeKey } {
  const value = raw.range;
  if (typeof value !== "string" || value === DEFAULT_RANGE) {
    return {};
  }
  return keys.includes(value as RangeKey) ? { range: value as RangeKey } : {};
}

/**
 * The range a chart shows, from the `range` value of the route's search. The router keeps a param that validateSearch dropped,
 * as raw text, so the value is checked here too: anything that isn't one of the keys, such as 2y, shows the default range.
 */
export function rangeOf(value: unknown, keys: readonly RangeKey[]): RangeKey {
  return typeof value === "string" && keys.includes(value as RangeKey) ? (value as RangeKey) : DEFAULT_RANGE;
}
