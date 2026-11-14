import "@mantine/charts/styles.css";
import { BarChart } from "@mantine/charts";
import { Box, Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { formatDate, formatMonth, formatShortDate, formatUsd } from "../shared/format";
import { formatUsdTick } from "../shared/chartFormat";
import { maskText } from "../shared/privacy";
import { useBalancesHidden } from "../shared/usePrivacy";
import type { ChartBucket, ChartMode, ChartPeriod } from "./chart";

/** A bar series as the chart draws it: its data key, its label and its colour. */
export interface BarSeriesView {
  key: string;
  label: string;
  color: string;
}

interface MovementsBarChartProps {
  buckets: ChartBucket[];
  series: BarSeriesView[];
  mode: ChartMode;
  period: ChartPeriod;
  /** Describes the chart to screen readers. */
  label: string;
  /** The start of the picked bar, which the page turns into the date filter. */
  onPick: (periodStart: string) => void;
}

interface ReadoutProps {
  active?: boolean;
  label?: unknown;
}

/**
 * The value axis's width in px. It holds the mask while balances are hidden, so the plot doesn't move when they're shown.
 */
const VALUE_AXIS_WIDTH = 84;

/** The x tick of a period: a short date for a day or a week, the month's name for a month. */
function axisLabel(period: ChartPeriod, periodStart: string) {
  return period === "month" ? formatMonth(new Date(periodStart)) : formatShortDate(periodStart);
}

/**
 * The movements chart's bars, on @mantine/charts. Total mode draws one bar per period; By category stacks the categories,
 * largest first and no category last. The bar values pass through Number only for their height: the tooltip formats the API's
 * exact strings. While balances are hidden, the value axis and the tooltip values show the mask, and the bars stay, since
 * their height can't be read as an amount. Picking a bar reports its period start.
 */
export default function MovementsBarChart({
  buckets,
  series,
  mode,
  period,
  label,
  onPick,
}: MovementsBarChartProps) {
  const { t } = useTranslation();
  const hidden = useBalancesHidden();
  const data = buckets.map((bucket) => {
    const entry: Record<string, string | number> = { periodStart: bucket.periodStart };
    for (const item of series) {
      entry[item.key] = Number(bucket.values[item.key] ?? "0");
    }
    return entry;
  });

  // The tooltip reads the period's own strings, so no money goes through the numbers the bars are drawn with.
  const readout = ({ active, label: periodStart }: ReadoutProps) => {
    const bucket = buckets.find((item) => item.periodStart === String(periodStart));
    if (!active || bucket === undefined) {
      return null;
    }
    return (
      <Paper bg="dark.5" radius="md" p="xs" shadow="md">
        <Text size="xs" c="dimmed">
          {formatDate(bucket.periodStart)}
        </Text>
        <Stack gap={2} mt={4}>
          {series.map((item) => (
            <Group key={item.key} justify="space-between" gap="xl" wrap="nowrap">
              <Text size="sm">{item.label}</Text>
              <Text size="sm" fw={600} style={{ whiteSpace: "nowrap" }}>
                {maskText(formatUsd(bucket.values[item.key] ?? "0"), hidden)}
              </Text>
            </Group>
          ))}
          {mode === "category" && (
            <Group justify="space-between" gap="xl" wrap="nowrap">
              <Text size="sm" c="dimmed">
                {t("movements.chart.total")}
              </Text>
              <Text size="sm" fw={600} style={{ whiteSpace: "nowrap" }}>
                {maskText(formatUsd(bucket.total), hidden)}
              </Text>
            </Group>
          )}
        </Stack>
      </Paper>
    );
  };

  return (
    <Stack gap="sm">
    <BarChart
      h={260}
      data={data}
      dataKey="periodStart"
      series={series.map((item) => ({
        name: item.key,
        label: item.label,
        color: item.color,
        ...(mode === "category" ? { stackId: "category" } : {}),
      }))}
      type={mode === "category" ? "stacked" : "default"}
      withLegend={false}
      gridAxis="y"
      xAxisProps={{
        tickFormatter: (value) => axisLabel(period, String(value)),
        interval: "preserveStartEnd",
        minTickGap: 8,
      }}
      yAxisProps={{ width: VALUE_AXIS_WIDTH }}
      valueFormatter={(value) => maskText(formatUsdTick(value), hidden)}
      tooltipProps={{ content: readout }}
      barProps={() => ({
        style: { cursor: "pointer" },
        onClick: (entry: { payload?: { periodStart?: unknown } }) => {
          const periodStart = entry.payload?.periodStart;
          if (typeof periodStart === "string") {
            onPick(periodStart);
          }
        },
      })}
      accessibilityLayer={false}
      role="img"
      aria-label={label}
    />
      {/* By category, a legend names each colour; the tooltip alone would make the viewer hover to read the bars. */}
      {mode === "category" && (
        <Group gap="md" wrap="wrap">
          {series.map((item) => (
            <Group key={item.key} gap={6} wrap="nowrap">
              <Box w={10} h={10} style={{ borderRadius: 3, background: item.color }} aria-hidden />
              <Text size="xs" c="dimmed">
                {item.label}
              </Text>
            </Group>
          ))}
        </Group>
      )}
    </Stack>
  );
}
