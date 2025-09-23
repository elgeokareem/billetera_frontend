import { createFileRoute } from "@tanstack/react-router";
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
import { ButtonGroup } from "../modules/shared/components/Buttons";
import { type } from "arktype";
import { GraphContainer } from "../modules/dashboard/GraphContainer";

const dashboardSearchSchema = type({
  graphType: '"overview" | "analytics" | "transactions" | "settings"',
});
export type DashboardSearchSchema = typeof dashboardSearchSchema.infer;
export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    // const hasAccess = isAuthenticated();
    // if (!hasAccess) {
    //   return redirect({ to: "/login" });
    // }
  },
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
  const navigate = Route.useNavigate();

  const onSearchNavigate = (value: DashboardSearchSchema["graphType"]) => {
    navigate({ search: () => ({ graphType: value }) });
  };

  const BUTTONS_DATA: {
    label: string;
    key: DashboardSearchSchema["graphType"];
  }[] = [
    { label: "Overview", key: "overview" },
    { label: "Analytics", key: "analytics" },
  ];

  return (
    <ModuleLayout>
      <Box>
        <ModuleTitle>Dashboard</ModuleTitle>
        <ThemedText>
          Welcome back! Here's an overview of your Binance account.
        </ThemedText>
      </Box>

      <Flex gap={3} justify="space-between" wrap="wrap" mt="3%">
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
          data={BUTTONS_DATA}
          active={graphType}
          onClick={onSearchNavigate}
        />

        <GraphContainer switchValue={graphType} />
      </Box>
    </ModuleLayout>
  );
}
