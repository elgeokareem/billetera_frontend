import { Box, Container, Group, Paper, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { ReactNode } from "react";
import { BrandMark } from "./BrandMark";
import { LanguageSwitch } from "./LanguageSwitch";

interface PublicLayoutProps {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  /** Makes the brand mark a link to the landing page at `/`. */
  homeLink?: boolean;
}

export function PublicLayout({ title, subtitle, children, homeLink = false }: PublicLayoutProps) {
  return (
    <Container size={440} py="xl" px="md">
      <Group justify="space-between" mb={40}>
        {homeLink ? (
          <Link to="/" className="brand-link">
            <BrandMark />
          </Link>
        ) : (
          <BrandMark />
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
