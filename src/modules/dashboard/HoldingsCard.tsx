import { Group, Paper, Stack, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Sensitive } from "../shared/components/Sensitive";
import { formatQuantity, formatUsd } from "../shared/format";
import { useLatestSnapshot } from "../snapshots/hooks";
import { mergeHoldings } from "../snapshots/holdings";
import { SectionError, SectionSkeleton } from "./SectionStates";

/** The coins the user holds, merged across wallets. Five at most, and the rest are on Assets. */
const SHOWN = 5;

/** Holdings come from the latest snapshot, so they share its query with the balance card. */
export function HoldingsCard() {
  const { t } = useTranslation();
  const latest = useLatestSnapshot();
  const holdings = useMemo(
    () => (latest.data ? mergeHoldings(latest.data.assets) : []),
    [latest.data],
  );

  let body;
  if (latest.isPending) {
    body = <SectionSkeleton lines={4} />;
  } else if (latest.isError) {
    body = <SectionError error={latest.error} onRetry={() => latest.refetch()} />;
  } else if (latest.data === null) {
    body = <Text size="sm" c="dimmed">{t("dashboard.noSnapshot.holdings")}</Text>;
  } else if (holdings.length === 0) {
    body = <Text size="sm" c="dimmed">{t("dashboard.holdings.empty")}</Text>;
  } else {
    body = (
      <Stack gap={0}>
        {holdings.slice(0, SHOWN).map((holding) => (
          <Group key={holding.asset} justify="space-between" align="center" wrap="nowrap" gap="md" py={6}>
            <Stack gap={0} miw={0}>
              <Text size="sm" fw={600}>
                {holding.asset}
              </Text>
              <Text size="xs" c="dimmed" className="truncate">
                <Sensitive>{formatQuantity(holding.amount)}</Sensitive>
              </Text>
            </Stack>
            <Text size="sm" fw={500} c={holding.usd === null ? "dimmed" : undefined} style={{ whiteSpace: "nowrap" }}>
              {holding.usd === null ? t("dashboard.holdings.noPrice") : <Sensitive>{formatUsd(holding.usd)}</Sensitive>}
            </Text>
          </Group>
        ))}
      </Stack>
    );
  }

  return (
    <Paper bg="dark.6" radius={12} p={{ base: 20, sm: 24 }}>
      <Group justify="space-between" align="center" mb={8}>
        <Text component="h2" fw={600} fz={16} m={0}>
          {t("dashboard.holdings.title")}
        </Text>
        {latest.data && (
          <Link to="/assets" className="quiet-link">
            {t("dashboard.holdings.viewAll")}
          </Link>
        )}
      </Group>
      {body}
    </Paper>
  );
}
