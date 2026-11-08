import { VisuallyHidden } from "@mantine/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { MASK } from "../privacy";
import { useBalancesHidden } from "../usePrivacy";

/**
 * A money value on screen. Shown, it's its children as they are. Hidden, it's the mask, which a screen reader skips, and the
 * word "Hidden" in its place. It adds no element of its own: the mask is an inline span and the word is visually hidden, so a
 * hidden value doesn't move the layout. Only a value goes in here. A null value keeps the text it has, such as "No price".
 */
export function Sensitive({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const hidden = useBalancesHidden();

  if (!hidden) {
    return <>{children}</>;
  }
  return (
    <>
      <span aria-hidden="true">{MASK}</span>
      <VisuallyHidden>{t("privacy.hidden")}</VisuallyHidden>
    </>
  );
}
