import { Button, Group, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  formatChangePercent,
  formatChangeUsd,
  formatDateTime,
  formatUsd,
} from "../shared/format";
import { Sensitive } from "../shared/components/Sensitive";
import { diff, percentOf } from "../shared/money";
import { INK_ON_ACCENT } from "../shared/theme";
import { useLatestSnapshot, useSnapshotHistory } from "../snapshots/hooks";
import { dashboardQueries } from "./queries";
import { SectionSkeleton } from "./SectionStates";
import { SyncNow } from "./SyncNow";

const CARD_PADDING = { base: 20, sm: 24 };

interface BalanceCardProps {
  now: Date;
  timeZone: string;
}

/**
 * The total balance, its change over the last day, and the sync. The history is in the chart under this card. The change is a
 * balance change, not a price move, since deposits and withdrawals count too. Each part loads on its own.
 */
export function BalanceCard({ now, timeZone }: BalanceCardProps) {
  const { t } = useTranslation();
  const queries = dashboardQueries(now, timeZone);
  const latest = useLatestSnapshot();
  const change = useSnapshotHistory(queries.change);

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
        <Text size="sm" c="dimmed">
          {t("dashboard.section.error")}
        </Text>
        <Button mt="md" variant="default" radius="xl" mih={44} onClick={() => latest.refetch()}>
          {t("common.retry")}
        </Button>
      </Paper>
    );
  }

  // No snapshot yet: a prompt to sync, not an error. A failed first sync lands here too, so the sync is the retry.
  if (latest.data === null) {
    return (
      <Paper bg="dark.6" radius={12} p={CARD_PADDING}>
        <Text component="h2" fw={700} fz={20} lh={1.2} ff="var(--mantine-font-family-headings)">
          {t("dashboard.noSnapshot.title")}
        </Text>
        <Text c="dimmed" size="sm" mt="xs" mb="lg">
          {t("dashboard.noSnapshot.body")}
        </Text>
        <SyncNow label={t("dashboard.sync.actionNow")} />
      </Paper>
    );
  }

  const snapshot = latest.data;
  const points = change.data?.points ?? [];
  const previous = points.length > 0 ? points[points.length - 1] : undefined;
  const delta = previous ? diff(snapshot.total_usd, previous.total_usd) : null;
  const percent = previous && delta !== null ? percentOf(delta, previous.total_usd) : null;

  return (
    <Paper bg="accent" c={INK_ON_ACCENT} radius={12} p={CARD_PADDING}>
      <Text size="sm" fw={500}>
        {t("dashboard.balance.title")}
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
          {t("dashboard.balance.unpriced")}
        </Text>
      )}

      {change.isPending && <Skeleton height={16} width="70%" mt="md" />}
      {change.isError && (
        <Group gap="xs" mt="md">
          <Text size="sm">{t("dashboard.balance.changeFailed")}</Text>
          <Button variant="subtle" size="compact-sm" mih={44} c={INK_ON_ACCENT} onClick={() => change.refetch()}>
            {t("common.retry")}
          </Button>
        </Group>
      )}
      {previous && delta !== null && (
        <Stack gap={2} mt="md">
          <Text size="sm" fw={600}>
            <Sensitive>{formatChangeUsd(delta)}</Sensitive>
            {percent !== null && ` (${formatChangePercent(percent)})`}
          </Text>
          <Text size="sm">{t("dashboard.balance.change")}</Text>
          <Text size="xs">{t("dashboard.balance.changeNote")}</Text>
        </Stack>
      )}

      <Stack gap="sm" mt="lg" align="flex-start">
        <Text size="sm">{t("dashboard.balance.updated", { time: formatDateTime(snapshot.captured_at) })}</Text>
        <SyncNow label={t("dashboard.sync.action")} onAccent />
      </Stack>
    </Paper>
  );
}
