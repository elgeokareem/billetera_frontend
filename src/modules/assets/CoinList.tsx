import { Paper, Stack, Table, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SectionError, SectionSkeleton } from "../dashboard/SectionStates";
import { Sensitive } from "../shared/components/Sensitive";
import { formatPercent, formatQuantity, formatUsd } from "../shared/format";
import { percentOf } from "../shared/money";
import { useLatestSnapshot } from "../snapshots/hooks";
import { type Holding, mergeHoldings } from "../snapshots/holdings";

/** A coin's USD value, or No price. A coin with some rows unpriced shows its priced part and says so. */
function UsdValue({ holding }: { holding: Holding }) {
  const { t } = useTranslation();

  if (holding.usd === null) {
    return (
      <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
        {t("assets.coins.noPrice")}
      </Text>
    );
  }
  return (
    <Stack gap={0} align="flex-end">
      <Text size="sm" fw={500} style={{ whiteSpace: "nowrap" }}>
        <Sensitive>{formatUsd(holding.usd)}</Sensitive>
      </Text>
      {!holding.priced && (
        <Text size="xs" c="dimmed">
          {t("assets.coins.partlyPriced")}
        </Text>
      )}
    </Stack>
  );
}

/** The share of the total, from the same priced total the Summary shows. An unpriced coin has none. */
function shareOf(holding: Holding, total: string) {
  return formatPercent(holding.usd === null ? null : percentOf(holding.usd, total));
}

function CoinTable({ holdings, total }: { holdings: readonly Holding[]; total: string }) {
  const { t } = useTranslation();

  return (
    <Table.ScrollContainer minWidth={520}>
      <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th c="dimmed" fw={500}>
              {t("assets.coins.coin")}
            </Table.Th>
            <Table.Th c="dimmed" fw={500} ta="right">
              {t("assets.coins.amount")}
            </Table.Th>
            <Table.Th c="dimmed" fw={500} ta="right">
              {t("assets.coins.usd")}
            </Table.Th>
            <Table.Th c="dimmed" fw={500} ta="right">
              {t("assets.coins.share")}
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {holdings.map((holding) => (
            <Table.Tr key={holding.asset}>
              <Table.Td>
                <Link to="/assets/$asset" params={{ asset: holding.asset }} className="row-link">
                  <Text component="span" fw={600} fz="sm">
                    {holding.asset}
                  </Text>
                </Link>
              </Table.Td>
              <Table.Td ta="right" style={{ whiteSpace: "nowrap" }}>
                <Sensitive>{formatQuantity(holding.amount)}</Sensitive> {holding.asset}
              </Table.Td>
              <Table.Td ta="right">
                <UsdValue holding={holding} />
              </Table.Td>
              <Table.Td ta="right" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                {shareOf(holding, total)}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function CoinCards({ holdings, total }: { holdings: readonly Holding[]; total: string }) {
  return (
    <Stack gap="sm">
      {holdings.map((holding) => (
        <Link
          key={holding.asset}
          to="/assets/$asset"
          params={{ asset: holding.asset }}
          className="row-link"
          style={{ display: "block" }}
        >
          <Paper bg="dark.6" radius={12} p={{ base: 16, xs: 20 }}>
            <Stack gap={0}>
              <Stack gap={2} miw={0}>
                <Text fw={600} fz={16} lh={1.3}>
                  {holding.asset}
                </Text>
                <Text size="sm" c="dimmed" className="truncate">
                  <Sensitive>{formatQuantity(holding.amount)}</Sensitive> {holding.asset}
                </Text>
              </Stack>
              <Stack gap={2} align="flex-end" mt="sm">
                <UsdValue holding={holding} />
                <Text size="xs" c="dimmed">
                  {shareOf(holding, total)}
                </Text>
              </Stack>
            </Stack>
          </Paper>
        </Link>
      ))}
    </Stack>
  );
}

/**
 * The coins of the latest snapshot, one row each, merged across the wallets. The order is by USD value, with unpriced coins
 * last. A table from 768px up, and a list of cards below. A coin opens its detail page.
 */
export function CoinList() {
  const { t } = useTranslation();
  const latest = useLatestSnapshot();
  const holdings = useMemo(
    () => (latest.data ? mergeHoldings(latest.data.assets) : []),
    [latest.data],
  );
  const heading = (
    <Text component="h2" fw={600} fz={16} m={0} mb="md">
      {t("assets.coins.title")}
    </Text>
  );

  if (latest.isPending || latest.isError || latest.data === null || holdings.length === 0) {
    let body;
    if (latest.isPending) {
      body = <SectionSkeleton lines={4} />;
    } else if (latest.isError) {
      body = <SectionError error={latest.error} onRetry={() => latest.refetch()} />;
    } else if (latest.data === null) {
      body = <Text size="sm" c="dimmed">{t("dashboard.noSnapshot.holdings")}</Text>;
    } else {
      body = <Text size="sm" c="dimmed">{t("dashboard.holdings.empty")}</Text>;
    }
    return (
      <Paper bg="dark.6" radius={12} p={{ base: 20, sm: 24 }}>
        {heading}
        {body}
      </Paper>
    );
  }

  const total = latest.data.total_usd;
  const hasUnpriced = holdings.some((holding) => holding.usd === null);
  const note = hasUnpriced && (
    <Text size="sm" c="dimmed">
      {t("assets.coins.excluded")}
    </Text>
  );

  return (
    <>
      <Paper visibleFrom="sm" bg="dark.6" radius={12} p={{ base: 20, sm: 24 }}>
        {heading}
        <CoinTable holdings={holdings} total={total} />
        {note && <Stack mt="md">{note}</Stack>}
      </Paper>
      <Stack gap="sm" hiddenFrom="sm">
        {heading}
        <CoinCards holdings={holdings} total={total} />
        {note}
      </Stack>
    </>
  );
}
