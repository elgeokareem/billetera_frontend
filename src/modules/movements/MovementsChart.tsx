import { Button, Collapse, Group, Paper, SegmentedControl, Stack, Text } from "@mantine/core";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCategories } from "../categories/hooks";
import { notCountingCaption, notCountingNames } from "../categories/counting";
import { SectionError, SectionSkeleton } from "../dashboard/SectionStates";
import { NO_CATEGORY_COLOR, OTHER_CATEGORY_COLOR, SEGMENT_COLORS } from "../shared/categoryColors";
import { Sensitive } from "../shared/components/Sensitive";
import { browserTimeZone } from "../shared/dateRange";
import { formatUsd } from "../shared/format";
import { useMotionDuration } from "../shared/motion";
import { loadPref, savePref } from "../shared/prefs";
import { INK_ON_ACCENT } from "../shared/theme";
import type { TotalsQuery } from "./api";
import {
  barRange,
  CHART_NO_CATEGORY_KEY,
  CHART_OTHER_KEY,
  CHART_TOTAL_KEY,
  type ChartMode,
  chartPeriod,
  chartRange,
  chartRows,
  type ChartSummary,
  chartSummary,
  chartTotalsQuery,
} from "./chart";
import { useMovementTotals } from "./hooks";
import type { BarSeriesView } from "./MovementsBarChart";
import type { PieSliceView } from "./MovementsPieChart";
import type { MovementsSearch } from "./search";

// The chart's library loads with the first chart, so the rest of the page doesn't wait for it.
const MovementsBarChart = lazy(() => import("./MovementsBarChart"));
const MovementsPieChart = lazy(() => import("./MovementsPieChart"));

/** How the chart draws the same filtered range: one bar per period, or one slice per category. */
type ChartType = "bars" | "pie";

/** The saved visibility of the chart, per viewer. Missing or any other value reads as shown. */
const CHART_STORAGE_KEY = "billetera.movementsChart";
const CHART_STORAGE_VALUES = ["shown", "hidden"] as const;
/** The chart body's id, which the Hide/Show button's aria-controls names. */
const CHART_BODY_ID = "movements-chart";

interface MovementsChartProps {
  search: MovementsSearch;
  now: Date;
  /** Turns a picked bar into the date filter of the page. */
  onRange: (range: { from: string; to: string }) => void;
}

/**
 * How much money moved in each period of the filters, either as one total or split by category. It reads the same filters as
 * the list, and picks a bar to narrow the dates to it. A chart-type toggle draws the same range as a pie of the direction's
 * categories, which is read-only. Hide chart saves the choice, and while hidden no totals request is made. With no date filter
 * the chart covers the last 12 months and says so; the list below keeps its own range.
 */
