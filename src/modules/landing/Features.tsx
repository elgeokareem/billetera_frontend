import { Paper, Text, ThemeIcon, Title } from "@mantine/core";
import {
  IconArrowsExchange,
  IconCoins,
  IconLayoutDashboard,
  IconTags,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

// Each item's copy is under landing.features.<key>. The order is the order of the page.
const FEATURES = [
  { key: "dashboard", Icon: IconLayoutDashboard },
  { key: "label", Icon: IconTags },
  { key: "movements", Icon: IconArrowsExchange },
  { key: "assets", Icon: IconCoins },
] as const;

/** What the product does for the user: four items, in a 2x2 grid from 768px and one column below. */
export function Features() {
  const { t } = useTranslation();

  return (
    <section className="landing__section" aria-labelledby="landing-features-title">
      <Title
        order={2}
        id="landing-features-title"
        fz={{ base: 28, sm: 36 }}
        lh={1.1}
        mb="xl"
      >
        {t("landing.features.title")}
      </Title>
      <ul className="landing__grid landing__features">
        {FEATURES.map(({ key, Icon }) => (
          <li key={key}>
            <Paper bg="dark.6" radius="lg" p="xl" h="100%">
              <ThemeIcon variant="light" color="accent" size={44} radius="md">
                <Icon size={22} aria-hidden="true" />
              </ThemeIcon>
              <Title order={3} fz={20} lh={1.2} mt="lg">
                {t(`landing.features.${key}.title`)}
              </Title>
              <Text c="dimmed" mt="xs">
                {t(`landing.features.${key}.body`)}
              </Text>
            </Paper>
          </li>
        ))}
      </ul>
    </section>
  );
}
