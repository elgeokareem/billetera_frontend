import { Button, Group } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { filterChips } from "./chips";
import type { MovementsSearch } from "./search";

interface FilterChipsProps {
  search: MovementsSearch;
  onChange: (next: MovementsSearch) => void;
  categoryName: (id: string) => string | undefined;
  now: Date;
}

/** The active filters as removable buttons, with Clear all after them. Nothing is shown when no filter is set. */
export function FilterChips({ search, onChange, categoryName, now }: FilterChipsProps) {
  const { t } = useTranslation();
  const chips = filterChips(search, { now, t, categoryName });
  if (chips.length === 0) {
    return null;
  }

  return (
    <Group gap="xs" role="group" aria-label={t("movements.filters.active")}>
      {chips.map((chip) => (
        <Button
          key={chip.key}
          variant="default"
          radius="xl"
          mih={44}
          rightSection={<IconX size={16} aria-hidden />}
          aria-label={t("movements.chips.remove", { label: chip.label })}
          onClick={() => onChange(chip.without)}
        >
          {chip.label}
        </Button>
      ))}
      <Button variant="subtle" mih={44} onClick={() => onChange({})}>
        {t("movements.filters.clearAll")}
      </Button>
    </Group>
  );
}
