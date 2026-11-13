import { Box, Group, Select, Stack, Table, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { memo, type MouseEvent, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Category } from "../categories/types";
import { kindKey } from "../dashboard/movementText";
import { formatDate } from "../shared/format";
import { TagPills } from "../tags/TagPills";
import { CoinAmount, ReviewBadge, StatusBadge, UsdValue } from "./MovementParts";
import { NO_CATEGORY } from "./patch";
import { needsLabel } from "./spending";
import { splitSegments } from "./splits";
import { SplitSegments } from "./SplitSegments";
import type { Movement } from "./types";

interface MovementsTableProps {
  rows: readonly Movement[];
  /** The categories the inline select offers. Undefined until they load. */
  categories: readonly Category[] | undefined;
  /** Opens the detail drawer of a movement. */
  onOpen: (movement: Movement) => void;
  /** Files a movement under a category, or under none (null). */
  onCategoryChange: (movement: Movement, categoryId: number | null) => void;
  /** Adds a tag of a row to the tag filter. */
  onTagPick: (name: string) => void;
  /** The movement whose category is being saved, if any. Its select is disabled meanwhile. */
  savingId: number | null;
}

/**
 * The movements as a table, from 768px up. A row opens its detail, and the category can be changed in the row. It scrolls
 * sideways when the screen is narrower than its content.
 */
function MovementsTableView({
  rows,
  categories,
  onOpen,
  onCategoryChange,
  onTagPick,
  savingId,
}: MovementsTableProps) {
  const { t } = useTranslation();
  const categoryData = [
    { value: NO_CATEGORY, label: t("movements.noCategory") },
    ...(categories ?? []).map((category) => ({ value: String(category.id), label: category.name })),
  ];
  const names = useMemo(
    () => new Map((categories ?? []).map((category) => [category.id, category.name])),
    [categories],
  );
  const nameOf = (categoryId: number | null) =>
    categoryId === null
      ? t("movements.noCategory")
      : (names.get(categoryId) ?? t("movements.categoryUnknown"));

  // The split button's name: the count and names only, never an amount, so a screen reader has nothing to read aloud
  // when balances are hidden.
  function splitLabel(movement: Movement) {
    const all = splitSegments(movement, nameOf);
    const count = all.segments.length + all.more;
    const labels = [
      ...all.segments.map((segment) => segment.name),
      ...(all.more > 0 ? [t("movements.split.more", { count: all.more })] : []),
    ];
    return t("movements.split.segmentsLabel", {
      count,
      names: labels.join(", "),
    });
  }

  // A click on a control inside the row, or on an option of an open select, belongs to that control.
  function openFromRow(event: MouseEvent<HTMLTableRowElement>, movement: Movement) {
    const target = event.target as HTMLElement;
    if (!event.currentTarget.contains(target) || target.closest("button, input, a, label")) {
      return;
    }
    onOpen(movement);
  }

  return (
    <Table.ScrollContainer minWidth={760} visibleFrom="sm">
      <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th c="dimmed" fw={500}>{t("movements.table.date")}</Table.Th>
            <Table.Th c="dimmed" fw={500}>{t("movements.table.kind")}</Table.Th>
            <Table.Th c="dimmed" fw={500}>{t("movements.table.category")}</Table.Th>
            <Table.Th c="dimmed" fw={500}>{t("movements.table.reason")}</Table.Th>
            <Table.Th c="dimmed" fw={500} ta="right">{t("movements.table.amount")}</Table.Th>
            <Table.Th c="dimmed" fw={500} ta="right">{t("movements.table.usd")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((movement) => {
            const labelNeeded = movement.category_id === null && needsLabel(movement);
            const splitShown =
              movement.split_status === "applied" || movement.split_status === "exceeds";
            return (
              <Table.Tr
                key={movement.id}
                onClick={(event) => openFromRow(event, movement)}
                style={{ cursor: "pointer" }}
              >
                <Table.Td c="dimmed" style={{ whiteSpace: "nowrap" }}>
                  {formatDate(movement.occurred_at)}
                </Table.Td>
                <Table.Td>
                  <Stack gap={4} align="flex-start">
                    <UnstyledButton
                      fz="sm"
                      fw={500}
                      onClick={() => onOpen(movement)}
                      aria-label={`${t(kindKey(movement))} ${formatDate(movement.occurred_at)}`}
                    >
                      {t(kindKey(movement))}
                    </UnstyledButton>
                    <StatusBadge movement={movement} />
                    <ReviewBadge movement={movement} />
                  </Stack>
                </Table.Td>
                <Table.Td miw={190}>
                  {splitShown ? (
                    // The segments open the drawer; the row's own click handler would do the same, but the button keeps
                    // the category cell keyboard operable and names the split for a screen reader.
                    <Box onClick={(event) => event.stopPropagation()}>
                      <UnstyledButton
                        fz="sm"
                        onClick={() => onOpen(movement)}
                        aria-label={splitLabel(movement)}
                      >
                        <Group gap={4} wrap="wrap" align="center">
                          {movement.split_status === "exceeds" && (
                            <Tooltip label={t("movements.split.exceedsShort")} withArrow>
                              <IconAlertTriangle
                                size={16}
                                color="var(--mantine-color-yellow-5)"
                                aria-hidden
                              />
                            </Tooltip>
                          )}
                          <SplitSegments movement={movement} nameOf={nameOf} />
                        </Group>
                      </UnstyledButton>
                    </Box>
                  ) : (
                    <>
                      {/* The select stops its clicks here, so a choice in it never opens the row. */}
                      <Box onClick={(event) => event.stopPropagation()}>
                        <Select
                          aria-label={t("movements.table.category")}
                          data={categoryData}
                          value={movement.category_id === null ? null : String(movement.category_id)}
                          placeholder={
                            movement.category_id !== null
                              ? t("movements.categoryUnknown")
                              : labelNeeded
                                ? t("movements.needsLabel")
                                : t("movements.noCategory")
                          }
                          classNames={{ input: labelNeeded ? "needs-label-input" : undefined }}
                          styles={{ input: { minHeight: 44, fontSize: 14 } }}
                          // A list of 50 rows would otherwise keep 50 hidden dropdowns in the page.
                          comboboxProps={{ keepMounted: false }}
                          allowDeselect={false}
                          disabled={categories === undefined || savingId === movement.id}
                          onChange={(value) => {
                            if (!value) {
                              return;
                            }
                            const next = value === NO_CATEGORY ? null : Number(value);
                            if (next !== movement.category_id) {
                              onCategoryChange(movement, next);
                            }
                          }}
                        />
                      </Box>
                      {movement.split_status === "unpriced" && (
                        <Text fz="xs" c="dimmed" mt={4}>
                          {t("movements.split.waiting")}
                        </Text>
                      )}
                    </>
                  )}
                </Table.Td>
                <Table.Td maw={260}>
                  <Stack gap={4}>
                    {movement.reason && (
                      <Text fz="sm" className="truncate">
                        {movement.reason}
                      </Text>
                    )}
                    {movement.tags.length > 0 && (
                      <TagPills tags={movement.tags} onPick={onTagPick} />
                    )}
                    {!movement.reason && movement.tags.length === 0 && (
                      <Text fz="sm" c="dimmed">
                        —
                      </Text>
                    )}
                  </Stack>
                </Table.Td>
                <Table.Td ta="right">
                  <CoinAmount movement={movement} />
                </Table.Td>
                <Table.Td>
                  <UsdValue movement={movement} />
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

/** Memoised: a keystroke in the search box doesn't re-render every row. */
export const MovementsTable = memo(MovementsTableView);
