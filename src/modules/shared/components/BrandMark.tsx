import { useTranslation } from "react-i18next";

interface BrandMarkProps {
  /** The icon's width and height, in pixels. The navbar uses a smaller one so the mark and the balances toggle fit on one line. */
  size?: number;
}

/**
 * The product's icon and name, side by side and vertically centred. The name comes from the translation files, and the icon is
 * decorative (alt=""), so a screen reader announces only the name.
 */
export function BrandMark({ size = 28 }: BrandMarkProps) {
  const { t } = useTranslation();

  return (
    <span className="brand-mark">
      <img src="/favicon.svg" alt="" width={size} height={size} />
      <span className="brand">{t("common.appName")}</span>
    </span>
  );
}
