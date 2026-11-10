import { Button, Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

/** Says the category names didn't load, with a retry. Shown beside data that did load. */
export function CategoriesUnavailable({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();

  return (
    <Group gap="sm" wrap="wrap" role="status">
      <Text size="sm" c="dimmed">
        {t("categories.unavailable")}
      </Text>
      <Button variant="default" radius="xl" mih={44} onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </Group>
  );
}
