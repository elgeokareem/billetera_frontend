import { Button, Group, Transition } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useMotionDuration } from "../shared/motion";
import { filterChips } from "./chips";
import type { MovementsSearch } from "./search";

interface FilterChipsProps {
  search: MovementsSearch;
  onChange: (next: MovementsSearch) => void;
  categoryName: (id: string) => string | undefined;
  now: Date;
}

/**
 * The active filters as removable buttons, with Clear all after them. Nothing is shown when no filter is set. The row fades in
 * when the first chip appears; removal is immediate, since the row is already empty by the time a chip goes.
 */
export function FilterChips({ search, onChange, categoryName, now }: FilterChipsProps) {
  const { t } = useTranslation();
  const motion = useMotionDuration();
  const chips = filterChips(search, { now, t, categoryName });

  return (
    <Transition mounted={chips.length > 0} transition="fade" duration={motion} exitDuration={0}>
      {(styles) => (
        <div style={styles}>
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
        </div>
      )}
    </Transition>
  );
}
