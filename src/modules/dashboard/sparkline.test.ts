import { describe, expect, it } from "vitest";
import {
  evenlySpacedTimes,
  formatScaleUsd,
  niceScale,
  type SparkPoint,
  sparklineGeometry,
} from "./sparkline";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T0 = Date.UTC(2026, 9, 1);
const options = { width: 400, height: 84, labelCount: 3, maxSteps: 3 };

// Intl writes some spaces as no-break spaces, so a comparison with plain text needs them turned into spaces.
const plain = (text: string) => text.replace(/[\u00a0\u202f]/g, " ");

function point(hours: number, value: number): SparkPoint {
  return { time: T0 + hours * HOUR, value };
}

describe("niceScale", () => {
  it("starts at zero and tops out on a whole number of steps", () => {
    expect(niceScale(12546.78, 3)).toEqual({ top: 15000, step: 5000 });
    expect(niceScale(6412.3, 3)).toEqual({ top: 7500, step: 2500 });
    expect(niceScale(9000, 3)).toEqual({ top: 10000, step: 5000 });
    expect(niceScale(12, 3)).toEqual({ top: 15, step: 5 });
  });

  it("never tops out below the largest value, and never uses more steps than allowed", () => {
    for (const max of [0.07, 0.3, 1, 3.1, 10.1, 99, 101, 1234.5, 5e5, 2.5e7]) {
      const { top, step } = niceScale(max, 3);
      expect(top, `top for ${max}`).toBeGreaterThanOrEqual(max);
      expect(top - max, `headroom for ${max}`).toBeLessThan(step);
      expect(Math.round(top / step), `steps for ${max}`).toBeLessThanOrEqual(3);
    }
  });

  it("uses a nice step: one, two, two and a half, or five times a power of ten", () => {
    for (const max of [0.07, 3.1, 1234.5, 2.5e7]) {
      const { step } = niceScale(max, 3);
      const mantissa = Number((step / 10 ** Math.floor(Math.log10(step))).toFixed(9));
      expect([1, 2, 2.5, 5], `step for ${max}`).toContain(mantissa);
    }
  });

  it("gives a scale of zero to one when no value is above zero", () => {
    expect(niceScale(0, 3)).toEqual({ top: 1, step: 1 });
    expect(niceScale(Number.NaN, 3)).toEqual({ top: 1, step: 1 });
  });
});

describe("evenlySpacedTimes", () => {
  it("labels the start, the middle and the end", () => {
    const times = Array.from({ length: 11 }, (_, day) => T0 + day * DAY);
    expect(evenlySpacedTimes(times, 3)).toEqual([T0, T0 + 5 * DAY, T0 + 10 * DAY]);
  });

  it("takes the real point nearest to each target, so a label is a snapshot's own time", () => {
    // The middle target is 5 days in. The nearest point is at 2 days, and that's the date shown.
    const times = [0, 1, 2, 10].map((day) => T0 + day * DAY);
    expect(evenlySpacedTimes(times, 3)).toEqual([T0, T0 + 2 * DAY, T0 + 10 * DAY]);
  });

  it("gives one label to a point that two targets share", () => {
    expect(evenlySpacedTimes([T0, T0 + 100 * DAY], 3)).toEqual([T0, T0 + 100 * DAY]);
  });

  it("sorts its input, and handles one point and no points", () => {
    expect(evenlySpacedTimes([T0 + DAY, T0], 2)).toEqual([T0, T0 + DAY]);
    expect(evenlySpacedTimes([T0], 3)).toEqual([T0]);
    expect(evenlySpacedTimes([], 3)).toEqual([]);
  });
});

describe("sparklineGeometry", () => {
  it("places each point by its time, not its index, so a busy stretch doesn't stretch the axis", () => {
    // Three points an hour apart, then one a day later. The first three are within 2 hours of 26, so they sit near the left.
    const { vertices } = sparklineGeometry([point(0, 1), point(1, 1), point(2, 1), point(26, 1)], options);
    expect(vertices[1].x).toBeCloseTo(400 / 26);
    expect(vertices[2].x).toBeCloseTo((400 * 2) / 26);
    expect(vertices[3].x).toBe(400);
  });

  it("starts the USD scale at zero, so a point's height means the same everywhere", () => {
    const { vertices, ticks } = sparklineGeometry([point(0, 6000), point(1, 9000), point(2, 12000)], options);
    expect(ticks.map((tick) => tick.value)).toEqual([0, 5000, 10000, 15000]);
    expect(ticks[0].y).toBe(84);
    expect(ticks[3].y).toBe(0);
    expect(vertices[0].y).toBeCloseTo(84 * (1 - 6000 / 15000));
    expect(vertices[2].y).toBeCloseTo(84 * (1 - 12000 / 15000));
  });

  it("draws a balance of zero on the bottom edge", () => {
    const { vertices } = sparklineGeometry([point(0, 0), point(5, 0)], options);
    expect(vertices.map((vertex) => vertex.y)).toEqual([84, 84]);
  });

  it("sorts the points by time, and leaves out any with a value that isn't a number", () => {
    const { vertices } = sparklineGeometry(
      [point(2, 3), { time: Number.NaN, value: 1 }, point(0, 1), { time: T0 + HOUR, value: Number.NaN }, point(1, 2)],
      options,
    );
    expect(vertices.map((vertex) => vertex.x)).toEqual([0, 200, 400]);
  });

  it("labels the start, the middle and the end, each at its real point", () => {
    const series = Array.from({ length: 11 }, (_, hour) => point(hour, 1));
    const { labels } = sparklineGeometry(series, options);
    expect(labels.map((label) => label.time)).toEqual([T0, T0 + 5 * HOUR, T0 + 10 * HOUR]);
    expect(labels.map((label) => label.across)).toEqual([0, 0.5, 1]);
  });

  it("returns nothing for no points", () => {
    expect(sparklineGeometry([], options)).toEqual({ vertices: [], ticks: [], labels: [] });
  });

  it("puts every point at the left edge when they share one time, with no division by zero", () => {
    const { vertices, labels } = sparklineGeometry([point(3, 1), point(3, 2)], options);
    expect(vertices.map((vertex) => vertex.x)).toEqual([0, 0]);
    expect(labels.map((label) => label.across)).toEqual([0]);
  });
});

describe("formatScaleUsd", () => {
  it("writes the scale compactly in English", () => {
    expect([0, 500, 2500, 15000].map((value) => formatScaleUsd(value, "en"))).toEqual(["$0", "$500", "$2.5K", "$15K"]);
  });

  it("writes the scale compactly in Spanish", () => {
    expect([0, 2500, 15000].map((value) => plain(formatScaleUsd(value, "es")))).toEqual(["0 US$", "2,5 mil US$", "15 mil US$"]);
  });
});
