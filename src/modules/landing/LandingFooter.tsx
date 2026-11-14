import { Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BrandMark } from "../shared/components/BrandMark";

/** The footer: the wordmark, the two ways in, and the line that says Billetera isn't affiliated with Binance. */
export function LandingFooter() {
  const { t } = useTranslation();

  return (
    <footer className="landing__footer">
      <div className="landing__footer-inner">
        <BrandMark />
        <div className="landing__footer-links">
          <Link to="/login" className="quiet-link">
            {t("auth.loginSubmit")}
          </Link>
          <Link to="/register" className="quiet-link">
            {t("auth.registerSubmit")}
          </Link>
        </div>
        <Text size="sm" c="dimmed" className="landing__footer-note">
          {t("landing.footer.affiliation")}
        </Text>
      </div>
    </footer>
  );
}
