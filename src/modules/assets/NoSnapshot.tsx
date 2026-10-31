import { Paper, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { SyncNow } from "../dashboard/SyncNow";

/** The prompt to sync when there's no snapshot yet. It's the Dashboard's prompt, so the two read the same. */
export function NoSnapshot() {
  const { t } = useTranslation();

  return (
    <Paper bg="dark.6" radius={12} p={{ base: 20, sm: 24 }}>
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
