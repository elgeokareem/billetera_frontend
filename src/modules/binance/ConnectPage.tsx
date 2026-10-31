import { Button, Group, Loader, Stack, Text } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PublicLayout } from "../shared/components/PublicLayout";
import { useLogout } from "../shared/session";
import { CredentialsForm } from "./CredentialsForm";
import { useSyncBinanceData } from "./hooks";

export function ConnectPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sync = useSyncBinanceData();
  const logout = useLogout();
  const [fetching, setFetching] = useState(false);

  // The key is saved by now. If the first sync fails, the key stays saved, and the dashboard's "no balance data yet"
  // prompt is where the user syncs again.
  const handleSaved = async () => {
    setFetching(true);
    await sync.mutateAsync().catch(() => undefined);
    await navigate({ to: "/dashboard" });
  };

  return (
    <PublicLayout
      title={t("binance.connect.title")}
      subtitle={t("binance.connect.subtitle")}
    >
      {fetching ? (
        <Stack align="center" gap="xs" py="xl" role="status">
          <Loader />
          <Text fw={600} mt="sm">
            {t("binance.connect.fetchingTitle")}
          </Text>
          <Text c="dimmed" size="sm" ta="center">
            {t("binance.connect.fetchingBody")}
          </Text>
        </Stack>
      ) : (
        <>
          <Text fw={600}>{t("binance.connect.stepsTitle")}</Text>
          {/* Numbered by hand: app.css removes list markers from every li. */}
          <Stack gap="xs" mt="sm" mb="xl">
            {[
              t("binance.connect.step1"),
              t("binance.connect.step2"),
              t("binance.connect.step3"),
            ].map((step, index) => (
              <Group key={step} gap="sm" wrap="nowrap" align="flex-start">
                <Text fw={700} c="accent" size="sm" w={16} ta="right">
                  {index + 1}
                </Text>
                <Text size="sm">{step}</Text>
              </Group>
            ))}
          </Stack>
          <CredentialsForm
            submitLabel={t("binance.connect.submit")}
            onSaved={handleSaved}
          />
          <Group justify="center" mt="xl">
            <Button
              variant="subtle"
              size="sm"
              onClick={() => logout.mutate()}
            >
              {t("auth.logout")}
            </Button>
          </Group>
        </>
      )}
    </PublicLayout>
  );
}
