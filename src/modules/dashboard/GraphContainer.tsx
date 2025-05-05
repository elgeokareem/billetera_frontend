import { Flex, Box, Text } from "@mantine/core";
import { ThemedText } from "../shared/components/CustomText";
import { LineChartComponent } from "./LineChart";
import { DashboardSearchSchema } from "../../routes/dashboard";

export function GraphContainer({
  switchValue,
}: {
  switchValue: DashboardSearchSchema["graphType"];
}) {
  return (
    <Flex mt="2%" gap={5} wrap="wrap">
      <Box w="60%">
        {switchValue === "overview" && (
          <>
            <ThemedText size="24px">Portfolio Performance</ThemedText>
            <ThemedText size="14px" mb="md">
              Your account value over time
            </ThemedText>
            <LineChartComponent
              series={[
                { name: "Apples", color: "indigo.6" },
                { name: "Oranges", color: "blue.6" },
                { name: "Tomatoes", color: "teal.6" },
              ]}
              data={[
                {
                  date: "Mar 22",
                  Apples: 2890,
                  Oranges: 2338,
                  Tomatoes: 2452,
                },
                {
                  date: "Mar 23",
                  Apples: 2756,
                  Oranges: 2103,
                  Tomatoes: 2402,
                },
                {
                  date: "Mar 24",
                  Apples: 3322,
                  Oranges: 986,
                  Tomatoes: 1821,
                },
                {
                  date: "Mar 25",
                  Apples: 3470,
                  Oranges: 2108,
                  Tomatoes: 2809,
                },
                {
                  date: "Mar 26",
                  Apples: 3129,
                  Oranges: 1726,
                  Tomatoes: 2290,
                },
              ]}
            />
          </>
        )}
        {switchValue !== "overview" && (
          <Flex justify="center" align="center" h="354px">
            <Text size="28px">Coming soon!</Text>
          </Flex>
        )}
      </Box>
    </Flex>
  );
}
