import { ChartSeries, LineChart } from "@mantine/charts";
import { Paper, Text } from "@mantine/core";

export function LineChartComponent<
  T extends Record<string | number, unknown>[],
>({ data, series }: { data: T; series: ChartSeries[] }) {
  return (
    <LineChart
      h={300}
      data={data}
      dataKey="date"
      series={series}
      curveType="linear"
      tooltipProps={{
        content: (props) => (
          <ChartTooltip
            label={props.label}
            payload={props.payload as BasePayloadItem[]}
          />
        ),
      }}
    />
  );
}

interface BasePayloadItem {
  name: string;
  value: number | string;
  color: string;
}
interface ChartTooltipProps<T> {
  label: string;
  payload: T[];
}
function ChartTooltip<T extends BasePayloadItem>({
  label,
  payload,
}: ChartTooltipProps<T>) {
  if (!payload) return null;

  return (
    <Paper px="md" py="sm" withBorder shadow="md" radius="md">
      <Text fw={500} mb={5}>
        {label}
      </Text>
      {payload.map((item) => (
        <Text key={item.name} c={item.color} fz="sm">
          {item.name}: {item.value}
        </Text>
      ))}
    </Paper>
  );
}
