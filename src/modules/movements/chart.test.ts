import { describe, expect, it } from "vitest";
import { apiInstant } from "../shared/dateRange";
import {
  barRange,
  CHART_NO_CATEGORY_KEY,
  CHART_OTHER_KEY,
  CHART_TOTAL_KEY,
  chartPeriod,
  chartRange,
  chartRows,
  chartSummary,
} from "./chart";
import type { AssetTotalRow } from "./types";

/** An asset row, out of the USDT account unless the test says otherwise. */
function row(overrides: Partial<AssetTotalRow>): AssetTotalRow {
  return {
    asset: "USDT",
    direction: "out",
    count: 1,
    amount: "0",
    usd_value: "0",
    unpriced_count: 0,
    ...overrides,
  };
}

const DAY = 24 * 60 * 60 * 1000;

describe("chartPeriod", () => {
  const now = new Date(2026, 10, 14, 12);
  const days = (count: number) => ({
    from: new Date(Date.UTC(2026, 0, 1)).toISOString(),
    to: new Date(Date.UTC(2026, 0, 1) + count * DAY).toISOString(),
  });

  it("uses days up to 31 calendar days", () => {
    expect(chartPeriod(days(1), now)).toBe("day");
    expect(chartPeriod(days(31), now)).toBe("day");
  });

  it("uses weeks from 32 days, up to 183", () => {
    expect(chartPeriod(days(32), now)).toBe("week");
    expect(chartPeriod(days(183), now)).toBe("week");
  });

  it("uses months from 184 days", () => {
    expect(chartPeriod(days(184), now)).toBe("month");
  });

  it("rounds the hours a DST change adds, so a calendar day count keeps its period", () => {
    // Sep 1 to Oct 3 is 32 local days, but only 31 days and 23 hours in Santiago, where the clocks moved forward.
    const from = apiInstant(new Date(2026, 8, 1));
    const to = apiInstant(new Date(2026, 9, 3));
    expect(chartPeriod({ from, to }, now)).toBe("week");
  });

  it("measures only from, to now, when the search has one end", () => {
    const from = apiInstant(new Date(2026, 10, 4));
    expect(chartPeriod({ from }, new Date(2026, 10, 14))).toBe("day");
    expect(chartPeriod({ from: apiInstant(new Date(2026, 7, 1)) }, new Date(2026, 10, 14))).toBe("week");
    expect(chartPeriod({ from: apiInstant(new Date(2025, 10, 1)) }, new Date(2026, 10, 14))).toBe("month");
  });

  it("uses months with no from, including when only to is set", () => {
    expect(chartPeriod({}, now)).toBe("month");
    expect(chartPeriod({ to: apiInstant(new Date(2026, 10, 14)) }, now)).toBe("month");
  });
});

describe("chartRange", () => {
  it("covers the last 12 months when the search has no date filter", () => {
    const range = chartRange({}, new Date(2026, 10, 14));
    expect(range).toEqual({ from: apiInstant(new Date(2025, 11, 1)), capped: true });
  });

  it("keeps the search's own range and doesn't cap it", () => {
    const from = "2026-01-05T03:00:00Z";
    const to = "2026-02-05T03:00:00Z";
    expect(chartRange({ from, to }, new Date(2026, 10, 14))).toEqual({ from, to, capped: false });
  });

  it("leaves an end open when only the other is set", () => {
    const to = "2026-02-05T03:00:00Z";
    expect(chartRange({ to }, new Date(2026, 10, 14))).toEqual({ from: undefined, to, capped: false });
  });
});

