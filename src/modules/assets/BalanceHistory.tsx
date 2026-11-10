import { Group, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { lazy, Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SectionError } from "../dashboard/SectionStates";
import { balanceSeries } from "../shared/chart";
import { formatMoment, formatUsdTick } from "../shared/chartFormat";
import { DEFAULT_RANGE, openRangeQuery, RANGE_KEYS, type RangeKey } from "../shared/chartRange";
import { RangeChips } from "../shared/components/RangeChips";
import { formatUsd } from "../shared/format";
import { useSnapshotHistory } from "../snapshots/hooks";

// The chart's library loads with the first chart, so the rest of the app doesn't wait for it.
const BalanceChart = lazy(() => import("../shared/components/BalanceChart"));

interface BalanceHistoryProps {
  /** The start of each range, taken once by the page so the query keys hold while it's open. */
  now: Date;
  timeZone: string;
}

/**
 * The total balance over a range, with a chip for each range. The backend picks the bucket, so every range fits. The request
 * has no end, so a Sync's new snapshot shows on the refetch.
 */
export function BalanceHistory({ now, timeZone }: BalanceHistoryProps) {
  const { t } = useTranslation();
  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE);
  const query = useMemo(() => openRangeQuery(now, range, timeZone), [now, range, timeZone]);
  const history = useSnapshotHistory(query);
  const points = history.data?.points;
  const series = useMemo(() => balanceSeries(points ?? []), [points]);

  let body;
  if (history.isPending) {
    body = <Skeleton height={260} radius="sm" />;
  } else if (history.isError) {
    body = <SectionError error={history.error} onRetry={() => history.refetch()} />;
  } else {
    body = (
      <Suspense fallback={<Skeleton height={260} radius="sm" />}>
        <BalanceChart
          series={series}
          label={t("assets.history.chartLabel")}
          startsAtZero
          range={range}
          windowEnd={history.data.to}
          fetchedAt={history.dataUpdatedAt}
          formatValue={formatUsd}
          formatTick={formatUsdTick}
          formatTooltipTime={formatMoment}
        />
      </Suspense>
    );
  }

  return (
    <Paper bg="dark.6" radius={12} p={{ base: 20, sm: 24 }}>
      <Stack gap="md">
        <Group justify="space-between" align="center" gap="md" wrap="wrap">
          <Text component="h2" fw={600} fz={16} m={0}>
            {t("assets.history.title")}
          </Text>
          <RangeChips value={range} keys={RANGE_KEYS} onChange={setRange} />
        </Group>
        {body}
      </Stack>
    </Paper>
  );
}
