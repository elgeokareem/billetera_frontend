import { Accordion, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";

// Each question's copy is under landing.faq.<key>. All items start closed, and any number can be open at once.
const QUESTIONS = [
  "moveMoney",
  "spending",
  "history",
  "frequency",
  "usd",
  "removeKey",
] as const;

/** The questions a visitor has before they trust the app with a key. Each item opens with Enter or Space. */
export function Faq() {
  const { t } = useTranslation();

  return (
    <section className="landing__section" aria-labelledby="landing-faq-title">
      <Title
        order={2}
        id="landing-faq-title"
        fz={{ base: 28, sm: 36 }}
        lh={1.1}
        mb="xl"
      >
        {t("landing.faq.title")}
      </Title>
      <Accordion
        multiple
        variant="separated"
        radius="lg"
        chevronPosition="right"
        className="landing__faq"
      >
        {QUESTIONS.map((key) => (
          <Accordion.Item key={key} value={key}>
            <Accordion.Control>{t(`landing.faq.${key}.question`)}</Accordion.Control>
            <Accordion.Panel>{t(`landing.faq.${key}.answer`)}</Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </section>
  );
}
