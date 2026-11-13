import { Group, Paper, Stack, Text } from "@mantine/core";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { movementTitle } from "../dashboard/movementText";
import { formatDate } from "../shared/format";
import { TagPills } from "../tags/TagPills";
import { CoinAmount, StatusBadge, UsdValue } from "./MovementParts";
import { ACCENT } from "./labels";
import { needsLabel } from "./spending";
import type { Movement } from "./types";

interface MovementCardsProps {
  rows: readonly Movement[];
  categoryNames: ReadonlyMap<number, string>;
  /** Opens the detail drawer of a movement. */
  onOpen: (movement: Movement) => void;
}

/**
 * The movements as a list of cards, below 768px. Each card holds what a table row holds, and a tap opens its detail. A card
 * is a button for the keyboard too.
 */
function MovementCardsView({ rows, categoryNames, onOpen }: MovementCardsProps) {
  const { t } = useTranslation();

  return (
    <Stack gap="sm" hiddenFrom="sm">
      {rows.map((movement) => {
        const name = movement.category_id === null ? undefined : categoryNames.get(movement.category_id);
        const labelNeeded = name === undefined && needsLabel(movement);
        const filing =
          name ??
          (movement.category_id !== null
            ? t("movements.categoryUnknown")
            : labelNeeded
              ? t("movements.needsLabel")
              : t("movements.noCategory"));
        return (
          <Paper
            key={movement.id}
            bg="dark.6"
            radius={12}
            p={{ base: 16, xs: 20 }}
            role="button"
            tabIndex={0}
            aria-label={`${movementTitle(movement, t)} ${formatDate(movement.occurred_at)}`}
            style={{ cursor: "pointer" }}
            onClick={() => onOpen(movement)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen(movement);
              }
            }}
          >
            <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
              <Stack gap={4} miw={0}>
                <Group gap="xs" wrap="wrap">
                  <Text fw={600} fz={16} lh={1.3} className="truncate">
                    {movementTitle(movement, t)}
                  </Text>
                  <StatusBadge movement={movement} />
                </Group>
                <Text size="sm" c={labelNeeded ? ACCENT : "dimmed"}>
                  {formatDate(movement.occurred_at)} · {filing}
                </Text>
                {movement.reason && movementTitle(movement, t) !== movement.reason && (
                  <Text size="sm" c="dimmed" className="truncate">
                    {movement.reason}
                  </Text>
                )}
                {movement.tags.length > 0 && <TagPills tags={movement.tags} />}
              </Stack>
              <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
                <UsdValue movement={movement} />
                {movement.usd_value !== null && <CoinAmount movement={movement} />}
              </Stack>
            </Group>
          </Paper>
        );
      })}
    </Stack>
  );
}

/** Memoised, like the table, so typing in the search box doesn't re-render the cards. */
export const MovementCards = memo(MovementCardsView);
