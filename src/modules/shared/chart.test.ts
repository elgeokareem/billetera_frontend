import { describe, expect, it } from "vitest";
import type { AssetHistoryPoint, SnapshotPoint } from "../snapshots/types";
import {
  assetSeries,
  balanceSeries,
  chartWindow,
  clipToWindow,
  fitValueAxis,
  gapSpans,
  hasEnoughHistory,
  padEmptyWindow,
  type ChartPoint,
  timeAxisTicks,
  valueDomain,
} from "./chart";
import { RANGE_DAYS } from "./chartRange";

// The zone is pinned in vite.config.ts, so this run is the same on every machine. A run that bypasses the config would use the
// shell's zone and fail here instead of passing by luck.
describe("the test time zone", () => {
  it("is pinned to America/Santiago", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("America/Santiago");
  });
});

const HOUR = 3_600_000;
const DAY = 86_400_000;
const RANGES = ["24h", "7d", "30d", "90d", "1y"] as const;

/** A chart point, priced unless y is null. */
const point = (time: number, y: number | null = 1): ChartPoint => ({
  time,
  y,
  value: y === null ? null : String(y),
});

/** The calendar days between the local dates of two instants, from their fields, so DST can't skew it. */
function calendarDays(from: number, to: number): number {
  const a = new Date(from);
  const b = new Date(to);
  return Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / DAY,
  );
}

/** A range's window ending at a given instant, as the chart builds it. */
function windowOf(range: (typeof RANGES)[number], end: number) {
  return chartWindow(range, new Date(end).toISOString(), end);
}

describe("chartWindow", () => {
  const to = "2026-11-09T15:00:00Z";

  it("ends at the response's to and spans the range before it", () => {
    for (const range of RANGES) {
      const window = chartWindow(range, to, 0);
      expect(window.end, range).toBe(Date.parse(to));
      expect(window.end - window.start, range).toBe(RANGE_DAYS[range] * DAY);
    }
  });

  it("falls back to when the response arrived when to can't be parsed", () => {
    const fetchedAt = Date.UTC(2026, 10, 9, 15);
    expect(chartWindow("7d", "not a time", fetchedAt)).toEqual({ start: fetchedAt - 7 * DAY, end: fetchedAt });
  });
});

describe("clipToWindow", () => {
  const window = { start: 100, end: 300 };

  it("drops the points before the start and after the end, keeping the boundaries", () => {
    const series = [point(50), point(100), point(150), point(300), point(301)];
    expect(clipToWindow(series, window)).toEqual([point(100), point(150), point(300)]);
  });

  it("keeps a gap inside the window and the points in order", () => {
    const series = [point(120, 5), point(200, null), point(260, 7)];
    expect(clipToWindow(series, window)).toEqual(series);
  });
});

describe("padEmptyWindow", () => {
  const window = { start: 100, end: 300 };

  it("lays the axis out with two null edge points when there are none", () => {
    expect(padEmptyWindow([], window)).toEqual([
      { time: 100, y: null, value: null },
      { time: 300, y: null, value: null },
    ]);
  });

  it("returns a series with a point unchanged", () => {
    const series = [point(150, 3)];
    expect(padEmptyWindow(series, window)).toEqual(series);
  });
});

describe("gapSpans on a clipped series", () => {
  const window = { start: 100, end: 300 };

  it("shades nothing when the window has no points", () => {
    expect(gapSpans(clipToWindow([], window))).toEqual([]);
  });

  it("shades nothing when every point is outside the window", () => {
    expect(gapSpans(clipToWindow([point(50, null), point(350, null)], window))).toEqual([]);
  });
});

