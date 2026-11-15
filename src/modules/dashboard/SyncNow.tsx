import { Alert, Button, Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { type CSSProperties, useId } from "react";
import { useTranslation } from "react-i18next";
import { useSyncBinanceData } from "../binance/hooks";
import { useSyncCooldown } from "../binance/syncCooldown";
import { getApiErrorKey } from "../shared/api-errors";
import { INK_ON_ACCENT } from "../shared/theme";

interface SyncNowProps {
  label: string;
  /** On the accent balance card the button is dark, since an accent button would vanish into the card. */
  onAccent?: boolean;
}

/**
 * Runs both Binance syncs and refreshes the dashboard. A sync that's already running is news, not a failure, so it shows
 * as an info message. While the server's cooldown runs, the button is disabled and a quiet line counts it down. A
 * cooldown's 429 is never an error, since the countdown says the same thing.
 */
export function SyncNow({ label, onAccent = false }: SyncNowProps) {
  const { t } = useTranslation();
  const sync = useSyncBinanceData();
  const remaining = useSyncCooldown();
  const cooldownId = useId();
  const coolingDown = remaining > 0;
  const errorKey = sync.isError ? getApiErrorKey(sync.error) : null;
  const alreadyRunning = errorKey === "errors.syncInProgress";
  const otherError =
    errorKey && !alreadyRunning && errorKey !== "errors.syncCooldown"
      ? errorKey
      : null;

  return (
    <Stack gap="sm" align="flex-start">
      <Button
        variant="filled"
        radius="xl"
        mih={44}
        loading={sync.isPending}
        disabled={coolingDown}
        color={onAccent ? "dark" : "accent"}
        c={onAccent ? "dark.0" : INK_ON_ACCENT}
        aria-describedby={coolingDown ? cooldownId : undefined}
        // Mantine's disabled fill is dark, and its disabled text color can't beat the button's inline one, so the
        // accent button's dark ink would vanish. Each variant gets a fill its own text reads on: the dark button
        // keeps its dark fill, and the accent one turns pale.
        style={
          {
            "--mantine-color-disabled": onAccent
              ? "var(--mantine-color-dark-6)"
              : "var(--mantine-color-dark-1)",
          } as CSSProperties
        }
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
      {otherError && (
        <Text size="sm" c={onAccent ? INK_ON_ACCENT : "red"} role="alert">
          {t(otherError)}
        </Text>
      )}
      {coolingDown && (
        <Text
          id={cooldownId}
          size="sm"
          c={onAccent ? INK_ON_ACCENT : "dimmed"}
        >
          {t("dashboard.sync.cooldown", { count: remaining })}
        </Text>
      )}
    </Stack>
  );
}
