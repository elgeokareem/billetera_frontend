import { describe, expect, it } from "vitest";
import type { AssetHistoryPoint, SnapshotPoint } from "../snapshots/types";
import { assetSeries, balanceSeries, gapSpans, hasEnoughHistory, type ChartPoint, valueDomain } from "./chart";

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
