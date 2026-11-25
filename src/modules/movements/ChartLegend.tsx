import { Box, Group, Text } from "@mantine/core";

/** A legend entry: the series' key, its label and the colour of its swatch. */
export interface ChartLegendItem {
  key: string;
  label: string;
  color: string;
}

interface ChartLegendProps {
  /** In draw order, so the legend reads as the chart does. */
  items: readonly ChartLegendItem[];
}

/**
 * The swatch-and-name legend the category charts draw below their plot. The bars and the pie both render it, so the
 * colours, the order and the typography can't drift between the two.
 */
export default function ChartLegend({ items }: ChartLegendProps) {
  return (
    <Group gap="md" wrap="wrap">
      {items.map((item) => (
        <Group key={item.key} gap={6} wrap="nowrap">
          <Box w={10} h={10} style={{ borderRadius: 3, background: item.color }} aria-hidden />
          <Text size="xs" c="dimmed">
            {item.label}
          </Text>
        </Group>
      ))}
    </Group>
  );
}