describe("timeAxisTicks", () => {
  // November 2026 has no DST change in Santiago. The 1y window crosses the changes, but no month start falls on one.
  const END = new Date(2026, 10, 9, 15).getTime();

  it("keeps every tick of every range inside the window, ascending and without duplicates", () => {
    for (const range of RANGES) {
      for (const compact of [false, true]) {
        const window = windowOf(range, END);
        const ticks = timeAxisTicks(range, window.start, window.end, compact);
        expect(ticks.length, `${range} ${compact}`).toBeGreaterThan(0);
        expect(ticks[0], `${range} ${compact}`).toBeGreaterThanOrEqual(window.start);
        expect(ticks[ticks.length - 1], `${range} ${compact}`).toBeLessThanOrEqual(window.end);
        expect(new Set(ticks).size, `${range} ${compact}`).toBe(ticks.length);
        for (let index = 1; index < ticks.length; index += 1) {
          expect(ticks[index], `${range} ${compact}`).toBeGreaterThan(ticks[index - 1]);
        }
      }
    }
  });

  it("labels 24h every six hours, on local clock boundaries, with the compact form unchanged", () => {
    const window = windowOf("24h", END);
    const ticks = timeAxisTicks("24h", window.start, window.end);
    expect(ticks.length).toBeGreaterThanOrEqual(4);
    expect(ticks.length).toBeLessThanOrEqual(5);
    for (const tick of ticks) {
      const date = new Date(tick);
      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
      expect(date.getHours() % 6).toBe(0);
    }
    expect(timeAxisTicks("24h", window.start, window.end, true)).toEqual(ticks);
  });

  it("labels 7d at every local midnight", () => {
    const window = windowOf("7d", END);
    const ticks = timeAxisTicks("7d", window.start, window.end);
    expect(ticks.length).toBeGreaterThanOrEqual(7);
    expect(ticks.length).toBeLessThanOrEqual(8);
    for (const tick of ticks) {
      const date = new Date(tick);
      expect([date.getHours(), date.getMinutes(), date.getSeconds()]).toEqual([0, 0, 0]);
    }
    for (let index = 1; index < ticks.length; index += 1) {
      expect(calendarDays(ticks[index - 1], ticks[index])).toBe(1);
    }
  });

  it("labels 30d at local midnights five calendar days apart", () => {
    const window = windowOf("30d", END);
    const ticks = timeAxisTicks("30d", window.start, window.end);
    expect(ticks.length).toBeGreaterThanOrEqual(6);
    expect(ticks.length).toBeLessThanOrEqual(7);
    for (const tick of ticks) {
      expect(new Date(tick).getHours()).toBe(0);
    }
    for (let index = 1; index < ticks.length; index += 1) {
      expect(calendarDays(ticks[index - 1], ticks[index])).toBe(5);
    }
  });

  it("labels 90d at local midnights fourteen calendar days apart, all Mondays", () => {
    const window = windowOf("90d", END);
    const ticks = timeAxisTicks("90d", window.start, window.end);
    expect(ticks.length).toBeGreaterThan(0);
    for (const tick of ticks) {
      const date = new Date(tick);
      expect(date.getHours()).toBe(0);
      expect(date.getDay()).toBe(1);
    }
    for (let index = 1; index < ticks.length; index += 1) {
      expect(calendarDays(ticks[index - 1], ticks[index])).toBe(14);
    }
  });

  it("labels 1y at the first of each month, at local midnight", () => {
    const window = windowOf("1y", END);
    const ticks = timeAxisTicks("1y", window.start, window.end);
    expect(ticks.length).toBeGreaterThanOrEqual(12);
    expect(ticks.length).toBeLessThanOrEqual(13);
    for (const tick of ticks) {
      const date = new Date(tick);
      expect(date.getDate()).toBe(1);
      expect([date.getHours(), date.getMinutes(), date.getSeconds()]).toEqual([0, 0, 0]);
    }
  });

  it("compacts the day ranges to twice the step, keeping them a subset of the regular ticks", () => {
    const steps = { "7d": 1, "30d": 5, "90d": 14 } as const;
    for (const range of ["7d", "30d", "90d"] as const) {
      const window = windowOf(range, END);
      const regular = timeAxisTicks(range, window.start, window.end);
      const compact = timeAxisTicks(range, window.start, window.end, true);
      expect(compact.length, range).toBeGreaterThan(0);
      for (const tick of compact) {
        expect(regular, range).toContain(tick);
      }
      for (let index = 1; index < compact.length; index += 1) {
        expect(calendarDays(compact[index - 1], compact[index]), range).toBe(steps[range] * 2);
      }
    }
  });

  it("compacts a year to Jan, Mar, May and the other even months", () => {
    const window = windowOf("1y", END);
    const compact = timeAxisTicks("1y", window.start, window.end, true);
    expect(compact.length).toBeGreaterThan(0);
    for (const tick of compact) {
      expect(new Date(tick).getMonth() % 2).toBe(0);
    }
  });

  it("keeps the ticks that stay inside the window when it slides by an hour", () => {
    for (const range of RANGES) {
      const window = windowOf(range, END);
      const regular = timeAxisTicks(range, window.start, window.end);
      for (const shift of [-HOUR, HOUR]) {
        const start = window.start + shift;
        const end = window.end + shift;
        const shifted = timeAxisTicks(range, start, end);
        expect(shifted.filter((tick) => tick >= start && tick <= end), `${range} ${shift}`).toEqual(
          regular.filter((tick) => tick >= start && tick <= end),
        );
      }
    }
  });
});

