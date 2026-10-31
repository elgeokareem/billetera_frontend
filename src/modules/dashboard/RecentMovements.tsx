import { Group, Paper, Stack, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCategories } from "../categories/hooks";
import { useMovementsList } from "../movements/hooks";
import type { Movement } from "../movements/types";
import {
  formatAmount,
  formatDate,
  formatUsd,
} from "../shared/format";
import { abs } from "../shared/money";
import { dashboardQueries } from "./queries";
import { SectionError, SectionSkeleton } from "./SectionStates";
import { movementFiling, movementTitle, priceNote, statusNote } from "./movementText";

const ACCENT = "accent.6";

interface RecentMovementsProps {
  now: Date;
  timeZone: string;
}

/** The five latest movements of any kind. A null USD value shows the coin amount, and why it has no price. */
export function RecentMovements({ now, timeZone }: RecentMovementsProps) {
  const { t } = useTranslation();
  const queries = dashboardQueries(now, timeZone);
  const recent = useMovementsList(queries.recent);
  const categories = useCategories();

  const names = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category.name])),
    [categories.data],
  );

  let body;
  if (recent.isPending || categories.isPending) {
    body = <SectionSkeleton lines={5} />;
  } else if (recent.isError) {
    body = <SectionError error={recent.error} onRetry={() => recent.refetch()} />;
  } else if (categories.isError) {
    body = <SectionError error={categories.error} onRetry={() => categories.refetch()} />;
  } else if (recent.data.movements.length === 0) {
    body = <Text size="sm" c="dimmed">{t("dashboard.recent.empty")}</Text>;
  } else {
    body = (
      <Stack gap={0}>
        {recent.data.movements.map((movement) => (
          <MovementRow
            key={movement.id}
            movement={movement}
            categoryName={movement.category_id === null ? undefined : names.get(movement.category_id)}
          />
        ))}
      </Stack>
    );
  }

  return (
    <Paper bg="dark.6" radius={12} p={{ base: 20, sm: 24 }}>
      <Group justify="space-between" align="center" gap="md" mb="xs">
        <Text component="h2" fw={600} fz={16} m={0}>
          {t("dashboard.recent.title")}
        </Text>
        <Link to="/movements" className="quiet-link">
          {t("dashboard.recent.viewAll")}
        </Link>
      </Group>
      {body}
    </Paper>
  );
}

function MovementRow({ movement, categoryName }: { movement: Movement; categoryName: string | undefined }) {
  const { t } = useTranslation();
  const title = movementTitle(movement, t);
  const filing = movementFiling(movement, categoryName, t);
  // A row whose title is already its kind doesn't repeat the kind in its second line.
  const detail = [
    formatDate(movement.occurred_at),
    filing.text === title ? null : filing.text,
    statusNote(movement, t),
  ].filter(Boolean);
  const missingPrice = priceNote(movement, t);
  const sign = movement.direction === "in" ? "+" : "-";

  return (
    <Group
      justify="space-between"
      align="flex-start"
      wrap="nowrap"
      gap="md"
      py={12}
      style={{ borderTop: "1px solid var(--mantine-color-dark-5)" }}
    >
      <Stack gap={2} miw={0}>
        <Text size="sm" fw={500} className="truncate">
          {title}
        </Text>
        <Text size="sm" c={filing.needsLabel ? ACCENT : "dimmed"}>
          {detail.join(" · ")}
        </Text>
      </Stack>
      <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
        {movement.usd_value !== null ? (
          <Text size="sm" fw={500} style={{ whiteSpace: "nowrap" }}>
            {sign}
            {formatUsd(abs(movement.usd_value))}
          </Text>
        ) : (
          <Text size="sm" fw={500} style={{ whiteSpace: "nowrap" }}>
            {sign}
            {formatAmount(abs(movement.amount), movement.asset)}
          </Text>
        )}
        {missingPrice && (
          <Text size="xs" c="dimmed">
            {missingPrice}
          </Text>
        )}
      </Stack>
    </Group>
  );
}
