import "@mantine/charts/styles.css";
import { LineChart } from "@mantine/charts";
import { Paper, Stack, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  chartWindow,
  type ChartPoint,
  clipToWindow,
  fitValueAxis,
  gapSpans,
  hasEnoughHistory,
  padEmptyWindow,
  timeAxisTicks,
  valueDomain,
} from "../chart";
import { timeTickFormatter } from "../chartFormat";
import type { RangeKey } from "../chartRange";
import { maskText } from "../privacy";
import { useBalancesHidden } from "../usePrivacy";

/**
 * Fits the value axis to the data, on every chart (the Dashboard balance chart's D10). Set it to false to bring back the axis
 * from before: a USD axis from zero, and an amount axis on recharts' own scale. startsAtZero and valueDomain keep that axis
 * compiled and tested.
 */
const FIT_VALUE_AXIS = true;

/** The value axis's width in px, so the time axis's plot is the chart's width minus this. */
const VALUE_AXIS_WIDTH = 84;

/** The least px a time-axis label gets before the ticks go compact. */
const MIN_TICK_SPACING = 56;

interface BalanceChartProps {
  /** The points in time order. A point whose y is null is a gap, drawn as a break in the line and shaded. */
  series: ChartPoint[];
  /** Describes the chart to screen readers. */
  label: string;
  /**
   * Whether the value axis starts at zero. It applies only when the fitted axis is off or has no point to fit: a USD value starts
   * at zero, and an amount fits its own values.
   */
  startsAtZero: boolean;
  /** The range the chips show: it sets the window's length and the time format of its ticks. */
  range: RangeKey;
  /** The history response's `to`, where the window ends. */
  windowEnd: string;
  /** When the response arrived, the window end to fall back on when `windowEnd` can't be parsed. */
  fetchedAt: number;
  /** Formats a point's exact value, which is the API's decimal string, for the tooltip. */
  formatValue: (value: string) => string;
  /** Formats a tick of the value axis, a chart coordinate. */
  formatTick: (value: number) => string;
  /** Formats the full time of the point under the pointer. */
  formatTooltipTime: (time: number) => string;
}

interface ReadoutProps {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
  label?: unknown;
}

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
}

/**
 * A line chart of a balance over time, on @mantine/charts. The time axis spans the selected window, which ends at the response's
 * `to`, with ticks on local clock boundaries: hours for 24h, midnights for the day ranges and month starts for a year. Points
 * outside the window are dropped, and the newest point sits at the right edge, with a little padding so its dot isn't cut off.
 *
 * A point with no price is a gap: the line breaks there, the stretch is shaded, and the tooltip says No price. A priced point
 * with no line beside it is drawn as a dot, so it can't disappear. With fewer than two points in the window the chart still
 * draws its axis, and a caption under it says Not enough history yet; with none, the empty window is drawn the same way. The
 * values in the tooltip are the API's strings, so no money goes through a number here.
 *
 * The value axis fits the data, unless FIT_VALUE_AXIS is off (see there). While balances are hidden, the value axis and the
 * tooltip's value show the mask. The line, the gaps and the time axis stay, and the axis keeps its width, so the plot doesn't
 * move when the value is hidden or shown.
 */
