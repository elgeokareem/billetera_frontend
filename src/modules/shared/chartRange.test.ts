import { describe, expect, it } from "vitest";
import {
  DEFAULT_RANGE,
  openRangeQuery,
  parseRangeSearch,
  RANGE_DAYS,
  RANGE_KEYS,
  rangeQuery,
} from "./chartRange";

const now = new Date("2026-10-30T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

// The backend's bucket rules, as backend/modules/snapshots/services.go writes them, so the presets can be checked against the
// cap without a server. Only the bucket widths and the 2000-bucket limit are needed.
const WIDTH = { raw: 5 * 60 * 1000, hour: HOUR, day: DAY, week: 7 * DAY, month: 31 * DAY };
const MAX_BUCKETS = 2000;

function autoBucket(spanMs: number) {
  if (spanMs <= 2 * DAY) return "raw";
  if (spanMs <= 31 * DAY) return "hour";
  if (spanMs <= 731 * DAY) return "day";
  return "week";
}

describe("range queries", () => {
  it("offers the five ranges in order, for every chart", () => {
    expect(RANGE_KEYS).toEqual(["24h", "7d", "30d", "90d", "1y"]);
  });

  it("covers the range that ends now, and sends the browser's zone", () => {
    expect(rangeQuery(now, "7d", "America/Caracas")).toEqual({
      from: "2026-10-23T12:00:00Z",
      to: "2026-10-30T12:00:00Z",
      tz: "America/Caracas",
    });
  });

  it("never sends a bucket, so the backend picks one for every range", () => {
    for (const key of RANGE_KEYS) {
      expect(rangeQuery(now, key, "UTC"), key).not.toHaveProperty("bucket");
    }
  });

  it("makes a year 365 days", () => {
    const { from, to } = rangeQuery(now, "1y", "UTC");
    expect(new Date(to!).getTime() - new Date(from!).getTime()).toBe(365 * DAY);
  });

  it("keeps every preset under the 2000-bucket cap with the bucket the backend picks, including one year", () => {
    for (const key of RANGE_KEYS) {
      const { from, to } = rangeQuery(now, key, "UTC");
      const span = new Date(to!).getTime() - new Date(from!).getTime();
      const bucket = autoBucket(span) as keyof typeof WIDTH;
      expect(span / WIDTH[bucket], `${key} with ${bucket}`).toBeLessThanOrEqual(MAX_BUCKETS);
    }
  });

  it("would break one year at hourly buckets, which is why no bucket is sent", () => {
    const span = RANGE_DAYS["1y"] * DAY;
    expect(span / WIDTH.hour).toBeGreaterThan(MAX_BUCKETS);
  });

  it("uses the 30 day range by default", () => {
    expect(DEFAULT_RANGE).toBe("30d");
  });
});

describe("the 24-hour range", () => {
  it("covers the last 24 hours, with raw snapshots under the cap", () => {
    const { from, to } = rangeQuery(now, "24h", "UTC");
    expect(from).toBe("2026-10-29T12:00:00Z");
    expect(to).toBe("2026-10-30T12:00:00Z");
    const span = new Date(to!).getTime() - new Date(from!).getTime();
    expect(span).toBe(DAY);
    expect(autoBucket(span)).toBe("raw");
    expect(span / WIDTH.raw).toBeLessThanOrEqual(MAX_BUCKETS);
  });
});

describe("openRangeQuery", () => {
  it("has the start and the zone, and neither an end nor a bucket, so each request ends at its own time", () => {
    expect(openRangeQuery(now, "30d", "America/Caracas")).toEqual({
      from: "2026-09-30T12:00:00Z",
      tz: "America/Caracas",
    });
  });

  it("leaves the end and the bucket out for every range", () => {
    for (const key of RANGE_KEYS) {
      const query = openRangeQuery(now, key, "UTC");
      expect(query, key).not.toHaveProperty("to");
      expect(query, key).not.toHaveProperty("bucket");
    }
  });
});

describe("parseRangeSearch", () => {
  it("keeps each range except the default", () => {
    for (const key of ["24h", "7d", "90d", "1y"] as const) {
      expect(parseRangeSearch({ range: key }, RANGE_KEYS), key).toEqual({ range: key });
    }
    expect(parseRangeSearch({ range: DEFAULT_RANGE }, RANGE_KEYS)).toEqual({});
  });

  it("drops a range that isn't one of the keys, including an empty one and one in the wrong case", () => {
    for (const value of ["2y", "", "24H"]) {
      expect(parseRangeSearch({ range: value }, RANGE_KEYS), value).toEqual({});
    }
  });

  it("reads a missing or a non-text range as the default", () => {
    expect(parseRangeSearch({}, RANGE_KEYS)).toEqual({});
    expect(parseRangeSearch({ range: 7 }, RANGE_KEYS)).toEqual({});
  });
});
