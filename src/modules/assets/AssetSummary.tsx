import { Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { SectionError, SectionSkeleton } from "../dashboard/SectionStates";
import { SyncNow } from "../dashboard/SyncNow";
import { Sensitive } from "../shared/components/Sensitive";
import { formatDateTime, formatUsd } from "../shared/format";
import { INK_ON_ACCENT } from "../shared/theme";
import { useLatestSnapshot } from "../snapshots/hooks";
import { NoSnapshot } from "./NoSnapshot";

const CARD_PADDING = { base: 20, sm: 24 };

/**
 * The total of the latest snapshot, with its Spot and Funding parts and the time it was taken. A coin with no price is left out
 * of the total, and the card says so.
 */
export function AssetSummary() {
  const { t } = useTranslation();
  const latest = useLatestSnapshot();

  if (latest.isPending) {
    return (
      <Paper bg="dark.6" radius={12} p={CARD_PADDING}>
        <SectionSkeleton lines={3} />
      </Paper>
    );
  }

  if (latest.isError) {
    return (
      <Paper bg="dark.6" radius={12} p={CARD_PADDING}>
        <SectionError error={latest.error} onRetry={() => latest.refetch()} />
      </Paper>
    );
  }

  if (latest.data === null) {
    return <NoSnapshot />;
  }

  const snapshot = latest.data;
  return (
    <Paper bg="accent" c={INK_ON_ACCENT} radius={12} p={CARD_PADDING}>
      <Text size="sm" fw={500}>
        {t("assets.summary.total")}
      </Text>
      <Text
        component="p"
        m={0}
        mt={4}
        fz={{ base: 36, sm: 44 }}
        fw={700}
        lh={1.15}
        ff="var(--mantine-font-family-headings)"
      >
        <Sensitive>{formatUsd(snapshot.total_usd)}</Sensitive>
      </Text>
      {snapshot.unpriced_count > 0 && (
        <Text size="sm" mt="xs">
          {t("assets.summary.unpriced")}
        </Text>
      )}
      <SimpleGrid cols={2} mt="lg" spacing="md">
        <Stack gap={2}>
          <Text size="sm">{t("assets.summary.spot")}</Text>
          <Text fw={600}>
            <Sensitive>{formatUsd(snapshot.spot_total_usd)}</Sensitive>
          </Text>
        </Stack>
        <Stack gap={2}>
          <Text size="sm">{t("assets.summary.funding")}</Text>
          <Text fw={600}>
            <Sensitive>{formatUsd(snapshot.funding_total_usd)}</Sensitive>
          </Text>
        </Stack>
      </SimpleGrid>
      <Stack gap="sm" mt="lg" align="flex-start">
        <Text size="sm">{t("assets.summary.updated", { time: formatDateTime(snapshot.captured_at) })}</Text>
        <SyncNow label={t("dashboard.sync.action")} onAccent />
      </Stack>
    </Paper>
  );
}
