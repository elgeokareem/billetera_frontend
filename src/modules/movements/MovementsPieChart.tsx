import "@mantine/charts/styles.css";
import { PieChart } from "@mantine/charts";
import { Box, Group, Paper, Text } from "@mantine/core";
import { useMemo } from "react";
import { formatUsd } from "../shared/format";
import { maskText } from "../shared/privacy";
import { useBalancesHidden } from "../shared/usePrivacy";
import ChartLegend from "./ChartLegend";

/** One slice of the pie: the series' label and colour, its size and the exact string the tooltip formats. */
export interface PieSliceView {
  key: string;
  name: string;
  /** The slice's size, which only decides how much of the circle it takes. */
  value: number;
  color: string;
  /** The API's decimal string, which every displayed amount comes from. */
  amount: string;
}

interface MovementsPieChartProps {
  /** Sorted by value, largest first; a tie keeps the chartRows order (named, then Other categories, then no category). */
  cells: PieSliceView[];
  /** Describes the chart to screen readers. */
  label: string;
}

interface ReadoutProps {
  active?: boolean;
  payload?: readonly { payload?: Partial<PieSliceView> }[];
}

/**
 * The movements chart as a pie, on @mantine/charts. Each slice is a category of the shown direction over the whole filtered
 * range, with its percent outside; the tooltip and the legend add the exact amount. The legend sits beside the pie while the
 * card has room and wraps below it otherwise. The values pass through Number only for the slice size and the percent, and the
 * amounts come from the API's strings. While balances are hidden, the amounts show the mask, and the slices, their labels and
 * their percents stay, since a share reveals no money. Slices are read-only: the pie narrows nothing, unlike the bars, which
 * pick a period.
 */
export default function MovementsPieChart({ cells, label }: MovementsPieChartProps) {
  const hidden = useBalancesHidden();
  // Every cell holds a priced total (chartRows leaves unpriced series out of By category), so the sum is the whole circle.
  const total = cells.reduce((sum, cell) => sum + cell.value, 0);

  // The legend repeats the tooltip's figures for every slice: percents never mask, amounts follow Hide Balances.
  const legendItems = useMemo(
    () =>
      cells.map((cell) => ({
        key: cell.key,
        label: cell.name,
        color: cell.color,
        trailing: (
          <>
            <Text size="xs" c="dimmed" component="span">
              {total > 0 ? Math.round((cell.value / total) * 100) : 0}%
            </Text>
            <Text size="xs" fw={600} component="span" style={{ whiteSpace: "nowrap" }}>
              {maskText(formatUsd(cell.amount), hidden)}
            </Text>
          </>
        ),
      })),
    [cells, total, hidden],
  );

  // The tooltip reads the hovered slice's own strings: no money goes through the numbers the slices are drawn with.
  const readout = ({ active, payload }: ReadoutProps) => {
    const cell = payload?.[0]?.payload;
    if (!active || cell?.value === undefined || cell.amount === undefined) {
      return null;
    }
    const percent = total > 0 ? Math.round((cell.value / total) * 100) : 0;
    return (
      <Paper bg="dark.5" radius="md" p="xs" shadow="md">
        <Text size="xs" c="dimmed">
          {cell.name}
        </Text>
        <Group justify="space-between" gap="xl" wrap="nowrap" mt={4}>
          <Text size="sm" c="dimmed">
            {percent}%
          </Text>
          <Text size="sm" fw={600} style={{ whiteSpace: "nowrap" }}>
            {maskText(formatUsd(cell.amount), hidden)}
          </Text>
        </Group>
      </Paper>
    );
  };

  return (
    <Group justify="center" align="center" gap="xl" wrap="wrap">
      <PieChart
        data={cells}
        size={220}
        withLabels
        labelsType="percent"
        withLegend={false}
        // PieChart leaves its tooltip off by default, unlike BarChart.
        withTooltip
        tooltipDataSource="segment"
        tooltipProps={{ content: readout }}
        accessibilityLayer={false}
        role="img"
        aria-label={label}
      />
      {/* The legend gets its own column, narrow enough to sit beside the pie and to drop below it when the row can't fit. */}
      <Box style={{ flex: "0 1 300px" }}>
        <ChartLegend items={legendItems} />
      </Box>
    </Group>
  );
}
