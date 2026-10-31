import { Button, Paper, Stack, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ConnectionCard } from "../binance/ConnectionCard";
import { useLogout } from "../shared/session";

export function SettingsPage() {
  const { t } = useTranslation();
  const logout = useLogout();

  return (
    <>
      <Title order={1}>{t("nav.settings")}</Title>
      <Stack gap="lg" mt="xl" maw={640}>
        <ConnectionCard />
        <Paper bg="dark.6" radius="lg" p="xl">
          <Title order={2} size="h3">
            {t("settings.accountTitle")}
          </Title>
          <Button
            mt="lg"
            variant="default"
            loading={logout.isPending}
            onClick={() => logout.mutate()}
          >
            {t("auth.logout")}
          </Button>
        </Paper>
      </Stack>
    </>
  );
}
