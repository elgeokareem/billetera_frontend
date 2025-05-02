import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAuthenticated } from "../modules/shared/auth";
import { ModulesContainer } from "../modules/shared/components/ModulesContainer";
import { ModuleLayout } from "../modules/shared/components/ModuleLayout";
import {
  ModuleTitle,
  ThemedText,
} from "../modules/shared/components/CustomText";
import { Box, Flex, useMantineTheme } from "@mantine/core";
import { InfoCard } from "../modules/shared/components/InfoCard";
import {
  IconCurrencyDollar,
  IconPercentage,
  IconFolder,
  IconWallet,
} from "@tabler/icons-react";
import { LineChart } from "../modules/dashboard/LineChart";
import { ButtonGroup } from "../modules/shared/components/Buttons";
import { type } from "arktype";

const dashboardSearchSchema = type({
  graphType: '"overview" | "analytics" | "transactions" | "settings"',
});
export const Route = createFileRoute("/dashboard")({
  validateSearch: dashboardSearchSchema,
  component: () => (
    <ModulesContainer>
      <Dashboard />
    </ModulesContainer>
  ),
});

function Dashboard() {
  const { graphType } = Route.useSearch();
  const theme = useMantineTheme();

  return (
    <ModuleLayout>
      <Box>
        <ModuleTitle>Dashboard</ModuleTitle>
        <ThemedText>
          Welcome back! Here's an overview of your Binance account.
        </ThemedText>
      </Box>

      <Flex gap={3} justify="space-between" wrap="wrap" mt="5%">
        <InfoCard
          title="Total Balance"
          icon={<IconCurrencyDollar color={theme.colors.primaryYellow[0]} />}
          body="$12,546.78"
          subtitle="+2.5% from yesterday"
        />
        <InfoCard
          title="24h Change"
          icon={<IconPercentage color={theme.colors.primaryYellow[0]} />}
          body="+$345.92"
          subtitle="+2.8%"
        />
        <InfoCard
          title="Active Trades"
          icon={<IconFolder color={theme.colors.primaryYellow[0]} />}
          body="7"
          subtitle="Across 4 pairs"
        />
        <InfoCard
          title="Total Assets"
          icon={<IconWallet color={theme.colors.primaryYellow[0]} />}
          body="12"
          subtitle="BTC, ETH, BNB & more"
        />
      </Flex>

      <Box component="section" mt="3%">
        <ButtonGroup
          data={[
            { label: "Overview", key: "overview" },
            { label: "Analytics", key: "analytics" },
          ]}
          active={graphType}
        />
        <LineChart />
      </Box>
    </ModuleLayout>
  );
}
