import { Paper, Text, ThemeIcon, Title } from "@mantine/core";
import {
  IconEye,
  IconNetwork,
  IconShieldLock,
  IconToggleRight,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

// Each point's copy is under landing.security.<key>. Each claim is in the spec's facts table, or follows directly from its read-only row.
const POINTS = [
  { key: "readOnly", Icon: IconEye },
  { key: "encrypted", Icon: IconShieldLock },
  { key: "restrict", Icon: IconNetwork },
  { key: "control", Icon: IconToggleRight },
] as const;

/** The security points, in a 2x2 grid from 768px and one column below. */
export function Security() {
  const { t } = useTranslation();

  return (
    <section className="landing__section" aria-labelledby="landing-security-title">
      <Title
        order={2}
        id="landing-security-title"
        fz={{ base: 28, sm: 36 }}
        lh={1.1}
        mb="xl"
      >
        {t("landing.security.title")}
      </Title>
      <ul className="landing__grid landing__security">
        {POINTS.map(({ key, Icon }) => (
          <li key={key}>
            <Paper bg="dark.6" radius="lg" p="xl" h="100%">
              <ThemeIcon variant="light" color="accent" size={44} radius="md">
                <Icon size={22} aria-hidden="true" />
              </ThemeIcon>
              <Title order={3} fz={20} lh={1.2} mt="lg">
                {t(`landing.security.${key}.title`)}
              </Title>
              <Text c="dimmed" mt="xs">
                {t(`landing.security.${key}.body`)}
              </Text>
            </Paper>
          </li>
        ))}
      </ul>
    </section>
  );
}
