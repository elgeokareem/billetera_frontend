import { Chip, Group } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { RANGE_KEYS, type RangeKey } from "./queries";

/** Chips are at least 44px tall, as every control is. */
const CHIP_STYLES = { label: { minHeight: 44, paddingInline: 16 } };

function isRangeKey(value: unknown): value is RangeKey {
  return RANGE_KEYS.includes(value as RangeKey);
}

/** The ranges of a chart, one chip each. One is always picked. */
export function RangeChips({ value, onChange }: { value: RangeKey; onChange: (range: RangeKey) => void }) {
  const { t } = useTranslation();

  return (
    <Chip.Group
      value={value}
      onChange={(next) => {
        if (isRangeKey(next)) {
          onChange(next);
        }
      }}
    >
      <Group gap="xs">
        {RANGE_KEYS.map((key) => (
          <Chip key={key} value={key} variant="outline" color="accent" styles={CHIP_STYLES}>
            {t(`assets.range.${key}`)}
          </Chip>
        ))}
      </Group>
    </Chip.Group>
  );
}
