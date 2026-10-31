import { AppShell, Burger, Group, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link, Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RejectedKeyBanner } from "../../binance/RejectedKeyBanner";
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
      <AppShell.Header hiddenFrom="sm" withBorder={false}>
        <Group h="100%" px="md" justify="space-between">
          <span className="brand">{t("common.appName")}</span>
          <Burger
            opened={opened}
            onClick={toggle}
            aria-label={t("common.openMenu")}
          />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" withBorder={false}>
        <Stack gap="md">
          <AppShell.Section visibleFrom="sm" px={12} pt={8}>
            <span className="brand">{t("common.appName")}</span>
          </AppShell.Section>
          <AppShell.Section px={12}>
            <LanguageSwitch />
          </AppShell.Section>
          <Stack component="nav" aria-label={t("nav.main")} gap={4}>
            {NAV_ITEMS.map(({ to, labelKey }) => (
              <Link key={to} to={to} className="nav-link" onClick={close}>
                {t(labelKey)}
              </Link>
            ))}
          </Stack>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <RejectedKeyBanner />
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