describe("chartRows in Total mode", () => {
  it("sums a period's assets exactly, filters the direction, and skips rows with no price", () => {
    const periodStart = "2026-11-02T03:00:00Z";
    const result = chartRows(
      [
        row({ period_start: periodStart, usd_value: "0.1" }),
        row({ period_start: periodStart, asset: "BTC", usd_value: "0.2" }),
        row({ period_start: "2026-11-01T03:00:00Z", usd_value: "5" }),
        row({ period_start: periodStart, direction: "in", usd_value: "100" }),
        row({ period_start: periodStart, asset: "SHIB", usd_value: null, unpriced_count: 1 }),
      ],
      "out",
      "total",
    );

    expect(result.series).toEqual([{ key: CHART_TOTAL_KEY, total: "5.3" }]);
    expect(result.rows).toEqual([
      { periodStart: "2026-11-01T03:00:00Z", values: { [CHART_TOTAL_KEY]: "5" }, total: "5" },
      { periodStart, values: { [CHART_TOTAL_KEY]: "0.3" }, total: "0.3" },
    ]);
  });

  it("has no bars and a null total when the direction has no priced movement", () => {
    expect(chartRows([row({ direction: "in", period_start: "2026-11-02T03:00:00Z" })], "out", "total")).toEqual({
      series: [{ key: CHART_TOTAL_KEY, total: null }],
      rows: [],
    });
  });

  it("is empty with no rows", () => {
    expect(chartRows([], "out", "total")).toEqual({
      series: [{ key: CHART_TOTAL_KEY, total: null }],
      rows: [],
    });
  });
});

describe("chartRows in By category mode", () => {
  const period = "2026-11-02T03:00:00Z";

  it("sums each category, largest first, and keeps no category last", () => {
    const result = chartRows(
      [
        row({ period_start: period, category_id: 3, usd_value: "100" }),
        row({ period_start: period, category_id: 4, usd_value: "40" }),
        row({ period_start: period, category_id: null, usd_value: "900" }),
        row({ period_start: "2026-11-03T03:00:00Z", category_id: 3, usd_value: "50" }),
        row({ period_start: "2026-11-03T03:00:00Z", category_id: 4, usd_value: "20" }),
        row({ period_start: "2026-11-03T03:00:00Z", category_id: null, usd_value: "100" }),
      ],
      "out",
      "category",
    );

    expect(result.series).toEqual([
      { key: "3", total: "150" },
      { key: "4", total: "60" },
      { key: CHART_NO_CATEGORY_KEY, total: "1000" },
    ]);
    expect(result.rows.map((bucket) => bucket.periodStart)).toEqual([period, "2026-11-03T03:00:00Z"]);
    expect(result.rows[0].values).toEqual({ "3": "100", "4": "40", [CHART_NO_CATEGORY_KEY]: "900" });
    expect(result.rows[0].total).toBe("1040");
  });

  it("merges the categories after the four largest into Other categories, before no category", () => {
    const rows = [
      row({ period_start: period, category_id: 1, usd_value: "60" }),
      row({ period_start: period, category_id: 2, usd_value: "50" }),
      row({ period_start: period, category_id: 3, usd_value: "40" }),
      row({ period_start: period, category_id: 4, usd_value: "30" }),
      row({ period_start: period, category_id: 5, usd_value: "20" }),
      row({ period_start: period, category_id: 6, usd_value: "10" }),
      row({ period_start: period, category_id: null, usd_value: "5" }),
    ];
    const result = chartRows(rows, "out", "category");

    expect(result.series).toEqual([
      { key: "1", total: "60" },
      { key: "2", total: "50" },
      { key: "3", total: "40" },
      { key: "4", total: "30" },
      { key: CHART_OTHER_KEY, total: "30" },
      { key: CHART_NO_CATEGORY_KEY, total: "5" },
    ]);
    expect(result.rows[0].values[CHART_OTHER_KEY]).toBe("30");
    expect(result.rows[0].total).toBe("215");
  });

  it("leaves out a category whose rows have no price", () => {
    const result = chartRows(
      [
        row({ period_start: period, category_id: 3, usd_value: "100" }),
        row({ period_start: period, category_id: 9, usd_value: null, unpriced_count: 2 }),
      ],
      "out",
      "category",
    );
    expect(result.series.map((series) => series.key)).toEqual(["3"]);
    expect(result.rows[0].values).toEqual({ "3": "100" });
  });

  it("keeps only the chosen direction", () => {
    const result = chartRows(
      [
        row({ period_start: period, category_id: 3, usd_value: "100" }),
        row({ period_start: period, category_id: 3, direction: "in", usd_value: "70" }),
      ],
      "in",
      "category",
    );
    expect(result.series).toEqual([{ key: "3", total: "70" }]);
  });
});

