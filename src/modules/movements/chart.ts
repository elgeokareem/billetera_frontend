import { SEGMENT_COLORS } from "../shared/categoryColors";
import { apiInstant } from "../shared/dateRange";
import { compare, sum, sumKnown } from "../shared/money";
import type { AssetTotalRow, MovementTotals } from "./types";
import { movementCount } from "./spending";
import type { MovementsSearch } from "./search";

/** A bar's width in time: one local day, one local week starting Monday, or one local month. */
export type ChartPeriod = "day" | "week" | "month";

/** Total sums one series per period; category stacks one series per category. */
export type ChartMode = "total" | "category";

/** The direction a chart follows: money in, or money out. */
export type ChartDirection = "in" | "out";

/** The series key of Total mode. It can't collide with a category, since those are numeric text. */
export const CHART_TOTAL_KEY = "total";
/** The series key of the categories after the largest ones, which share one bar segment. */
export const CHART_OTHER_KEY = "other";
/** The series key of movements with no category, which is always the last segment. */
export const CHART_NO_CATEGORY_KEY = "none";

/** The number of named categories that keep their own colour. The rest merge into one series. */
const NAMED_SERIES_LIMIT = SEGMENT_COLORS.length;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The period the bars of a chart group by, from the date filter in the search.
 *
 * Both ends give the calendar days they span, rounded so the hour a DST change adds or removes doesn't move a boundary: a day
 * up to 31 days, a week up to 183, a month beyond. Only from spans from that instant to now. With no from, there's no span to
 * measure, so the bars are monthly.
 */
export function chartPeriod(search: Pick<MovementsSearch, "from" | "to">, now: Date): ChartPeriod {
  if (!search.from) {
    return "month";
  }
  const from = Date.parse(search.from);
  const to = search.to ? Date.parse(search.to) : now.getTime();
  const days = Math.round((to - from) / DAY_MS);
  if (days <= 31) {
    return "day";
  }
  return days <= 183 ? "week" : "month";
}

export interface ChartRange {
  /** The start of the totals query, as an API instant. Missing means no lower bound. */
  from?: string;
  /** The end of the totals query, as an API instant. Missing means the range is open. */
  to?: string;
  /** Whether the range is the last 12 months the chart adds when the search has no date filter (SPEC Q3). */
  capped: boolean;
}

/**
 * The range of the totals query. The search's own dates are kept when it has them. With no date filter at all, the chart
 * covers the last 12 months, monthly, so a long history can't fill it with years of bars; the list itself doesn't change.
 */
export function chartRange(search: Pick<MovementsSearch, "from" | "to">, now: Date): ChartRange {
  if (!search.from && !search.to) {
    return {
      from: apiInstant(new Date(now.getFullYear(), now.getMonth() - 11, 1)),
      capped: true,
    };
  }
  return {
    from: search.from ? apiInstant(new Date(search.from)) : undefined,
    to: search.to ? apiInstant(new Date(search.to)) : undefined,
    capped: false,
  };
}

/** One period of the chart. Values are the API's decimal strings, keyed by series. */
export interface ChartBucket {
  periodStart: string;
  values: Record<string, string>;
  /** The sum of every series in this period, with full precision. */
  total: string;
}

/** A series of the chart, with its total over the whole range. Null when none of its rows is priced. */
export interface ChartSeriesTotal {
  key: string;
  total: string | null;
}

export interface ChartRows {
  /** In draw order: the largest categories first, then Other categories, then no category last. */
  series: ChartSeriesTotal[];
  /** Ascending by period. Periods with no priced movement are absent. */
  rows: ChartBucket[];
}

function categoryKey(id: number | null | undefined) {
  return id == null ? CHART_NO_CATEGORY_KEY : String(id);
}

function ascendingPeriods(a: [string, unknown], b: [string, unknown]) {
  return Date.parse(a[0]) - Date.parse(b[0]);
}

/**
 * The bars of one direction, from the asset rows of a totals response.
 *
 * Total mode sums every row of a period into one value. By category mode keeps a value per category, sums the categories over
 * the range, and draws the four largest in their own colour; the rest merge into Other categories, and no category stays last.
 * A row with no usd_value adds no value but is still counted by the API's unpriced_count, which the panel says separately.
 */
