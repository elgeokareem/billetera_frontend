import { Group, Paper, Stack, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { Fragment, type ReactNode, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCategories } from "../categories/hooks";
import { CategoriesUnavailable } from "../categories/CategoriesUnavailable";
import { useMovementsList } from "../movements/hooks";
import { ReviewBadge } from "../movements/MovementParts";
import { SplitSegments } from "../movements/SplitSegments";
import type { Movement } from "../movements/types";
import { Sensitive } from "../shared/components/Sensitive";
import {
  formatDate,
  formatQuantity,
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
  const nameOf = (categoryId: number | null) =>
    categoryId === null
      ? t("movements.noCategory")
      : (names.get(categoryId) ?? t("movements.categoryUnknown"));

  let body;
  if (recent.isPending || categories.isPending) {
    body = <SectionSkeleton lines={5} />;
  } else if (recent.isError) {
    body = <SectionError error={recent.error} onRetry={() => recent.refetch()} />;
  } else {
    const content =
      recent.data.movements.length === 0 ? (
        <Text size="sm" c="dimmed">{t("dashboard.recent.empty")}</Text>
      ) : (
        <Stack gap={0}>
          {recent.data.movements.map((movement) => (
            <MovementRow
              key={movement.id}
              movement={movement}
              categoryName={movement.category_id === null ? undefined : names.get(movement.category_id)}
              nameOf={nameOf}
            />
          ))}
        </Stack>
      );
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

function MovementRow({
  movement,
  categoryName,
  nameOf,
}: {
  movement: Movement;
  categoryName: string | undefined;
  nameOf: (categoryId: number | null) => string;
}) {
  const { t } = useTranslation();
  const title = movementTitle(movement, t);
  const filing = movementFiling(movement, categoryName, t, nameOf);
  // A row whose title is already its kind doesn't repeat the kind in its second line.
  const detail: ReactNode[] = [formatDate(movement.occurred_at)];
  if (filing.text !== title) {
    detail.push(
      filing.segments ? (
        <SplitSegments key="filing" movement={movement} nameOf={nameOf} max={1} />
      ) : (
        filing.text
      ),
    );
  }
  const note = statusNote(movement, t);
  if (note) {
    detail.push(note);
  }
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
        <Group gap="xs" wrap="wrap">
          <Text size="sm" fw={500} className="truncate">
            {title}
          </Text>
          <ReviewBadge movement={movement} />
        </Group>
        <Text size="sm" c={filing.needsLabel ? ACCENT : "dimmed"}>
          {detail.map((node, index) => (
            <Fragment key={index}>
              {index > 0 ? " · " : null}
              {node}
            </Fragment>
          ))}
        </Text>
      </Stack>
      <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
        {movement.usd_value !== null ? (
          <Text size="sm" fw={500} style={{ whiteSpace: "nowrap" }}>
            <Sensitive>{`${sign}${formatUsd(abs(movement.usd_value))}`}</Sensitive>
          </Text>
        ) : (
          <Text size="sm" fw={500} style={{ whiteSpace: "nowrap" }}>
            <Sensitive>{`${sign}${formatQuantity(abs(movement.amount))}`}</Sensitive> {movement.asset}
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
