import type { AssetHistoryPoint, SnapshotPoint } from "../snapshots/types";
import { RANGE_DAYS, type RangeKey } from "./chartRange";

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

/** A line needs two points. A range with fewer draws its points on the window's axis, with "Not enough history yet" as a caption. */
export const MIN_POINTS = 2;

const DAY_MS = 86_400_000;

/** A chart's time window, in epoch milliseconds: the selected range, ending at the history response's `to`. */
export type TimeWindow = { start: number; end: number };

/**
 * The window a range covers. `to` is the history response's own end, so the newest data sits at the right edge and a refetch
 * moves the window forward; `fallbackEnd` is when the response arrived, used only when `to` can't be parsed (the schema requires
 * it, so that's a guard alone). The length comes from the range chip, not from the request's `from`, which is fixed when the page
 * mounts.
 */
export function chartWindow(range: RangeKey, to: string, fallbackEnd: number): TimeWindow {
  const parsed = Date.parse(to);
  const end = Number.isFinite(parsed) ? parsed : fallbackEnd;
  return { start: end - RANGE_DAYS[range] * DAY_MS, end };
}

/** The points inside the window, in their order. A gap inside it stays; a point outside is dropped. */
export function clipToWindow(series: readonly ChartPoint[], window: TimeWindow): ChartPoint[] {
  return series.filter((point) => window.start <= point.time && point.time <= window.end);
}

/**
 * The series the chart is drawn with. Recharts draws no time labels without a point, so an empty series gets two null points at
 * the window's edges, which lay the axis out: they have no value, so they add no line, dot or shading. A series with a point is
 * returned as it is.
 */
export function padEmptyWindow(series: readonly ChartPoint[], window: TimeWindow): ChartPoint[] {
  if (series.length > 0) {
    return [...series];
  }
  return [
    { time: window.start, y: null, value: null },
    { time: window.end, y: null, value: null },
  ];
}

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

/** Whether the points are enough to draw a line. Fewer than MIN_POINTS still draw, with the caption under the axis. */
export function hasEnoughHistory(points: readonly unknown[]): boolean {
  return points.length >= MIN_POINTS;
}

/** The Monday the multi-day tick steps are anchored on: 2000-01-03. */
const DAY_INDEX_ORIGIN = Date.UTC(2000, 0, 3);

/** Calendar days from DAY_INDEX_ORIGIN to a local date, from its fields, so a DST change can't move it. */
function dayIndex(year: number, month: number, day: number): number {
  return Math.round((Date.UTC(year, month, day) - DAY_INDEX_ORIGIN) / DAY_MS);
}

/** The step, in calendar days, between the midnights of a day range, doubled when the ticks have to be compact. */
function dayStep(range: RangeKey, compact: boolean): number {
  const step = range === "30d" ? 5 : range === "90d" ? 14 : 1;
  return compact ? step * 2 : step;
}

/**
 * The times the time axis is labelled at, on the local clock, which is the browser's zone and the same `tz` the requests send.
 * 24h gets every six hours, 7d, 30d and 90d get local midnights on a fixed day step, and 1y gets the first of each month. The
 * step doesn't move as the window slides: the day steps are anchored on Monday 2000-01-03 (so 14 and 28 days fall on Mondays) and
 * the month steps on the calendar month, so a compact year is Jan, Mar, May and so on.
 *
 * Each candidate is built from calendar fields, never by adding milliseconds, and the Date constructor is used as it is: a local
 * time that doesn't exist moves to the first instant after the gap, and a repeated one takes its first occurrence. In
 * America/Santiago the clocks change at midnight, so that is what keeps one tick per day. Returns epoch milliseconds, ascending,
 * inside [start, end], with no duplicates. The compact form is for a narrow chart.
 */
export function timeAxisTicks(range: RangeKey, start: number, end: number, compact = false): number[] {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return [];
  }
  const ticks: number[] = [];
  const first = new Date(start);
  const last = new Date(end);
  const firstDay = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());

  if (range === "24h") {
    for (let offset = 0; ; offset += 1) {
      const day = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() + offset);
      if (day > lastDay) {
        break;
      }
      for (const hour of [0, 6, 12, 18]) {
        const tick = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour).getTime();
        if (tick >= start && tick <= end) {
          ticks.push(tick);
        }
      }
    }
    return ticks;
  }

  if (range === "1y") {
    const lastYear = last.getFullYear();
    const lastMonth = last.getMonth();
    for (let offset = 0; ; offset += 1) {
      const year = firstDay.getFullYear() + Math.floor((firstDay.getMonth() + offset) / 12);
      const month = (firstDay.getMonth() + offset) % 12;
      if (year > lastYear || (year === lastYear && month > lastMonth)) {
        break;
      }
      if (compact && month % 2 !== 0) {
        continue;
      }
      const tick = new Date(year, month, 1).getTime();
      if (tick >= start && tick <= end) {
        ticks.push(tick);
      }
    }
    return ticks;
  }

  const step = dayStep(range, compact);
  for (let offset = 0; ; offset += 1) {
    const day = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() + offset);
    if (day > lastDay) {
      break;
    }
    if (dayIndex(day.getFullYear(), day.getMonth(), day.getDate()) % step === 0) {
      const tick = day.getTime();
      if (tick >= start && tick <= end) {
        ticks.push(tick);
      }
    }
  }
  return ticks;
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
