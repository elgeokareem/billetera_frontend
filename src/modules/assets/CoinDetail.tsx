import {
  Button,
  type ButtonProps,
  Group,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { createLink, Link, useParams } from "@tanstack/react-router";
import { lazy, type ReactNode, Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SectionError, SectionSkeleton } from "../dashboard/SectionStates";
import { browserTimeZone } from "../shared/dateRange";
import { Sensitive } from "../shared/components/Sensitive";
import { formatAmount, formatQuantity, formatUsd } from "../shared/format";
import { useAssetHistory, useLatestSnapshot } from "../snapshots/hooks";
import { type CoinHolding, coinHoldings } from "../snapshots/holdings";
import { assetSeries, chartWindow, clipToWindow, gapSpans, type Measure } from "../shared/chart";
import { formatAmountTick, formatMoment, formatUsdTick } from "../shared/chartFormat";
import { DEFAULT_RANGE, openRangeQuery, RANGE_KEYS, type RangeKey } from "../shared/chartRange";
import { RangeChips } from "../shared/components/RangeChips";
import { assetCode } from "./codes";
import { coinMovementsSearch } from "./links";
import { NoSnapshot } from "./NoSnapshot";
import { useAbsentCoinCheck } from "./hooks";

// The chart's library loads with the first chart, so the rest of the app doesn't wait for it.
const BalanceChart = lazy(() => import("../shared/components/BalanceChart"));

// A Mantine button drawn as a router link: an anchor with the target's href, so it keeps link behaviour, and its target and
// search are typed like any other Link.
const ButtonLink = createLink((props: ButtonProps) => <Button component="a" {...props} />);

/**
 * The page of one coin, at /assets/$asset. A code that isn't a symbol is Not found without a request. A coin the latest
 * snapshot has shows its wallets. A coin it doesn't have shows zero amounts and its history, when an earlier snapshot held it,
 * and Not found when none ever did.
 */
export function CoinDetail() {
  const { t } = useTranslation();
  const { asset: raw } = useParams({ from: "/_app/assets/$asset" });
  const code = assetCode(raw);

  if (code === undefined) {
    return <NotFound body={t("assets.notFound.invalid")} />;
  }
  return <CoinPage key={code} code={code} />;
}

function CoinPage({ code }: { code: string }) {
  const { t } = useTranslation();
  // Taken once, so each range's start and the query keys hold while the page is open, the same as the other pages.
  const [now] = useState(() => new Date());
  const [timeZone] = useState(browserTimeZone);
  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE);
  const [measure, setMeasure] = useState<Measure>("usd");

  const latest = useLatestSnapshot();
  const current = latest.data ? coinHoldings(latest.data.assets, code) : undefined;
  const held = current?.held ?? false;

  // The chart's request has no end, so a Sync's new snapshot shows on the refetch. The not-found check keeps its `to`.
  const query = useMemo(() => openRangeQuery(now, range, timeZone), [now, range, timeZone]);
  const history = useAssetHistory(code, query);

  // Only a coin the latest snapshot doesn't hold needs the checks that tell a coin that was held from one never held.
  const check = useAbsentCoinCheck(code, now, timeZone, latest.isSuccess && latest.data !== null && !held);
  const status = held ? "held" : check.status;

  // Taken before any early return, so the hooks run in the same order on every render.
  const points = history.data?.points;
  const series = useMemo(() => assetSeries(points ?? [], measure), [points, measure]);
  // The chart's window, shared with the gaps note so both read the same clipped points.
  const windowEnd = history.data?.to ?? "";
  const window = useMemo(
    () => chartWindow(range, windowEnd, history.dataUpdatedAt),
    [range, windowEnd, history.dataUpdatedAt],
  );
  const windowSeries = useMemo(() => clipToWindow(series, window), [series, window]);

  if (latest.isPending) {
    return (
      <Frame code={code}>
        <SectionSkeleton lines={4} />
      </Frame>
    );
  }
  if (latest.isError) {
    return (
      <Frame code={code}>
        <SectionError error={latest.error} onRetry={() => latest.refetch()} />
      </Frame>
    );
  }
  if (latest.data === null || current === undefined) {
    return (
      <Frame code={code}>
        <NoSnapshot />
      </Frame>
    );
  }
  if (status === undefined) {
    if (check.failed) {
      return (
        <Frame code={code}>
          <SectionError error={check.error} onRetry={check.retry} />
        </Frame>
      );
    }
    return (
      <Frame code={code}>
        <SectionSkeleton lines={4} />
      </Frame>
    );
  }
  if (status === "unknown") {
    return <NotFound body={t("assets.notFound.unknown", { asset: code })} />;
  }

  const total = current.total;
  const hasGaps = measure === "usd" && gapSpans(windowSeries).length > 0;

  let chart;
  if (history.isPending) {
    chart = <Skeleton height={260} radius="sm" />;
  } else if (history.isError) {
    chart = <SectionError error={history.error} onRetry={() => history.refetch()} />;
  } else {
    chart = (
      <Suspense fallback={<Skeleton height={260} radius="sm" />}>
        <BalanceChart
          series={series}
          label={t("assets.detail.chartLabel", { asset: code })}
          startsAtZero={measure === "usd"}
          range={range}
          windowEnd={windowEnd}
          fetchedAt={history.dataUpdatedAt}
          formatValue={measure === "usd" ? formatUsd : (value) => formatAmount(value, code)}
          formatTick={measure === "usd" ? formatUsdTick : formatAmountTick}
          formatTooltipTime={formatMoment}
        />
      </Suspense>
    );
  }

  return (
    <Stack gap="lg">
      <Link to="/assets" className="quiet-link">
        {t("assets.detail.allAssets")}
      </Link>
      <div>
        <Title order={1} fz={{ base: 30, sm: 40 }} lh={1.1}>
          {code}
        </Title>
        {status === "formerly" && (
          <Text c="dimmed" mt="xs">
            {t("assets.detail.noLonger", { asset: code })}
          </Text>
        )}
      </div>

      <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
        <Stack gap={4}>
          <Text fz={{ base: 30, sm: 40 }} fw={700} lh={1.1} ff="var(--mantine-font-family-headings)">
            <Sensitive>{formatQuantity(total.amount)}</Sensitive> {code}
          </Text>
          <UsdLine holding={total} />
        </Stack>
        <ButtonLink
          to="/movements"
          search={coinMovementsSearch(code)}
          variant="default"
          radius="xl"
          mih={44}
        >
          {t("assets.detail.viewMovements")}
        </ButtonLink>
      </Group>

      <Paper bg="dark.6" radius={12} p={{ base: 20, sm: 24 }}>
        <Stack gap="md">
          <Group justify="space-between" align="center" gap="md" wrap="wrap">
            <Text component="h2" fw={600} fz={16} m={0}>
              {t("assets.history.title")}
            </Text>
            <SegmentedControl
              aria-label={t("assets.history.title")}
              value={measure}
              onChange={(value) => setMeasure(value === "amount" ? "amount" : "usd")}
              data={[
                { value: "usd", label: t("assets.measure.usd") },
                { value: "amount", label: t("assets.measure.amount") },
              ]}
            />
          </Group>
          <RangeChips value={range} keys={RANGE_KEYS} onChange={setRange} />
          {chart}
          {hasGaps && (
            <Text size="sm" c="dimmed">
              {t("assets.history.gaps")}
            </Text>
          )}
        </Stack>
      </Paper>

      <Paper bg="dark.6" radius={12} p={{ base: 20, sm: 24 }}>
        <Text component="h2" fw={600} fz={16} m={0} mb="md">
          {t("assets.detail.wallets")}
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <WalletBlock title={t("assets.detail.spot")} holding={current.spot} asset={code} />
          <WalletBlock title={t("assets.detail.funding")} holding={current.funding} asset={code} />
        </SimpleGrid>
      </Paper>
    </Stack>
  );
}

