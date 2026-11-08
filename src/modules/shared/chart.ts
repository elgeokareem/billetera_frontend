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

/** The value axis of a chart: the domain it spans, and the ticks it's labelled with, from the first to the last. */
export type ValueAxis = { domain: [number, number]; ticks: number[] };

/** The fitted axis pads the data by this share of its span, on each side. */
const AXIS_PADDING = 0.08;

/** A series with no spread still gets a span of this share of its own value, so a flat line sits mid-chart. */
const MIN_SPAN_SHARE = 0.02;

/** Float noise in a tick's position, so a value a hair past a multiple of the step doesn't add a tick. */
const TICK_TOLERANCE = 1e-9;

/**
 * The smallest round step, 1, 2, 2.5, 5 or 10 times a power of ten, that is at least the target. The power is checked against the
 * target, since Math.log10 can be a hair off at a power of ten.
 */
function roundStep(target: number): number {
  let exponent = Math.floor(Math.log10(target));
  if (Number(`1e${exponent + 1}`) <= target) {
    exponent += 1;
  }
  if (Number(`1e${exponent}`) > target) {
    exponent -= 1;
  }
  const steps = [1, 2, 2.5, 5, 10].map((mantissa) => Number(`${mantissa}e${exponent}`));
  return steps.find((step) => step >= target) ?? steps[steps.length - 1];
}

/** The decimals a tick is rounded to, from the power of ten of its step: 5 × 10^-5 gets 6, 2.5 gets 1, and 10 and up get 0. */
const decimalsOf = (step: number) => Math.max(0, 1 - Math.floor(Math.log10(step)));

/**
 * The value axis that fits the data, instead of starting at zero. It spans the lowest and highest value with some padding, on
 * round ticks. When the data never goes below zero (every balance and amount), the axis doesn't either. A flat series, or a single
 * value, gets a span of 2% of its value, centred on it. A gap (y of null) isn't part of the data. Null when no point has a value.
 */
export function fitValueAxis(series: readonly ChartPoint[]): ValueAxis | null {
  let min = Infinity;
  let max = -Infinity;
  for (const point of series) {
    if (point.y !== null && Number.isFinite(point.y)) {
      min = Math.min(min, point.y);
      max = Math.max(max, point.y);
    }
  }
  if (!Number.isFinite(min)) {
    return null;
  }

  const mid = (min + max) / 2;
  const span = Math.max(max - min, Math.abs(mid) * MIN_SPAN_SHARE);
  if (span === 0) {
    return { domain: [0, 1], ticks: [0, 0.25, 0.5, 0.75, 1] };
  }

  const padding = span * AXIS_PADDING;
  const low = min >= 0 ? Math.max(mid - span / 2 - padding, 0) : mid - span / 2 - padding;
  const high = mid + span / 2 + padding;

  const step = roundStep((high - low) / 4);
  const decimals = decimalsOf(step);
  const first = Math.floor(low / step + TICK_TOLERANCE);
  const last = Math.ceil(high / step - TICK_TOLERANCE);
  const ticks: number[] = [];
  for (let index = first; index <= last; index += 1) {
    ticks.push(Number((index * step).toFixed(decimals)));
  }
  return { domain: [ticks[0], ticks[ticks.length - 1]], ticks };
}
