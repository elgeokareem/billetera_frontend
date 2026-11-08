import { ActionIcon, Tooltip } from "@mantine/core";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { balancesStore } from "../balancesStore";
import { useBalancesHidden } from "../usePrivacy";

/**
 * Shows or hides the money on every page. The choice is saved in the browser and held in the store, so the toggle doesn't touch
 * the URL or the history: no navigation, no new entry, and the scroll stays. AppLayout renders it twice, in the mobile header and
 * in the navbar, and CSS shows only one of them. Both copies read the same store.
 */
export function BalancesToggle() {
  const { t } = useTranslation();
  const shown = !useBalancesHidden();

  return (
    <Tooltip label={t("privacy.toggle")}>
      <ActionIcon
        variant="subtle"
        size={44}
        radius="xl"
        aria-label={t("privacy.toggle")}
        aria-pressed={shown}
        onClick={() => balancesStore.getState().toggle()}
      >
        {shown ? <IconEye size={22} aria-hidden /> : <IconEyeOff size={22} aria-hidden />}
      </ActionIcon>
    </Tooltip>
  );
}