/** The USD value of a holding: its value, No price, and a note when only part of it is priced. */
function UsdLine({ holding }: { holding: CoinHolding }) {
  const { t } = useTranslation();

  if (holding.usd === null) {
    return <Text c="dimmed">{t("assets.coins.noPrice")}</Text>;
  }
  return (
    <Text c="dimmed">
      <Sensitive>{formatUsd(holding.usd)}</Sensitive>
      {!holding.priced && ` · ${t("assets.coins.partlyPriced")}`}
    </Text>
  );
}

function WalletBlock({ title, holding, asset }: { title: string; holding: CoinHolding; asset: string }) {
  const { t } = useTranslation();

  return (
    <Stack gap="xs">
      <Text fw={600}>{title}</Text>
      <Text fz={22} fw={700} lh={1.2} ff="var(--mantine-font-family-headings)">
        <Sensitive>{formatQuantity(holding.amount)}</Sensitive> {asset}
      </Text>
      <UsdLine holding={holding} />
      <Stack gap={4} mt="xs">
        <AmountRow label={t("assets.detail.free")} value={formatQuantity(holding.free)} />
        <AmountRow label={t("assets.detail.locked")} value={formatQuantity(holding.locked)} />
        <AmountRow label={t("assets.detail.frozen")} value={formatQuantity(holding.frozen)} />
      </Stack>
    </Stack>
  );
}

function AmountRow({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" gap="md" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={500} style={{ whiteSpace: "nowrap" }}>
        <Sensitive>{value}</Sensitive>
      </Text>
    </Group>
  );
}

/** The page's title, with the coin code, around the state of its content. */
function Frame({ code, children }: { code: string; children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <Stack gap="lg">
      <Link to="/assets" className="quiet-link">
        {t("assets.detail.allAssets")}
      </Link>
      <Title order={1} fz={{ base: 30, sm: 40 }} lh={1.1}>
        {code}
      </Title>
      {children}
    </Stack>
  );
}

function NotFound({ body }: { body: string }) {
  const { t } = useTranslation();

  return (
    <Stack gap="lg">
      <div>
        <Title order={1} fz={{ base: 30, sm: 40 }} lh={1.1}>
          {t("assets.notFound.title")}
        </Title>
        <Text c="dimmed" mt="xs">
          {body}
        </Text>
      </div>
      <div>
        <ButtonLink to="/assets" variant="default" radius="xl" mih={44}>
          {t("assets.notFound.back")}
        </ButtonLink>
      </div>
    </Stack>
  );
}
