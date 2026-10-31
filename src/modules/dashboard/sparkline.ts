// The geometry of the balance sparkline, as plain numbers for drawing. The values are the API's totals, read as numbers only to
// place them on the chart. Money is never added or compared here, and the labels are formatted from the real times.

/** The drawing's width, in the SVG's own units. The SVG stretches to the card. */
export const SPARK_WIDTH = 400;
/** The height of the plot, in pixels. */
export const PLOT_HEIGHT = 84;
/** The height of one line of an axis label, in pixels. The scale labels are centred on their ticks. */
export const AXIS_LINE = 12;
/** The gap between the plot and the date labels, in pixels. */
export const LABEL_GAP = 4;
/** The whole sparkline: the plot with half a label line above and below it, then the date labels. */
export const SPARKLINE_HEIGHT = PLOT_HEIGHT + 2 * AXIS_LINE + LABEL_GAP;
/** The date labels: the start, the middle and the end. */
export const DATE_LABELS = 3;
/** The USD scale has at most this many steps above zero, so it has at most four labels. */
export const MAX_SCALE_STEPS = 3;

/** A point of the line: its time in milliseconds, and its total as a number. */
export interface SparkPoint {
  time: number;
  value: number;
}

// The steps a scale can use, in each decade: 1, 2, 2.5 and 5 times a power of ten.
const STEPS = [1, 2, 2.5, 5];

/**
 * A scale for values that starts at zero. Its top is a whole number of steps, no more than `maxSteps` of them, and it isn't
 * below the largest value. The smallest step that does that is used, so the scale is as tight as the steps allow.
 */
export function niceScale(max: number, maxSteps: number): { top: number; step: number } {
  if (!Number.isFinite(max) || max <= 0) {
    return { top: 1, step: 1 };
  }
  const exponent = Math.floor(Math.log10(max));
  const candidates: number[] = [];
  for (let e = exponent - 1; e <= exponent + 1; e += 1) {
    for (const multiplier of STEPS) {
      candidates.push(Number((multiplier * 10 ** e).toPrecision(12)));
    }
  }
  candidates.sort((a, b) => a - b);
  // A tiny allowance keeps a top that's exactly on a step from counting one step too many.
  const stepsFor = (step: number) => Math.ceil(max / step - 1e-9);
  const step = candidates.find((candidate) => stepsFor(candidate) <= maxSteps) ?? candidates[candidates.length - 1];
  return { top: Number((stepsFor(step) * step).toPrecision(12)), step };
}

/**
 * The times of `count` labels, spread evenly from the first time to the last. Each label is the time of the real point nearest to
 * its target, so every date shown is a snapshot's own. Two targets that land on the same point give one label.
 */
export function evenlySpacedTimes(times: readonly number[], count: number): number[] {
  if (times.length === 0 || count < 1) {
    return [];
  }
  const sorted = [...times].sort((a, b) => a - b);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const chosen = new Set<number>();
  for (let k = 0; k < count; k += 1) {
    const target = count === 1 ? first : first + ((last - first) * k) / (count - 1);
    let nearest = sorted[0];
    for (const time of sorted) {
      if (Math.abs(time - target) < Math.abs(nearest - target)) {
        nearest = time;
      }
    }
    chosen.add(nearest);
  }
  return [...chosen].sort((a, b) => a - b);
}

export interface SparklineGeometry {
  /** One vertex per point, in time order. */
  vertices: { x: number; y: number }[];
  /** The USD scale, from zero up to the top. Each tick is a step above the one below it. */
  ticks: { value: number; y: number }[];
  /** The date labels. `across` is where the label's point sits, from 0 at the left to 1 at the right. */
  labels: { time: number; across: number }[];
}

/**
 * The sparkline's geometry. The horizontal position is the time, not the index of a point: snapshots come at uneven intervals, so
 * an index would stretch a busy stretch of the line and make the date labels wrong. The vertical scale starts at zero, so the
 * height of the line means the same at every point.
 */
export function sparklineGeometry(
  input: readonly SparkPoint[],
  options: { width: number; height: number; labelCount: number; maxSteps: number },
): SparklineGeometry {
  const points = input
    .filter((point) => Number.isFinite(point.time) && Number.isFinite(point.value))
    .sort((a, b) => a.time - b.time);
  if (points.length === 0) {
    return { vertices: [], ticks: [], labels: [] };
  }

  const first = points[0].time;
  const span = points[points.length - 1].time - first;
  const across = (time: number) => (span > 0 ? (time - first) / span : 0);

  const max = points.reduce((highest, point) => Math.max(highest, point.value), -Infinity);
  const { top, step } = niceScale(max, options.maxSteps);
  const yOf = (value: number) => (1 - value / top) * options.height;

  const vertices = points.map((point) => ({ x: across(point.time) * options.width, y: yOf(point.value) }));
  const steps = Math.round(top / step);
  const ticks = Array.from({ length: steps + 1 }, (_, index) => {
    const value = Number((index * step).toPrecision(12));
    return { value, y: yOf(value) };
  });
  const labels = evenlySpacedTimes(
    points.map((point) => point.time),
    options.labelCount,
  ).map((time) => ({ time, across: across(time) }));

  return { vertices, ticks, labels };
}

/**
 * A tick of the USD scale, compact: $0, $5K or $15K in English, and 0 US$, 5 mil US$ or 15 mil US$ in Spanish. It's a label for
 * reading the scale, so it's rounded. The exact values are never shown on the scale.
 */
export function formatScaleUsd(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}
