import { Paper, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";

const STEPS = ["one", "two", "three"] as const;

/** Three numbered steps: sign up, connect the key, see the money. A row of three from 768px, one column below. */
export function HowItWorks() {
  const { t } = useTranslation();

  return (
    <section className="landing__section" aria-labelledby="landing-steps-title">
      <Title
        order={2}
        id="landing-steps-title"
        fz={{ base: 28, sm: 36 }}
        lh={1.1}
        mb="xl"
      >
        {t("landing.steps.title")}
      </Title>
      <ol className="landing__grid landing__steps">
        {STEPS.map((step, index) => (
          <li key={step}>
            <Paper bg="dark.6" radius="lg" p="xl" h="100%">
              <Text fz={32} fw={700} lh={1} c="accent">
                {index + 1}
              </Text>
              <Title order={3} fz={20} lh={1.2} mt="lg">
                {t(`landing.steps.${step}.title`)}
              </Title>
              <Text c="dimmed" mt="xs">
                {t(`landing.steps.${step}.body`)}
              </Text>
            </Paper>
          </li>
        ))}
      </ol>
    </section>
  );
}
