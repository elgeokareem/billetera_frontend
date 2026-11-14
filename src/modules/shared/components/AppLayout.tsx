import { AppShell, Box, Burger, Button, Group, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconLogout } from "@tabler/icons-react";
import { Link, Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RejectedKeyBanner } from "../../binance/RejectedKeyBanner";
import { useLogout } from "../session";
import { BalancesToggle } from "./BalancesToggle";
import { BrandMark } from "./BrandMark";
import { LanguageSwitch } from "./LanguageSwitch";

const NAV_ITEMS = [
  { to: "/dashboard", labelKey: "nav.dashboard" },
  { to: "/movements", labelKey: "nav.movements" },
  { to: "/assets", labelKey: "nav.assets" },
  { to: "/categories", labelKey: "nav.categories" },
  { to: "/settings", labelKey: "nav.settings" },
] as const;

export function AppLayout() {
  const { t } = useTranslation();
  const [opened, { toggle, close }] = useDisclosure();
  const logout = useLogout();

  return (
    <AppShell
      header={{ height: { base: 56, sm: 0 } }}
      navbar={{
        width: 220,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="xl"
    >
      {/* The header and the navbar each hold a balances toggle. The CSS shows one of them, by the width of the screen. */}
      <AppShell.Header hiddenFrom="sm" withBorder={false}>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <BrandMark />
          <Group gap="xs" wrap="nowrap">
            <BalancesToggle />
            <Burger
              opened={opened}
              onClick={toggle}
              aria-label={t("common.openMenu")}
            />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" withBorder={false}>
        {/* The top part grows, so the logout button stays at the bottom of the sidebar and of the mobile drawer. */}
        <AppShell.Section grow>
          <Stack gap="md">
            <Box visibleFrom="sm" px={12} pt={8}>
              {/* The 24px icon and the 4px gap keep this row on one line in the 220px navbar. */}
              <Group justify="space-between" align="center" wrap="nowrap" gap={4}>
                <BrandMark size={24} />
                <BalancesToggle />
              </Group>
            </Box>
            <Box px={12}>
              <LanguageSwitch />
            </Box>
            <Stack component="nav" aria-label={t("nav.main")} gap={4}>
              {NAV_ITEMS.map(({ to, labelKey }) => (
                <Link key={to} to={to} className="nav-link" onClick={close}>
                  {t(labelKey)}
                </Link>
              ))}
            </Stack>
          </Stack>
        </AppShell.Section>
        <AppShell.Section>
          <Button
            variant="subtle"
            fullWidth
            justify="flex-start"
            leftSection={<IconLogout size={20} aria-hidden />}
            loading={logout.isPending}
            onClick={() => logout.mutate()}
            c="dark.0"
            fz={14}
            fw={400}
            px={12}
            radius={22}
            vars={() => ({
              root: { "--button-hover": "var(--mantine-color-dark-5)" },
            })}
          >
            {t("auth.logout")}
          </Button>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <RejectedKeyBanner />
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
