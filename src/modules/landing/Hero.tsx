import { Button, Group, Text, Title } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { INK_ON_ACCENT } from "../shared/theme";
import { HeroIllustration } from "./HeroIllustration";

/**
 * The first screen: the headline, a one-sentence subhead, the read-only promise and the two ways in. From 768px the
 * illustration sits beside the text. Below it, the illustration comes under the buttons.
 */
export function Hero() {
  const { t } = useTranslation();

  return (
    <div className="landing__hero">
      <div className="landing__hero-copy">
        <Title order={1} fz={{ base: 36, sm: 56 }} lh={1.05} className="landing__title">
          {t("landing.hero.title")}
        </Title>
        <Text size="lg" c="dimmed" mt="lg" maw={560}>
          {t("landing.hero.subtitle")}
        </Text>
        <Group gap="xs" mt="lg" wrap="nowrap" align="flex-start">
          <IconLock
            size={18}
            aria-hidden="true"
            color="var(--mantine-color-accent-6)"
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <Text size="sm">{t("landing.hero.readOnly")}</Text>
        </Group>
        <Group gap="md" mt="xl">
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
          <Button
            component={Link}
            to="/login"
            variant="default"
            size="md"
            radius="xl"
          >
            {t("auth.loginSubmit")}
          </Button>
        </Group>
      </div>
      <HeroIllustration />
    </div>
  );
}
