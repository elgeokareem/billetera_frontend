import { describe, expect, it } from "vitest";
import { apiInstant } from "../shared/dateRange";
import { EVER_FROM, everHeldQuery } from "./queries";

const now = new Date("2026-10-30T12:00:00Z");
const MAX_BUCKETS = 2000;

describe("everHeldQuery", () => {
  it("looks back to 2000 in monthly buckets, under the cap", () => {
    const query = everHeldQuery(now);
    expect(query).toEqual({ from: EVER_FROM, to: apiInstant(now), bucket: "month", tz: "UTC" });
    const months = (now.getUTCFullYear() - 2000) * 12 + now.getUTCMonth() + 1;
    expect(months).toBeLessThanOrEqual(MAX_BUCKETS);
  });
});