describe("timeAxisTicks across DST in America/Santiago", () => {
  it("moves a skipped midnight to 01:00 on a 24h window across the spring gap", () => {
    const end = Date.parse("2026-09-06T15:00:00Z");
    expect(timeAxisTicks("24h", end - DAY, end)).toEqual([
      Date.parse("2026-09-05T16:00:00Z"),
      Date.parse("2026-09-05T22:00:00Z"),
      Date.parse("2026-09-06T04:00:00Z"),
      Date.parse("2026-09-06T09:00:00Z"),
      Date.parse("2026-09-06T15:00:00Z"),
    ]);
  });

  it("places each tick once on a 24h window across the fall-back", () => {
    const end = Date.parse("2026-04-05T16:00:00Z");
    expect(timeAxisTicks("24h", end - DAY, end)).toEqual([
      Date.parse("2026-04-04T21:00:00Z"),
      Date.parse("2026-04-05T04:00:00Z"),
      Date.parse("2026-04-05T10:00:00Z"),
      Date.parse("2026-04-05T16:00:00Z"),
    ]);
  });

  it("keeps one midnight tick per day across the gap, the gap day at 01:00", () => {
    const end = Date.parse("2026-09-09T15:00:00Z");
    expect(timeAxisTicks("7d", end - 7 * DAY, end)).toEqual([
      Date.parse("2026-09-03T04:00:00Z"),
      Date.parse("2026-09-04T04:00:00Z"),
      Date.parse("2026-09-05T04:00:00Z"),
      Date.parse("2026-09-06T04:00:00Z"),
      Date.parse("2026-09-07T03:00:00Z"),
      Date.parse("2026-09-08T03:00:00Z"),
      Date.parse("2026-09-09T03:00:00Z"),
    ]);
    const gapDay = new Date(Date.parse("2026-09-06T04:00:00Z"));
    expect(gapDay.getDate()).toBe(6);
    expect(gapDay.getHours()).toBe(1);
  });

  it("keeps 30d and 90d ticks at local midnight across the gap", () => {
    const end = Date.parse("2026-09-20T15:00:00Z");
    for (const range of ["30d", "90d"] as const) {
      const step = range === "30d" ? 5 : 14;
      const ticks = timeAxisTicks(range, end - RANGE_DAYS[range] * DAY, end);
      expect(ticks.length, range).toBeGreaterThan(0);
      for (const tick of ticks) {
        expect(new Date(tick).getHours(), range).toBe(0);
      }
      for (let index = 1; index < ticks.length; index += 1) {
        expect(calendarDays(ticks[index - 1], ticks[index]), range).toBe(step);
      }
      const onGapDay = ticks.filter((tick) => {
        const date = new Date(tick);
        return date.getMonth() === 8 && date.getDate() === 6;
      });
      expect(onGapDay, range).toEqual([]);
    }
  });

  it("puts exactly one tick on the gap day in a 7d window, at 01:00", () => {
    const end = Date.parse("2026-09-10T15:00:00Z");
    const ticks = timeAxisTicks("7d", end - 7 * DAY, end);
    const gapDay = ticks.filter((tick) => {
      const date = new Date(tick);
      return date.getMonth() === 8 && date.getDate() === 6;
    });
    expect(gapDay).toEqual([Date.parse("2026-09-06T04:00:00Z")]);
  });

  it("keeps the ticks that stay inside when the 7d gap window slides by an hour", () => {
    const end = Date.parse("2026-09-09T15:00:00Z");
    const start = end - 7 * DAY;
    const base = timeAxisTicks("7d", start, end);
    for (const shift of [-HOUR, HOUR]) {
      const shiftedStart = start + shift;
      const shiftedEnd = end + shift;
      expect(timeAxisTicks("7d", shiftedStart, shiftedEnd)).toEqual(
        base.filter((tick) => tick >= shiftedStart && tick <= shiftedEnd),
      );
    }
  });
});

