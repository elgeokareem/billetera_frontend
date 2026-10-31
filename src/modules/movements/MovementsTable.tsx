import { Box, Select, Stack, Table, Text, UnstyledButton } from "@mantine/core";
import { memo, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import type { Category } from "../categories/types";
import { kindKey } from "../dashboard/movementText";
import { formatDate } from "../shared/format";
import { CoinAmount, StatusBadge, UsdValue } from "./MovementParts";
import { NO_CATEGORY } from "./patch";
import { needsLabel } from "./spending";
import type { Movement } from "./types";

interface MovementsTableProps {
  rows: readonly Movement[];
  /** The categories the inline select offers. Undefined until they load. */
  categories: readonly Category[] | undefined;
  /** Opens the detail drawer of a movement. */
  onOpen: (movement: Movement) => void;
  /** Files a movement under a category, or under none (null). */
  onCategoryChange: (movement: Movement, categoryId: number | null) => void;
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
  savingId,
}: MovementsTableProps) {
  const { t } = useTranslation();
  const categoryData = [
    { value: NO_CATEGORY, label: t("movements.noCategory") },
    ...(categories ?? []).map((category) => ({ value: String(category.id), label: category.name })),
  ];

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
                  </Stack>
                </Table.Td>
                <Table.Td miw={190}>
                  {/* The select stops its clicks here, so a choice in it never opens the row. */}
                  <Box onClick={(event) => event.stopPropagation()}>
                    <Select
                      aria-label={t("movements.table.category")}
                      data={categoryData}
                      value={movement.category_id === null ? null : String(movement.category_id)}
                      placeholder={labelNeeded ? t("movements.needsLabel") : t("movements.noCategory")}
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
                </Table.Td>
                <Table.Td maw={260}>
                  <Text fz="sm" className="truncate" c={movement.reason ? undefined : "dimmed"}>
                    {movement.reason ?? "—"}
                  </Text>
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
