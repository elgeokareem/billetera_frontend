import type { AssetHistoryPoint, SnapshotPoint } from "../snapshots/types";

/** The value of a coin's history that the chart draws. */
export type Measure = "usd" | "amount";

/**
 * One point of a chart. y is the number the chart draws, and it's null for a point with no price: the chart leaves that point
 * as a gap, never as zero. value is the API's decimal string, which the tooltip shows, so money never passes through a number.
 */
export type ChartPoint = {
  /** Milliseconds since the epoch. The time is the snapshot's own captured_at, the moment its value was taken. */
  time: number;
  y: number | null;
  value: string | null;
};

/** A line needs two points. A range with fewer shows "Not enough history yet" instead of a chart. */
export const MIN_POINTS = 2;

/** A decimal string as a chart coordinate. Blank or non-numeric text is null, which is a gap, never a zero. */
function coordinate(value: string | null): number | null {
  if (value === null || value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Keeps the points that have a time, in time order. The API sends them in order already. */
function inTimeOrder(points: ChartPoint[]): ChartPoint[] {
  return points.filter((point) => Number.isFinite(point.time)).sort((a, b) => a.time - b.time);
}

/** The total balance over time. The total is never missing, so no point is a gap. */
export function balanceSeries(points: readonly SnapshotPoint[]): ChartPoint[] {
  return inTimeOrder(
    points.map((point) => ({
      time: Date.parse(point.captured_at),
      y: coordinate(point.total_usd),
      value: point.total_usd,
    })),
  );
}

/**
 * A coin's holding over time, as its USD value or as its amount. A usd_value of null stays a gap, which is how a point with
 * no price shows. The amount is never missing, so the amount chart has no gaps.
 */
export function assetSeries(points: readonly AssetHistoryPoint[], measure: Measure): ChartPoint[] {
  return inTimeOrder(
    points.map((point) => {
      const value = measure === "usd" ? point.usd_value : point.amount;
      return { time: Date.parse(point.captured_at), y: coordinate(value), value };
    }),
  );
}

/** A stretch of the time axis where the price is unknown, to shade. */
export type GapSpan = { from: number; to: number };

/**
 * The stretches with no price, for shading. A run of gaps runs from the last priced point before it to the first priced point
 * after it. At either end of the series, it stops at the run's own first or last point.
 */
export function gapSpans(series: readonly ChartPoint[]): GapSpan[] {
  const spans: GapSpan[] = [];
  let index = 0;
  while (index < series.length) {
    if (series[index].y !== null) {
      index += 1;
      continue;
    }
    const first = index;
    while (index < series.length && series[index].y === null) {
      index += 1;
    }
    const last = index - 1;
    spans.push({
      from: first > 0 ? series[first - 1].time : series[first].time,
      to: index < series.length ? series[index].time : series[last].time,
    });
  }
  return spans;
}

/** Whether the points are enough to draw a line. */
export function hasEnoughHistory(points: readonly unknown[]): boolean {
  return points.length >= MIN_POINTS;
}

/**
 * The domain of the value axis. A USD value starts at zero, so the height of the line means the same at every point. An amount
 * fits its own values, so a small change in it still shows.
 */
export function valueDomain(startsAtZero: boolean): [number | "auto", "auto"] {
  return startsAtZero ? [0, "auto"] : ["auto", "auto"];
}