function coinPoint(overrides: Partial<AssetHistoryPoint>): AssetHistoryPoint {
  return {
    bucket_start: "2026-10-30T12:00:00Z",
    snapshot_id: 1,
    captured_at: "2026-10-30T12:00:00Z",
    amount: "1",
    spot_amount: "1",
    funding_amount: "0",
    usd_value: "100",
    priced: true,
    ...overrides,
  };
}

function totalPoint(overrides: Partial<SnapshotPoint>): SnapshotPoint {
  return {
    bucket_start: "2026-10-30T12:00:00Z",
    snapshot_id: 1,
    captured_at: "2026-10-30T12:00:00Z",
    total_usd: "1000",
    spot_total_usd: "1000",
    funding_total_usd: "0",
    unpriced_count: 0,
    ...overrides,
  };
}

const at = (hour: number, y: number | null): ChartPoint => ({
  time: Date.UTC(2026, 9, 30, hour),
  y,
  value: y === null ? null : String(y),
});

describe("balanceSeries", () => {
  it("keeps the exact total as the value, and puts the points in time order", () => {
    const series = balanceSeries([
      totalPoint({ captured_at: "2026-10-30T14:00:00Z", total_usd: "1254678.5" }),
      totalPoint({ captured_at: "2026-10-30T12:00:00Z", total_usd: "9007199254740993.00000001" }),
    ]);
    expect(series.map((point) => point.time)).toEqual([Date.UTC(2026, 9, 30, 12), Date.UTC(2026, 9, 30, 14)]);
    expect(series[0].value).toBe("9007199254740993.00000001");
    expect(series[1].value).toBe("1254678.5");
  });

  it("draws a total of zero as zero, since a zero total is a real value", () => {
    expect(balanceSeries([totalPoint({ total_usd: "0" })])[0].y).toBe(0);
  });
});

describe("assetSeries", () => {
  it("leaves a point with a null USD value as a gap, not a zero", () => {
    const [priced, unpriced] = assetSeries(
      [
        coinPoint({ captured_at: "2026-10-30T12:00:00Z", usd_value: "150", priced: true }),
        coinPoint({ captured_at: "2026-10-30T13:00:00Z", usd_value: null, priced: false }),
      ],
      "usd",
    );
    expect(priced).toEqual({ time: Date.UTC(2026, 9, 30, 12), y: 150, value: "150" });
    expect(unpriced).toEqual({ time: Date.UTC(2026, 9, 30, 13), y: null, value: null });
  });

  it("keeps a priced zero as a zero point, which is different from a gap", () => {
    const [point] = assetSeries([coinPoint({ usd_value: "0", amount: "0", priced: true })], "usd");
    expect(point.y).toBe(0);
    expect(point.value).toBe("0");
  });

  it("charts the amount instead, which is never a gap", () => {
    const series = assetSeries(
      [
        coinPoint({ captured_at: "2026-10-30T12:00:00Z", amount: "0.06958075", usd_value: null, priced: false }),
        coinPoint({ captured_at: "2026-10-30T13:00:00Z", amount: "0", usd_value: "0", priced: true }),
      ],
      "amount",
    );
    expect(series.map((point) => point.y)).toEqual([0.06958075, 0]);
    expect(series[0].value).toBe("0.06958075");
  });

  it("reads blank or non-numeric text as a gap, never as zero", () => {
    const series = assetSeries([coinPoint({ usd_value: "" }), coinPoint({ usd_value: "abc", captured_at: "2026-10-30T13:00:00Z" })], "usd");
    expect(series.map((point) => point.y)).toEqual([null, null]);
  });
});

