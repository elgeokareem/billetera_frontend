import { Button, Checkbox, Chip, Group, MultiSelect, SegmentedControl, SimpleGrid, Stack, TagsInput, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Category } from "../categories/types";
import { KIND_KEYS, rangeLabel } from "./labels";
import {
  activePreset,
  assetSymbols,
  NEEDS_LABEL_SEARCH,
  DATE_PRESETS,
  type DatePreset,
  listItems,
  MOVEMENT_KINDS,
  MOVEMENT_STATUSES,
  type MovementsSearch,
  presetRange,
  withFilter,
  withList,
  withoutKey,
} from "./search";
import type { MovementStatus } from "./types";

/** Chips are at least 44px tall, as every control is. */
const CHIP_STYLES = { label: { minHeight: 44, paddingInline: 16 } };

interface MovementFiltersProps {
  search: MovementsSearch;
  onChange: (next: MovementsSearch) => void;
  /** The categories to offer. Until they load, only "No category" is offered. */
  categories: readonly Category[] | undefined;
  /** The day the date presets are measured from. */
  now: Date;
}

/** The filters of the Movements view. Each control writes its filter to the URL, so the list follows at once. */
export function MovementFilters({ search, onChange, categories, now }: MovementFiltersProps) {
  const { t } = useTranslation();
  const preset = activePreset(search, now);
  const custom = !preset && search.from && search.to ? rangeLabel(search.from, search.to) : undefined;
  const dateValue = preset ?? (custom ? "custom" : "all");
  const categoryData = [
    { value: "none", label: t("movements.noCategory") },
    ...(categories ?? []).map((category) => ({ value: String(category.id), label: category.name })),
  ];

  function pickDates(value: string | null) {
    if (!value || value === "all") {
      onChange(withoutKey(search, "from"));
    } else if (value !== "custom") {
      const range = presetRange(value as DatePreset, now);
      onChange({ ...search, from: range.from, to: range.to });
    }
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg" verticalSpacing="lg">
      <FilterGroup label={t("movements.filters.kind")}>
        <Chip.Group multiple value={listItems(search.kind)} onChange={(items) => onChange(withList(search, "kind", items))}>
          <Group gap="xs">
            {MOVEMENT_KINDS.map((kind) => (
              <Chip key={kind} value={kind} variant="outline" color="accent" styles={CHIP_STYLES}>
                {t(KIND_KEYS[kind])}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      </FilterGroup>

      <FilterGroup label={t("movements.filters.status")}>
        <Chip.Group
          multiple
          value={listItems(search.status)}
          onChange={(items) => onChange(withList(search, "status", items))}
        >
          <Group gap="xs">
            {MOVEMENT_STATUSES.map((status: MovementStatus) => (
              <Chip key={status} value={status} variant="outline" color="accent" styles={CHIP_STYLES}>
                {t(`movements.status.${status}`)}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      </FilterGroup>

      <FilterGroup label={t("movements.filters.direction")}>
        <SegmentedControl
          aria-label={t("movements.filters.direction")}
          value={search.direction ?? "any"}
          onChange={(value) => onChange(withFilter(search, "direction", value === "in" || value === "out" ? value : undefined))}
          data={[
            { value: "any", label: t("movements.direction.any") },
            { value: "in", label: t("movements.direction.in") },
            { value: "out", label: t("movements.direction.out") },
          ]}
        />
      </FilterGroup>

      <FilterGroup label={t("movements.filters.asset")}>
        <TagsInput
          aria-label={t("movements.filters.asset")}
          placeholder={t("movements.filters.assetPlaceholder")}
          value={listItems(search.asset)}
          onChange={(items) => onChange(withList(search, "asset", assetSymbols(items)))}
          clearable
        />
        <Checkbox
          label={t("movements.filters.assetMatch")}
          checked={search.asset_match === "any"}
          disabled={!search.asset}
          onChange={(event) =>
            onChange(withFilter(search, "asset_match", event.currentTarget.checked ? "any" : undefined))
          }
        />
      </FilterGroup>

      <FilterGroup label={t("movements.filters.category")}>
        <MultiSelect
          aria-label={t("movements.filters.category")}
          placeholder={t("movements.filters.categoryPlaceholder")}
          data={categoryData}
          value={listItems(search.category_id)}
          onChange={(items) => onChange(withList(search, "category_id", items))}
          searchable
          clearable
          hidePickedOptions
        />
        {/* The preset the Dashboard links with: spending with no category, from any date. It replaces the other filters. */}
        <Button variant="default" radius="xl" mih={44} onClick={() => onChange(NEEDS_LABEL_SEARCH)}>
          {t("movements.filters.needsLabel")}
        </Button>
      </FilterGroup>

      <FilterGroup label={t("movements.filters.dates")}>
        <Chip.Group value={dateValue} onChange={(value) => pickDates(value)}>
          <Group gap="xs">
            <Chip value="all" variant="outline" color="accent" styles={CHIP_STYLES}>
              {t("movements.dates.all")}
            </Chip>
            {DATE_PRESETS.map((item) => (
              <Chip key={item} value={item} variant="outline" color="accent" styles={CHIP_STYLES}>
                {t(`movements.dates.${item}`)}
              </Chip>
            ))}
            {custom && (
              <Chip value="custom" variant="outline" color="accent" styles={CHIP_STYLES}>
                {custom}
              </Chip>
            )}
          </Group>
        </Chip.Group>
      </FilterGroup>

      <FilterGroup label={t("movements.filters.reason")}>
        <SegmentedControl
          aria-label={t("movements.filters.reason")}
          value={search.has_reason ?? "any"}
          onChange={(value) =>
            onChange(withFilter(search, "has_reason", value === "true" || value === "false" ? value : undefined))
          }
          data={[
            { value: "any", label: t("movements.reason.any") },
            { value: "true", label: t("movements.reason.yes") },
            { value: "false", label: t("movements.reason.no") },
          ]}
        />
      </FilterGroup>
    </SimpleGrid>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={8} miw={0} role="group" aria-label={label}>
      <Text fz="sm" fw={500} c="dimmed">
        {label}
      </Text>
      {children}
    </Stack>
  );
}
