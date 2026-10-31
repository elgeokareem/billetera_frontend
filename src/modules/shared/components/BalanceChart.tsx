import "@mantine/charts/styles.css";
import { LineChart } from "@mantine/charts";
import { Paper, Text } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { type ChartPoint, gapSpans, valueDomain } from "../../assets/chart";

interface BalanceChartProps {
  /** The points in time order. A point whose y is null is a gap, drawn as a break in the line and shaded. */
  series: ChartPoint[];
  /** Describes the chart to screen readers. */
  label: string;
  /** Whether the value axis starts at zero. USD values do; an amount fits its own values. */
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
  const spans = useMemo(() => gapSpans(series), [series]);

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
          {row.value === null ? t("assets.coins.noPrice") : formatValue(row.value)}
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
      // A USD axis starts at zero, so a line's height means the same at every point. An amount axis fits its values.
      yAxisProps={{ width: 84, domain: valueDomain(startsAtZero) }}
      valueFormatter={formatTick}
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