describe("gapSpans", () => {
  it("has no spans when every point is priced", () => {
    expect(gapSpans([at(1, 1), at(2, 2)])).toEqual([]);
    expect(gapSpans([])).toEqual([]);
  });

  it("spans from the last priced point before a run of gaps to the first one after it", () => {
    expect(gapSpans([at(1, 5), at(2, null), at(3, null), at(4, 6)])).toEqual([
      { from: Date.UTC(2026, 9, 30, 1), to: Date.UTC(2026, 9, 30, 4) },
    ]);
  });

  it("stops at the run's own edges when the gap is at the start or the end", () => {
    expect(gapSpans([at(1, null), at(2, null), at(3, 4)])).toEqual([
      { from: Date.UTC(2026, 9, 30, 1), to: Date.UTC(2026, 9, 30, 3) },
    ]);
    expect(gapSpans([at(1, 4), at(2, null), at(3, null)])).toEqual([
      { from: Date.UTC(2026, 9, 30, 1), to: Date.UTC(2026, 9, 30, 3) },
    ]);
  });

  it("shades the whole series when no point is priced", () => {
    expect(gapSpans([at(1, null), at(2, null), at(3, null)])).toEqual([
      { from: Date.UTC(2026, 9, 30, 1), to: Date.UTC(2026, 9, 30, 3) },
    ]);
  });

  it("finds each run, and an isolated priced point between two runs", () => {
    expect(gapSpans([at(1, null), at(2, 7), at(3, null), at(4, null), at(5, 8)])).toEqual([
      { from: Date.UTC(2026, 9, 30, 1), to: Date.UTC(2026, 9, 30, 2) },
      { from: Date.UTC(2026, 9, 30, 2), to: Date.UTC(2026, 9, 30, 5) },
    ]);
  });
});

describe("hasEnoughHistory", () => {
  it("needs two points to draw a line", () => {
    expect(hasEnoughHistory([])).toBe(false);
    expect(hasEnoughHistory([at(1, 1)])).toBe(false);
    expect(hasEnoughHistory([at(1, 1), at(2, null)])).toBe(true);
  });
});

describe("valueDomain", () => {
  it("starts a USD value axis at zero, so the height means the same at every point", () => {
    expect(valueDomain(true)).toEqual([0, "auto"]);
  });

  it("fits an amount axis to its own values, so a small change still shows", () => {
    expect(valueDomain(false)).toEqual(["auto", "auto"]);
  });
});

/** The axis of a series of values, one point an hour, with a gap where the value is null. */
const fit = (values: readonly (number | null)[]) => fitValueAxis(values.map((y, hour) => at(hour, y)));

/** The axis of a series that has one. The caller checks the shape of it. */
function axisOf(values: readonly number[]) {
  const axis = fit(values);
  expect(axis).not.toBeNull();
  return axis!;
}

/** A round step: 1, 2, 2.5, 5 or 10 times a power of ten. */
function isRoundStep(step: number) {
  const exponent = Math.floor(Math.log10(step));
  const mantissa = step / 10 ** exponent;
  return [1, 2, 2.5, 5, 10].some((candidate) => Math.abs(mantissa - candidate) <= candidate * 1e-9);
}

/** Series of several sizes, levels and spreads from a fixed sequence, so every run checks the same series. */
function pseudoRandomSeries(count: number): number[][] {
  let state = 2026;
  const next = () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
  return Array.from({ length: count }, (_, index) => {
    const level = 10 ** ((index % 10) - 4); // from 0.0001 to 100000
    const spread = [0, 0.001, 0.02, 0.05, 0.3, 1][index % 6];
    return Array.from({ length: 2 + (index % 30) }, () => level + next() * level * spread);
  });
}