describe("chartSummary", () => {
  it("sums each direction and counts each movement once", () => {
    const summary = chartSummary({
      assets: [
        row({ direction: "out", count: 2, usd_value: "100.5", unpriced_count: 1 }),
        row({ direction: "out", asset: "BTC", count: 1, usd_value: "20" }),
        row({ direction: "in", count: 3, usd_value: "300", unpriced_count: 2 }),
        row({ direction: "in", asset: "BTC", count: 1, usd_value: null, unpriced_count: 1 }),
      ],
    });

    expect(summary).toEqual({ out: "120.5", in: "300", count: 7, unpriced: { out: 1, in: 3 } });
  });

  it("gives null for a direction with no priced movement", () => {
    const summary = chartSummary({ assets: [row({ direction: "out", usd_value: null, unpriced_count: 1 })] });
    expect(summary).toEqual({ out: null, in: null, count: 1, unpriced: { out: 1, in: 0 } });
  });
});

describe("barRange", () => {
  it("takes a day to the next local day", () => {
    expect(barRange("2026-11-02T03:00:00Z", "day", {})).toEqual({
      from: "2026-11-02T03:00:00Z",
      to: "2026-11-03T03:00:00Z",
    });
  });

  it("keeps the wall clock across the DST change of 2026-04-05, when the day has 25 hours", () => {
    expect(barRange("2026-04-04T03:00:00Z", "day", {})).toEqual({
      from: "2026-04-04T03:00:00Z",
      to: "2026-04-05T04:00:00Z",
    });
  });

  it("keeps the wall clock across the DST change of 2026-09-06", () => {
    expect(barRange("2026-09-05T04:00:00Z", "day", {})).toEqual({
      from: "2026-09-05T04:00:00Z",
      to: "2026-09-06T04:00:00Z",
    });
  });

  it("takes a week to the next local Monday", () => {
    expect(barRange("2026-11-02T03:00:00Z", "week", {})).toEqual({
      from: "2026-11-02T03:00:00Z",
      to: "2026-11-09T03:00:00Z",
    });
  });

  it("adds seven local days when the week crosses a DST change", () => {
    expect(barRange("2026-03-30T03:00:00Z", "week", {})).toEqual({
      from: "2026-03-30T03:00:00Z",
      to: "2026-04-06T04:00:00Z",
    });
    // The week of the September change runs from the Monday before it to the Monday after.
    expect(barRange("2026-08-31T04:00:00Z", "week", {})).toEqual({
      from: "2026-08-31T04:00:00Z",
      to: "2026-09-07T03:00:00Z",
    });
  });

  it("takes a month to the first of the next local month, past a month end", () => {
    expect(barRange("2026-01-01T03:00:00Z", "month", {})).toEqual({
      from: "2026-01-01T03:00:00Z",
      to: "2026-02-01T03:00:00Z",
    });
    // April and September cross a DST change, and the month boundary keeps its local midnight.
    expect(barRange("2026-04-01T03:00:00Z", "month", {})).toEqual({
      from: "2026-04-01T03:00:00Z",
      to: "2026-05-01T04:00:00Z",
    });
    expect(barRange("2026-09-01T04:00:00Z", "month", {})).toEqual({
      from: "2026-09-01T04:00:00Z",
      to: "2026-10-01T03:00:00Z",
    });
    expect(barRange("2026-11-01T03:00:00Z", "month", {})).toEqual({
      from: "2026-11-01T03:00:00Z",
      to: "2026-12-01T03:00:00Z",
    });
  });

  it("never widens the range: it clamps the bar to the current from and to", () => {
    expect(
      barRange("2026-11-02T03:00:00Z", "week", {
        from: "2026-11-04T03:00:00Z",
        to: "2026-11-07T03:00:00Z",
      }),
    ).toEqual({ from: "2026-11-04T03:00:00Z", to: "2026-11-07T03:00:00Z" });
  });

  it("leaves a bar alone when the current range holds all of it", () => {
    expect(
      barRange("2026-11-02T03:00:00Z", "day", {
        from: "2026-11-01T03:00:00Z",
        to: "2026-11-10T03:00:00Z",
      }),
    ).toEqual({ from: "2026-11-02T03:00:00Z", to: "2026-11-03T03:00:00Z" });
  });
});
