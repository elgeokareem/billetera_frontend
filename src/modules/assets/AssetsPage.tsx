import { Stack, Text, Title } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { browserTimeZone } from "../shared/dateRange";
import { AssetSummary } from "./AssetSummary";
import { BalanceHistory } from "./BalanceHistory";
import { CoinList } from "./CoinList";

/**
 * The Assets view: the total of the latest snapshot, the balance over a range, and the coins. The start of each range and the
 * zone are taken once, so the query keys hold while the page is open, the same as the Dashboard.
 */
export function AssetsPage() {
  const { t } = useTranslation();
  const [now] = useState(() => new Date());
  const [timeZone] = useState(browserTimeZone);

  return (
    <Stack gap="lg">
      <div>
        <Title order={1} fz={{ base: 30, sm: 40 }} lh={1.1}>
          {t("assets.title")}
        </Title>
        <Text c="dimmed" mt="xs">
          {t("assets.subtitle")}
        </Text>
      </div>
      <AssetSummary />
      <BalanceHistory now={now} timeZone={timeZone} />
      <CoinList />
    </Stack>
  );
}
