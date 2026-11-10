import { Group, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { lazy, Suspense, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { balanceSeries } from "../shared/chart";
import { formatMoment, formatUsdTick } from "../shared/chartFormat";
import { DEFAULT_RANGE, openRangeQuery, RANGE_KEYS, rangeOf, type RangeKey } from "../shared/chartRange";
import { RangeChips } from "../shared/components/RangeChips";
import { formatUsd } from "../shared/format";
import { useSnapshotHistory } from "../snapshots/hooks";
import { SectionError } from "./SectionStates";

// The chart's library loads with the first chart, so the rest of the app doesn't wait for it.
const BalanceChart = lazy(() => import("../shared/components/BalanceChart"));

interface BalanceHistoryCardProps {
  /** Taken once by the page, so the query keys hold while it's open. */
  now: Date;
  timeZone: string;
}

/**
 * The total balance over a range, under the Balance card. The range is the `range` param of the page, so a view survives a
 * reload. Choosing a range replaces the history entry, so Back leaves the page, and the scroll stays.
 */
export function BalanceHistoryCard({ now, timeZone }: BalanceHistoryCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const range = useSearch({ from: "/_app/dashboard", select: (search) => rangeOf(search.range, RANGE_KEYS) });
  // The window ends at each request's own time (no `to`), so a Sync's new snapshot shows on the refetch.
  const query = useMemo(() => openRangeQuery(now, range, timeZone), [now, range, timeZone]);
  const history = useSnapshotHistory(query);
  const points = history.data?.points;
  const series = useMemo(() => balanceSeries(points ?? []), [points]);

  function chooseRange(next: RangeKey) {
    navigate({
      to: "/dashboard",
      // The default range has no param, so the URL of the default view stays clean.
      search: (prev) => ({ ...prev, range: next === DEFAULT_RANGE ? undefined : next }),
      replace: true,
      resetScroll: false,
    });
  }

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
          label={t("dashboard.history.chartLabel")}
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
            {t("dashboard.history.title")}
          </Text>
          <RangeChips value={range} keys={RANGE_KEYS} onChange={chooseRange} />
        </Group>
        {body}
      </Stack>
    </Paper>
  );
}
