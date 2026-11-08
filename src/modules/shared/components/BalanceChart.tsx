import "@mantine/charts/styles.css";
import { LineChart } from "@mantine/charts";
import { Paper, Text } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { type ChartPoint, fitValueAxis, gapSpans, valueDomain } from "../chart";
import { maskText } from "../privacy";
import { useBalancesHidden } from "../usePrivacy";

/**
 * Fits the value axis to the data, on every chart (the Dashboard balance chart's D10). Set it to false to bring back the axis
 * from before: a USD axis from zero, and an amount axis on recharts' own scale. startsAtZero and valueDomain keep that axis
 * compiled and tested.
 */
const FIT_VALUE_AXIS = true;

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
  /** Formats a point's exact value, which is the API's decimal string, for the tooltip. */
  formatValue: (value: string) => string;
  /** Formats a tick of the value axis, a chart coordinate. */
  formatTick: (value: number) => string;
  /** Formats a tick of the time axis. */
  formatTime: (time: number) => string;
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
 * A line chart of a balance over time, on @mantine/charts. A point with no price is a gap: the line breaks there, the stretch is
 * shaded, and the tooltip says No price. A priced point with no line beside it is drawn as a dot, so it can't disappear. The
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
  formatValue,
  formatTick,
  formatTime,
  formatTooltipTime,
}: BalanceChartProps) {
  const { t } = useTranslation();
  const hidden = useBalancesHidden();
  const spans = useMemo(() => gapSpans(series), [series]);
  const axis = useMemo(() => (FIT_VALUE_AXIS ? fitValueAxis(series) : null), [series]);

  // A tooltip for the point under the pointer. Recharts leaves a point with no value out of its payload, so the point is found
  // by its time instead, which the axis gives. The value is the point's own string.
  const readout = ({ active, label: time }: ReadoutProps) => {
    const row = active && time !== undefined ? series.find((point) => point.time === Number(time)) : undefined;
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
      series[i]?.y != null &&
      series[i - 1]?.y == null &&
      series[i + 1]?.y == null;
    return isolated ? <circle cx={cx} cy={cy} r={3} fill="var(--mantine-color-accent-6)" /> : <g />;
  };

  return (
    <LineChart
      h={260}
      data={series}
      dataKey="time"
      series={[{ name: "y", color: "accent.6" }]}
      curveType="linear"
      connectNulls={false}
      lineProps={{ dot }}
      xAxisProps={{
        type: "number",
        scale: "time",
        domain: ["dataMin", "dataMax"],
        tickFormatter: (value) => formatTime(Number(value)),
      }}
      // The fitted axis spans the data, on round ticks. Without one (FIT_VALUE_AXIS off, or no point to fit), a USD axis starts
      // at zero, so a line's height means the same at every point, and an amount axis fits its values. The width is the same.
      yAxisProps={{
        width: 84,
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
  );
}
