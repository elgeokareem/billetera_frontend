import { Button, Container } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BrandMark } from "../shared/components/BrandMark";
import { LanguageSwitch } from "../shared/components/LanguageSwitch";
import { INK_ON_ACCENT } from "../shared/theme";

/**
 * The top bar. Both ways in are here at every width, with no menu. Below 768px the wordmark and the language switch share
 * the first row, and the two buttons take a row of their own. From 768px all four sit in one row (see .landing__header in
 * app.css).
 */
export function LandingHeader() {
  const { t } = useTranslation();

  return (
    <header>
      <Container size={1120} px="md" className="landing__header">
        <BrandMark />
        <LanguageSwitch />
        <nav className="landing__header-actions" aria-label={t("nav.main")}>
          <Button
            component={Link}
            to="/login"
            variant="default"
            size="md"
            radius="xl"
          >
            {t("auth.loginSubmit")}
          </Button>
          {/* The primary look of PrimaryButton (Buttons.tsx), which doesn't take a component prop. */}
          <Button
            component={Link}
            to="/register"
            size="md"
            radius="xl"
            c={INK_ON_ACCENT}
          >
            {t("auth.registerSubmit")}
          </Button>
        </nav>
      </Container>
    </header>
  );
}
