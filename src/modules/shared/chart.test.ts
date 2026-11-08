import { describe, expect, it } from "vitest";
import type { AssetHistoryPoint, SnapshotPoint } from "../snapshots/types";
import { assetSeries, balanceSeries, fitValueAxis, gapSpans, hasEnoughHistory, type ChartPoint, valueDomain } from "./chart";

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