export default function BalanceChart({
  series,
  label,
  startsAtZero,
  range,
  windowEnd,
  fetchedAt,
  formatValue,
  formatTick,
  formatTooltipTime,
}: BalanceChartProps) {
  const { t } = useTranslation();
  const hidden = useBalancesHidden();
  const window = useMemo(() => chartWindow(range, windowEnd, fetchedAt), [range, windowEnd, fetchedAt]);
  // Everything the chart draws comes from the points inside the window. The padded array is only what LineChart lays out, so
  // the tooltip and the dots still read the real points, and the empty window's null edges add no dot or shading.
  const shown = useMemo(() => clipToWindow(series, window), [series, window]);
  const data = useMemo(() => padEmptyWindow(shown, window), [shown, window]);
  const spans = useMemo(() => gapSpans(shown), [shown]);
  const axis = useMemo(() => (FIT_VALUE_AXIS ? fitValueAxis(shown) : null), [shown]);
  const { ref, width } = useElementSize();
  const regularTicks = useMemo(() => timeAxisTicks(range, window.start, window.end), [range, window]);
  // A width of 0 means the wrapper isn't measured yet: the regular ticks are used, and the next render compacts them if needed.
  const compact =
    width > 0 && regularTicks.length > 0 && (width - VALUE_AXIS_WIDTH) / regularTicks.length < MIN_TICK_SPACING;
  const ticks = useMemo(
    () => (compact ? timeAxisTicks(range, window.start, window.end, true) : regularTicks),
    [compact, range, regularTicks, window.end, window.start],
  );

  // A tooltip for the point under the pointer. Recharts leaves a point with no value out of its payload, so the point is found
  // by its time instead, which the axis gives. The value is the point's own string.
  const readout = ({ active, label: time }: ReadoutProps) => {
    const row = active && time !== undefined ? shown.find((point) => point.time === Number(time)) : undefined;
    if (!row) {
      return null;
    }
    return (
      <Paper bg="dark.5" radius="md" p="xs" shadow="md">
        <Text size="xs" c="dimmed">
          {formatTooltipTime(Number(time))}
        </Text>
        <Text size="sm" fw={600}>
          {row.value === null ? t("assets.coins.noPrice") : maskText(formatValue(row.value), hidden)}
        </Text>
      </Paper>
    );
  };

  // The line is drawn between neighbours that have a price. A priced point with none is a single point, so it gets a dot.
  const dot = ({ cx, cy, index }: DotProps) => {
    const i = index ?? -1;
    const isolated =
      cx !== undefined &&
      cy !== undefined &&
      shown[i]?.y != null &&
      shown[i - 1]?.y == null &&
      shown[i + 1]?.y == null;
    return isolated ? <circle cx={cx} cy={cy} r={3} fill="var(--mantine-color-accent-6)" /> : <g />;
  };

  return (
    <Stack gap="xs">
      <div ref={ref}>
        <LineChart
          h={260}
          data={data}
          dataKey="time"
          series={[{ name: "y", color: "accent.6" }]}
          curveType="linear"
          connectNulls={false}
          lineProps={{ dot }}
          xAxisProps={{
            type: "number",
            scale: "time",
            // The domain is the selected window, not the data: every range has its own width, and the padded points lay it out
            // when there are no points. Overflow is clipped, and the ticks are given whole with interval 0.
            domain: [window.start, window.end],
            allowDataOverflow: true,
            ticks,
            interval: 0,
            // A dot at the end sits on the axis; without the right padding half of it is cut off.
            padding: { left: 0, right: 8 },
            tickFormatter: (value) => timeTickFormatter(range)(Number(value)),
          }}
          // The fitted axis spans the data, on round ticks. Without one (FIT_VALUE_AXIS off, or no point to fit), a USD axis
          // starts at zero, so a line's height means the same at every point, and an amount axis fits its values.
          yAxisProps={{
            width: VALUE_AXIS_WIDTH,
            ...(axis ? { domain: axis.domain, ticks: axis.ticks } : { domain: valueDomain(startsAtZero) }),
          }}
          // The value axis's labels. The default tooltip uses the same formatter, but the custom one above replaces it.
          valueFormatter={(value) => maskText(formatTick(value), hidden)}
          referenceAreas={spans.map((span) => ({
            x1: span.from,
            x2: span.to,
            color: "dark.4",
            fillOpacity: 0.35,
            strokeOpacity: 0,
            // The gap says what it is in the chart itself, since the tooltip can't reach a point with no price.
            label: { value: t("assets.coins.noPrice"), fill: "var(--mantine-color-dark-1)", fontSize: 11 },
          }))}
          tooltipProps={{ content: readout }}
          accessibilityLayer={false}
          role="img"
          aria-label={label}
        />
      </div>
      {!hasEnoughHistory(shown) && (
        <Stack gap={2}>
          <Text fw={600} size="sm">
            {t("chart.notEnough")}
          </Text>
          <Text size="sm" c="dimmed">
            {t("chart.notEnoughBody")}
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
