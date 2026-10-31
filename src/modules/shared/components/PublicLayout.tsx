import { Box, Container, Group, Paper, Text, Title } from "@mantine/core";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitch } from "./LanguageSwitch";

interface PublicLayoutProps {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}

export function PublicLayout({ title, subtitle, children }: PublicLayoutProps) {
  const { t } = useTranslation();

  return (
    <Container size={440} py="xl" px="md">
      <Group justify="space-between" mb={40}>
        <span className="brand">{t("common.appName")}</span>
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