export function MovementsChart({ search, now, onRange }: MovementsChartProps) {
  const { t } = useTranslation();
  const motion = useMotionDuration();
  const [mode, setMode] = useState<ChartMode>("total");
  // The chart type is a viewer's temporary choice, like the mode: not saved, so a reload starts on the bars.
  const [chartType, setChartType] = useState<ChartType>("bars");
  const [shown, setShown] = useState(
    () => loadPref(CHART_STORAGE_KEY, CHART_STORAGE_VALUES, "shown") === "shown",
  );
  const direction = search.direction === "in" ? "in" : "out";
  // The pie is always by category, so it needs the grouped response whatever the saved mode is.
  const needsGrouped = mode === "category" || chartType === "pie";
  const period = useMemo(() => chartPeriod(search, now), [search, now]);
  const range = useMemo(() => chartRange(search, now), [search, now]);
  const timeZone = useMemo(() => browserTimeZone(), []);

  const totalsQuery = useMemo(
    () => chartTotalsQuery(search, range, period, timeZone),
    [search, range, period, timeZone],
  );
  const summary = useMovementTotals(totalsQuery, { enabled: shown });
  const groupedQuery = useMemo<TotalsQuery>(
    () => ({ ...totalsQuery, group_by: "category" }),
    [totalsQuery],
  );
  const grouped = useMovementTotals(groupedQuery, { enabled: shown && needsGrouped });

  const summaryInfo = useMemo(
    () => (summary.data ? chartSummary(summary.data) : null),
    [summary.data],
  );
  const barTotals = mode === "total" ? summary.data : grouped.data;
  const bars = useMemo(
    () => (barTotals ? chartRows(barTotals.assets, direction, mode) : null),
    [barTotals, direction, mode],
  );
  // The pie reads the same grouped rows the By category bars do, so both views split the range identically.
  const pieRows = useMemo(
    () => (grouped.data ? chartRows(grouped.data.assets, direction, "category") : null),
    [grouped.data, direction],
  );
  // The rows the shown chart type draws. Null while its response is still missing.
  const rows = chartType === "pie" ? pieRows : bars;

  const categories = useCategories();
  const names = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category.name])),
    [categories.data],
  );
  // The names the numbers leave out. They're names, not amounts, so Hide Balances doesn't mask them. Nothing shows
  // while the names are loading or failed.
  const notCounting = useMemo(
    () =>
      categories.isSuccess
        ? notCountingCaption(notCountingNames(categories.data, search), t)
        : null,
    [categories.data, categories.isSuccess, search, t],
  );
  const labelOf = useCallback(
    (key: string) => {
      if (key === CHART_TOTAL_KEY) {
        return t("movements.chart.total");
      }
      if (key === CHART_OTHER_KEY) {
        return t("movements.chart.otherCategories");
      }
      if (key === CHART_NO_CATEGORY_KEY) {
        return t("dashboard.spending.noCategory");
      }
      return names.get(Number(key)) ?? t("movements.categoryUnknown");
    },
    [names, t],
  );
  // The colour of a series, shared by the bars and the pie so a category keeps its tone in both views.
  const colorOf = useCallback(
    (key: string, index: number) =>
      key === CHART_OTHER_KEY
        ? OTHER_CATEGORY_COLOR
        : key === CHART_NO_CATEGORY_KEY
          ? NO_CATEGORY_COLOR
          : SEGMENT_COLORS[index % SEGMENT_COLORS.length],
    [],
  );
  const series = useMemo<BarSeriesView[]>(
    () =>
      (bars?.series ?? []).map((item, index) => ({
        key: item.key,
        label: labelOf(item.key),
        color: colorOf(item.key, index),
      })),
    [bars, labelOf, colorOf],
  );
  // Every pie cell carries the exact decimal string, so the tooltip never formats the rounded slice size.
  const cells = useMemo<PieSliceView[]>(
    () =>
      (pieRows?.series ?? []).flatMap((item, index) =>
        item.total === null
          ? []
          : [
              {
                key: item.key,
                name: labelOf(item.key),
                value: Number(item.total),
                color: colorOf(item.key, index),
                amount: item.total,
              },
            ],
      ),
    [pieRows, labelOf, colorOf],
  );

  const pick = useCallback(
    (periodStart: string) => {
      onRange(barRange(periodStart, period, { from: search.from, to: search.to }));
    },
    [onRange, period, search.from, search.to],
  );

  // The choice is saved as it changes, so a reload shows the chart as the viewer left it.
  function toggleShown() {
    const next = !shown;
    setShown(next);
    savePref(CHART_STORAGE_KEY, next ? "shown" : "hidden");
  }

  // No movements means the list's own empty state speaks; the chart would only draw its axes over nothing.
  if (summaryInfo !== null && summaryInfo.count === 0) {
    return null;
  }

  // The pie has no periods, so its title names the categories; the bars keep the period title.
  const title = t(`movements.chart.title.${direction}.${chartType === "pie" ? "pie" : period}`);
  let body;
  if (summary.isPending || (needsGrouped && grouped.isPending)) {
    body = <SectionSkeleton lines={4} />;
  } else if (summary.isError || (needsGrouped && grouped.isError)) {
    body = (
      <SectionError
        error={summary.isError ? summary.error : grouped.error}
        onRetry={() => {
          void summary.refetch();
          if (needsGrouped) {
            void grouped.refetch();
          }
        }}
      />
    );
  } else if (summaryInfo === null || rows === null) {
    body = <SectionSkeleton lines={4} />;
  } else {
    body = (
      <Stack gap="md">
        <SummaryLine summary={summaryInfo} filter={search.direction} status={search.status} />
        {summaryInfo.unpriced[direction] > 0 && (
          <Text size="sm" c="dimmed">
            {t("movements.chart.unpriced", { count: summaryInfo.unpriced[direction] })}
          </Text>
        )}
        {rows.rows.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t(`movements.chart.emptyDirection.${direction}`)}
          </Text>
        ) : (
          <Suspense fallback={<SectionSkeleton lines={4} />}>
            {chartType === "pie" ? (
              <MovementsPieChart cells={cells} label={title} />
            ) : (
              <MovementsBarChart
                buckets={rows.rows}
                series={series}
                mode={mode}
                period={period}
                label={title}
                onPick={pick}
              />
            )}
          </Suspense>
        )}
      </Stack>
    );
  }

  return (
    <Paper bg="dark.6" radius={12} p={{ base: 20, sm: 24 }}>
      <Stack gap="md">
        <Group justify="space-between" align="center" gap="md" wrap="wrap">
          <Group gap="md" align="center" wrap="wrap">
            <div>
              <Text component="h2" fw={600} fz={16} m={0}>
                {title}
              </Text>
              {range.capped && (
                <Text size="xs" c="dimmed">
                  {t("movements.chart.last12Months")}
                </Text>
              )}
              {notCounting && (
                <Text size="xs" c="dimmed">
                  {notCounting}
                </Text>
              )}
            </div>
            <SegmentedControl
              mih={44}
              aria-label={t("movements.chart.chartType")}
              value={chartType}
              onChange={(value) => setChartType(value === "pie" ? "pie" : "bars")}
              data={[
                { label: t("movements.chart.bars"), value: "bars" },
                { label: t("movements.chart.pie"), value: "pie" },
              ]}
              // The accent marks this control apart from the mode control, whose selected segment keeps the default.
              styles={{
                root: {
                  "--sc-color": "var(--mantine-color-accent-6)",
                  "--sc-label-color": INK_ON_ACCENT,
                },
                label: { display: "flex", alignItems: "center", justifyContent: "center" },
              }}
            />
          </Group>
          <Button
            variant="subtle"
            mih={44}
            aria-expanded={shown}
            aria-controls={CHART_BODY_ID}
            onClick={toggleShown}
          >
            {shown ? t("movements.chart.hide") : t("movements.chart.show")}
          </Button>
        </Group>
        <Collapse expanded={shown} transitionDuration={motion} transitionTimingFunction="ease">
          <Stack gap="md" id={CHART_BODY_ID}>
            {/* The pie is always by category, so the mode control only makes sense over the bars. */}
            {chartType === "bars" && (
              <SegmentedControl
                w="fit-content"
                mih={44}
                value={mode}
                onChange={(value) => setMode(value === "category" ? "category" : "total")}
                data={[
                  { label: t("movements.chart.total"), value: "total" },
                  { label: t("movements.chart.byCategory"), value: "category" },
                ]}
                styles={{ label: { display: "flex", alignItems: "center", justifyContent: "center" } }}
              />
            )}
            {body}
          </Stack>
        </Collapse>
      </Stack>
    </Paper>
  );
}

/**
 * The amounts and the count above the bars. With a direction filter only that amount shows. Without a status filter the
 * totals are completed movements only, so the count says so (SPEC Q1).
 */
function SummaryLine({
  summary,
  filter,
  status,
}: {
  summary: ChartSummary;
  filter: MovementsSearch["direction"];
  status: MovementsSearch["status"];
}) {
  const { t } = useTranslation();
  const showOut = filter !== "in";
  const showIn = filter !== "out";
  const countKey = status ? "movements.chart.summaryCount" : "movements.chart.summaryCompleted";

  return (
    <Text size="sm" c="dimmed">
      {showOut && (
        <>
          {t("movements.chart.out")} <Sensitive>{formatUsd(summary.out)}</Sensitive> ·{" "}
        </>
      )}
      {showIn && (
        <>
          {t("movements.chart.in")} <Sensitive>{formatUsd(summary.in)}</Sensitive> ·{" "}
        </>
      )}
      {t(countKey, { count: summary.count })}
    </Text>
  );
}
