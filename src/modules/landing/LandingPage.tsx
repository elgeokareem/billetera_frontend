import { Button, Container, Stack, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { INK_ON_ACCENT } from "../shared/theme";
import { Features } from "./Features";
import { Faq } from "./Faq";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { LandingFooter } from "./LandingFooter";
import { LandingHeader } from "./LandingHeader";
import { Security } from "./Security";

/**
 * The public page at `/`, for a visitor who isn't logged in. The route sends a logged-in user to the app first. The page
 * makes no API call of its own.
 */
export function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="landing">
      <LandingHeader />
      <main>
        <Container size={1120} px="md">
          <Hero />
          <Features />
          <HowItWorks />
          <Security />
          <Faq />
          <section className="landing__section" aria-labelledby="landing-cta-title">
            <Stack align="center" gap="xl">
              <Title
                order={2}
                id="landing-cta-title"
                fz={{ base: 28, sm: 36 }}
                lh={1.1}
                ta="center"
              >
                {t("landing.cta.title")}
              </Title>
              <Button
                component={Link}
                to="/register"
                size="md"
                radius="xl"
                c={INK_ON_ACCENT}
              >
                {t("auth.registerSubmit")}
              </Button>
            </Stack>
          </section>
        </Container>
      </main>
      <LandingFooter />
    </div>
  );
}
