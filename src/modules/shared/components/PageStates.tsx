import { Center, Loader, Stack, Text, Title } from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getApiErrorKey } from "../api-errors";
import { PrimaryButton } from "./Buttons";

export function FullPageLoader() {
  const { t } = useTranslation();

  return (
    <Center h="100vh">
      <Loader aria-label={t("common.loading")} />
    </Center>
  );
}

export function FullPageError({ error }: { error: unknown }) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Center h="100vh" p="md">
      <Stack align="center" gap="sm">
        <Title order={1} ta="center">
          {t("common.somethingWrong")}
        </Title>
        <Text c="dimmed" ta="center">
          {t(getApiErrorKey(error))}
        </Text>
        <PrimaryButton onClick={() => router.invalidate()}>
          {t("common.retry")}
        </PrimaryButton>
      </Stack>
    </Center>
  );
}