/** The series the properties are checked on: the spec's examples, and a fixed spread of random ones. */
const SERIES: number[][] = [
  [12300, 12700],
  [12210.87, 12546.78, 12240.86],
  [0, 100],
  [45, 0, 0, 45],
  [0.0012, 0.00125, 0.0013],
  [6032.74, 6412.3],
  [1000000, 1000005],
  [7, 7, 7],
  [0],
  ...pseudoRandomSeries(80),
];

describe("fitValueAxis", () => {
  it("fits a range of 12,300 to 12,700 on steps of 200, with padding", () => {
    expect(fit([12300, 12700])).toEqual({ domain: [12200, 12800], ticks: [12200, 12400, 12600, 12800] });
  });

  it("centres a flat balance of 12,500 on an axis of 12,300 to 12,700", () => {
    expect(fit([12500, 12500])).toEqual({ domain: [12300, 12700], ticks: [12300, 12400, 12500, 12600, 12700] });
  });

  it("fits a single value the same way as a flat series", () => {
    expect(fit([12500])).toEqual(fit([12500, 12500]));
  });

  it("never starts below zero, so 0 to 100 gives 0 to 150", () => {
    expect(fit([0, 100])).toEqual({ domain: [0, 150], ticks: [0, 50, 100, 150] });
  });

  it("fits small amounts on a step that matches them", () => {
    expect(fit([0.0012, 0.0013])).toEqual({
      domain: [0.00115, 0.00135],
      ticks: [0.00115, 0.0012, 0.00125, 0.0013, 0.00135],
    });
  });

  it("gives an all-zero series the axis from 0 to 1", () => {
    expect(fit([0, 0, 0])).toEqual({ domain: [0, 1], ticks: [0, 0.25, 0.5, 0.75, 1] });
  });

  it("puts every value inside the domain, with the first and last ticks at its ends", () => {
    for (const values of SERIES) {
      const { domain, ticks } = axisOf(values);
      for (const y of values) {
        expect(y).toBeGreaterThanOrEqual(domain[0]);
        expect(y).toBeLessThanOrEqual(domain[1]);
      }
      expect(ticks[0]).toBe(domain[0]);
      expect(ticks[ticks.length - 1]).toBe(domain[1]);
    }
  });

  it("spaces four to seven round ticks evenly, with no float noise", () => {
    for (const values of SERIES) {
      const { ticks } = axisOf(values);
      expect(ticks.length).toBeGreaterThanOrEqual(4);
      expect(ticks.length).toBeLessThanOrEqual(7);
      const step = ticks[1] - ticks[0];
      expect(isRoundStep(step)).toBe(true);
      for (let index = 1; index < ticks.length; index += 1) {
        expect(Math.abs(ticks[index] - ticks[index - 1] - step)).toBeLessThanOrEqual(step * 1e-9);
      }
      // A tick such as 12399.999999999998 would fail here: its twelve-digit form is 12400, which isn't the number.
      for (const tick of ticks) {
        expect(Number(tick.toPrecision(12))).toBe(tick);
      }
    }
  });

  it("never puts a tick below zero for non-negative data", () => {
    for (const values of SERIES) {
      expect(axisOf(values).domain[0]).toBeGreaterThanOrEqual(0);
    }
  });

  it("puts a flat series strictly inside the domain, near the middle", () => {
    const [low, high] = axisOf([12500, 12500, 12500]).domain;
    expect(low).toBeLessThan(12500);
    expect(high).toBeGreaterThan(12500);
    expect(Math.abs(12500 - (low + high) / 2)).toBeLessThan((high - low) * 0.05);
  });

  it("ignores gaps, so a gap doesn't move the axis", () => {
    expect(fit([null, 12300, null, 12700, null])).toEqual(fit([12300, 12700]));
  });

  it("has no axis for a series of gaps, or for no points", () => {
    expect(fit([null, null])).toBeNull();
    expect(fitValueAxis([])).toBeNull();
  });
});
