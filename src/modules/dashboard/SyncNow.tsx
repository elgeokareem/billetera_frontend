import { Alert, Button, Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useSyncBinanceData } from "../binance/hooks";
import { getApiErrorKey } from "../shared/api-errors";
import { INK_ON_ACCENT } from "../shared/theme";

interface SyncNowProps {
  label: string;
  /** On the accent balance card the button is dark, since an accent button would vanish into the card. */
  onAccent?: boolean;
}

/**
 * Runs both Binance syncs and refreshes the dashboard. A sync that's already running is news, not a failure, so it shows
 * as an info message.
 */
export function SyncNow({ label, onAccent = false }: SyncNowProps) {
  const { t } = useTranslation();
  const sync = useSyncBinanceData();
  const errorKey = sync.isError ? getApiErrorKey(sync.error) : null;
  const alreadyRunning = errorKey === "errors.syncInProgress";

  return (
    <Stack gap="sm" align="flex-start">
      <Button
        variant="filled"
        radius="xl"
        mih={44}
        loading={sync.isPending}
        color={onAccent ? "dark" : "accent"}
        c={onAccent ? "dark.0" : INK_ON_ACCENT}
        onClick={() => sync.mutate()}
      >
        {label}
      </Button>
      {alreadyRunning && (
        <Alert
          variant="light"
          color={onAccent ? "dark" : "blue"}
          icon={<IconInfoCircle size={18} />}
          role="status"
          p="xs"
        >
          <Text size="sm">{t("errors.syncInProgress")}</Text>
        </Alert>
      )}
      {errorKey && !alreadyRunning && (
        <Text size="sm" c={onAccent ? INK_ON_ACCENT : "red"} role="alert">
          {t(errorKey)}
        </Text>
      )}
    </Stack>
  );
}
