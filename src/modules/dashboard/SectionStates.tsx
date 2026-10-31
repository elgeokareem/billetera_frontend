import { Button, Skeleton, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { getApiErrorKey } from "../shared/api-errors";

/** The loading state of a section: a few bars where its rows will be. */
export function SectionSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Stack gap="sm" role="status" aria-busy="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} height={index === 0 ? 24 : 16} width={index === 0 ? "60%" : "90%"} radius="sm" />
      ))}
    </Stack>
  );
}

/** A section that failed to load. It fails on its own: the rest of the page keeps working. */
export function SectionError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation();

  return (
    <Stack gap="sm" align="flex-start">
      <Text size="sm" c="dimmed">
        {t("dashboard.section.error")} {t(getApiErrorKey(error))}
      </Text>
      <Button variant="default" radius="xl" mih={44} onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </Stack>
  );
}
