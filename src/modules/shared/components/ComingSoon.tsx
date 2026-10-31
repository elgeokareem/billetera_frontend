import { Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";

export function ComingSoon({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();

  return (
    <>
      <Title order={1}>{t(titleKey)}</Title>
      <Text c="dimmed" mt="xs">
        {t("common.comingSoonBody")}
      </Text>
    </>
  );
}
