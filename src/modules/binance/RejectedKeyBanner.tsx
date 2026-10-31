import { Alert, Button, Group, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { sessionQuery } from "../shared/session";

/** Shown on every protected page while Binance refuses the saved key. It links to Settings, where the key is replaced. */
export function RejectedKeyBanner() {
  const { t } = useTranslation();
  const { data: session } = useQuery(sessionQuery);

  if (!session?.configured || session.state !== "rejected") {
    return null;
  }

  return (
    <Alert color="red" title={t("binance.rejected.title")} mb="xl">
      <Group justify="space-between" align="center" gap="md" wrap="wrap">
        <Text size="sm">{t("binance.rejected.body")}</Text>
        <Button
          component={Link}
          to="/settings"
          variant="white"
          color="red"
          size="sm"
        >
          {t("binance.rejected.goToSettings")}
        </Button>
      </Group>
    </Alert>
  );
}
