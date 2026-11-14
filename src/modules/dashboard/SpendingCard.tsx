import { Box, Group, Paper, Stack, Text, VisuallyHidden } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCategories } from "../categories/hooks";
import { CategoriesUnavailable } from "../categories/CategoriesUnavailable";
import { useMovementTotals } from "../movements/hooks";
import { spendingBreakdown, movementCount, type CategorySpending } from "../movements/spending";
import { NO_CATEGORY_COLOR, SEGMENT_COLORS } from "../shared/categoryColors";
import { Sensitive } from "../shared/components/Sensitive";
import { formatMonth, formatUsd } from "../shared/format";
import { compare, percentOf } from "../shared/money";
import { MASK } from "../shared/privacy";
import { useBalancesHidden } from "../shared/usePrivacy";
import { dashboardQueries } from "./queries";
import { SectionError, SectionSkeleton } from "./SectionStates";

interface SpendingCardProps {
  now: Date;
  timeZone: string;
}

/** This month's spending by category, with the largest first and spending with no category last. */
export function SpendingCard({ now, timeZone }: SpendingCardProps) {
  const { t } = useTranslation();
  const hidden = useBalancesHidden();
  const queries = dashboardQueries(now, timeZone);
  const spending = useMovementTotals(queries.spending);
  const unconfirmed = useMovementTotals(queries.unconfirmedSpending);
  const categories = useCategories();

  const unconfirmedCount = unconfirmed.data ? movementCount(unconfirmed.data) : null;

  const breakdown = useMemo(
    () => (spending.data ? spendingBreakdown(spending.data.assets) : null),
    [spending.data],
  );
  const names = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category.name])),
    [categories.data],
  );

  const nameOf = (group: CategorySpending) =>
    group.categoryId === null
      ? t("dashboard.spending.noCategory")
      : (names.get(group.categoryId) ?? t("movements.categoryUnknown"));

  let body;
  if (spending.isPending || categories.isPending) {
    body = <SectionSkeleton lines={4} />;
  } else if (spending.isError) {
    body = <SectionError error={spending.error} onRetry={() => spending.refetch()} />;
  } else {
    let content;
    if (!breakdown || breakdown.count === 0) {
      content = <Text size="sm" c="dimmed">{t("dashboard.spending.empty")}</Text>;
    } else {
      const groups = breakdown.categories;
      const total = breakdown.total;
      let colorIndex = 0;
      const segments = groups.map((group) => {
        const color = group.categoryId === null ? NO_CATEGORY_COLOR : SEGMENT_COLORS[colorIndex++ % SEGMENT_COLORS.length];
        // The share stays a decimal string, from money.ts, all the way to the CSS width.
        const share = group.usd === null ? null : percentOf(group.usd, total);
        return { color, share, key: group.categoryId ?? "none" };
      });

      // The summary is a sentence with the total inside it. Hidden, the total shows as the mask, and is read as "Hidden".
      const summary = (amount: string) => t("dashboard.spending.summary", { total: amount, count: groups.length });

      content = (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {hidden ? (
              <>
                <span aria-hidden="true">{summary(MASK)}</span>
                <VisuallyHidden>{summary(t("privacy.hidden"))}</VisuallyHidden>
              </>
            ) : (
              summary(formatUsd(total))
            )}
          </Text>
          {unconfirmedCount !== null && unconfirmedCount > 0 && (
            <Text size="sm" c="dimmed">
              {t("dashboard.spending.unconfirmed", { count: unconfirmedCount })}
            </Text>
          )}
          <Box
            role="img"
            aria-label={summary(hidden ? t("privacy.hidden") : formatUsd(total))}
            style={{ display: "flex", gap: 2, height: 12, borderRadius: 6, overflow: "hidden" }}
          >
            {segments
              .filter((segment) => segment.share !== null && compare(segment.share, "0") > 0)
              .map((segment) => (
                <Box key={segment.key} style={{ width: `${segment.share}%`, background: segment.color }} />
              ))}
          </Box>
          <Stack gap={0}>
            {groups.map((group) => (
              <Group key={group.categoryId ?? "none"} justify="space-between" py={6} wrap="nowrap" gap="md">
                <Text size="sm" className="truncate">
                  {nameOf(group)}
                </Text>
                <Text size="sm" fw={500} style={{ whiteSpace: "nowrap" }}>
                  {group.usd === null ? formatUsd(group.usd) : <Sensitive>{formatUsd(group.usd)}</Sensitive>}
                </Text>
              </Group>
            ))}
          </Stack>
          {breakdown.unpricedCount > 0 && (
            <Text size="sm" c="yellow.4">
              {t("dashboard.spending.notPriced", { count: breakdown.unpricedCount })}
            </Text>
          )}
        </Stack>
      );
    }
    body = categories.isError ? (
      <Stack gap="sm">
        {content}
        <CategoriesUnavailable onRetry={() => categories.refetch()} />
      </Stack>
    ) : (
      content
    );
  }

  return (
    <Paper bg="dark.6" radius={12} p={{ base: 20, sm: 24 }}>
      <Text component="h2" fw={600} fz={16} m={0} mb={4}>
        {t("dashboard.spending.title", { month: formatMonth(now) })}
      </Text>
      {body}
    </Paper>
  );
}
