import { Box, Container, Group, Paper, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitch } from "./LanguageSwitch";

interface PublicLayoutProps {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  /** Makes the wordmark a link to the landing page at `/`. */
  homeLink?: boolean;
}

export function PublicLayout({ title, subtitle, children, homeLink = false }: PublicLayoutProps) {
  const { t } = useTranslation();

  return (
    <Container size={440} py="xl" px="md">
      <Group justify="space-between" mb={40}>
        {homeLink ? (
          <Link to="/" className="brand brand-link">
            {t("common.appName")}
          </Link>
        ) : (
          <span className="brand">{t("common.appName")}</span>
        )}
        <Box w={120}>
          <LanguageSwitch />
        </Box>
      </Group>
      <Title order={1}>{title}</Title>
      <Text c="dimmed" mt="xs">
        {subtitle}
      </Text>
      <Paper bg="dark.6" radius="lg" p="xl" mt="lg">
        {children}
      </Paper>
    </Container>
  );
}