export function chartRows(
  rows: readonly AssetTotalRow[],
  direction: ChartDirection,
  mode: ChartMode,
): ChartRows {
  const shown = rows.filter((row) => row.direction === direction && row.period_start);
  const periods = new Map<string, Map<string, (string | null)[]>>();
  const categories = new Map<string, (string | null)[]>();

  for (const row of shown) {
    const periodStart = row.period_start as string;
    const key = mode === "category" ? categoryKey(row.category_id) : CHART_TOTAL_KEY;
    const period = periods.get(periodStart) ?? new Map<string, (string | null)[]>();
    const values = period.get(key) ?? [];
    values.push(row.usd_value);
    period.set(key, values);
    periods.set(periodStart, period);

    if (mode === "category") {
      const totals = categories.get(key) ?? [];
      totals.push(row.usd_value);
      categories.set(key, totals);
    }
  }

  if (mode === "total") {
    const buckets = [...periods]
      .sort(ascendingPeriods)
      .flatMap(([periodStart, values]) => {
        const total = sumKnown(values.get(CHART_TOTAL_KEY) ?? []);
        return total === null ? [] : [{ periodStart, values: { [CHART_TOTAL_KEY]: total }, total }];
      });
    return {
      series: [{ key: CHART_TOTAL_KEY, total: sumKnown(shown.map((row) => row.usd_value)) }],
      rows: buckets,
    };
  }

  // The categories with a priced row, largest first, breaking ties by ID. No category is kept apart, so it can go last.
  const named = [...categories]
    .flatMap(([key, values]) => {
      const total = sumKnown(values);
      return key === CHART_NO_CATEGORY_KEY || total === null ? [] : [{ key, total }];
    })
    .sort((a, b) => compare(b.total, a.total) || Number(a.key) - Number(b.key));
  const kept = named.slice(0, NAMED_SERIES_LIMIT);
  const merged = named.slice(NAMED_SERIES_LIMIT);

  const groups: { key: string; sources: string[]; total: string | null }[] = kept.map((group) => ({
    key: group.key,
    sources: [group.key],
    total: group.total,
  }));
  if (merged.length > 0) {
    groups.push({
      key: CHART_OTHER_KEY,
      sources: merged.map((group) => group.key),
      total: sum(merged.map((group) => group.total)),
    });
  }
  const noCategoryTotal = sumKnown(categories.get(CHART_NO_CATEGORY_KEY) ?? []);
  if (noCategoryTotal !== null) {
    groups.push({ key: CHART_NO_CATEGORY_KEY, sources: [CHART_NO_CATEGORY_KEY], total: noCategoryTotal });
  }

  const buckets = [...periods]
    .sort(ascendingPeriods)
    .flatMap(([periodStart, values]) => {
      const bucketValues: Record<string, string> = {};
      const all: (string | null)[] = [];
      for (const group of groups) {
        const parts = group.sources.flatMap((source) => values.get(source) ?? []);
        bucketValues[group.key] = sum(parts);
        all.push(...parts);
      }
      const total = sumKnown(all);
      return total === null ? [] : [{ periodStart, values: bucketValues, total }];
    });

  return {
    series: groups.map((group) => ({ key: group.key, total: group.total })),
    rows: buckets,
  };
}

export interface ChartSummary {
  out: string | null;
  in: string | null;
  /** The number of movements in the response, which is completed ones unless the search has a status filter. */
  count: number;
  unpriced: { out: number; in: number };
}

/**
 * The summary line's amounts and count, from the ungrouped totals response. Out and In are the priced rows of that direction;
 * a direction with no priced row is null, so the line can leave it out instead of showing a zero. The count uses the asset
 * rows once, as movementCount documents, so a grouped response would over-count and isn't passed here.
 */
export function chartSummary(totals: Pick<MovementTotals, "assets">): ChartSummary {
  const out = totals.assets.filter((row) => row.direction === "out");
  const incoming = totals.assets.filter((row) => row.direction === "in");
  return {
    out: sumKnown(out.map((row) => row.usd_value)),
    in: sumKnown(incoming.map((row) => row.usd_value)),
    count: movementCount(totals),
    unpriced: {
      out: out.reduce((count, row) => count + row.unpriced_count, 0),
      in: incoming.reduce((count, row) => count + row.unpriced_count, 0),
    },
  };
}

/**
 * The date range a bar covers, as API instants. Its start is the period's own start; its end is the next local day, the next
 * local Monday (+7 local days) or the first of the next local month, built with local dates so a DST change keeps the wall
 * clock. The range is clamped to the search's own from and to, so picking a bar can only narrow the filter, never widen it.
 */
export function barRange(
  periodStart: string,
  period: ChartPeriod,
  current: Pick<MovementsSearch, "from" | "to">,
): { from: string; to: string } {
  const start = new Date(periodStart);
  let end: Date;
  if (period === "day") {
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  } else if (period === "week") {
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  } else {
    end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  }

  let from = start;
  let to = end;
  if (current.from) {
    const bound = new Date(current.from);
    if (bound.getTime() > from.getTime()) {
      from = bound;
    }
  }
  if (current.to) {
    const bound = new Date(current.to);
    if (bound.getTime() < to.getTime()) {
      to = bound;
    }
  }
  return { from: apiInstant(from), to: apiInstant(to) };
}
