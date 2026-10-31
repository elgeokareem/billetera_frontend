import { describe, expect, it } from "vitest";
import { apiInstant } from "../shared/dateRange";
import { DEFAULT_RANGE, EVER_FROM, RANGE_DAYS, RANGE_KEYS, everHeldQuery, rangeQuery } from "./queries";

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

describe("everHeldQuery", () => {
  it("looks back to 2000 in monthly buckets, under the cap", () => {
    const query = everHeldQuery(now);
    expect(query).toEqual({ from: EVER_FROM, to: apiInstant(now), bucket: "month", tz: "UTC" });
    const months = (now.getUTCFullYear() - 2000) * 12 + now.getUTCMonth() + 1;
    expect(months).toBeLessThanOrEqual(MAX_BUCKETS);
  });
});
