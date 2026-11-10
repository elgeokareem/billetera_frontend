import { Chip, Group } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { RangeKey } from "../chartRange";

/** Chips are at least 44px tall, as every control is. */
const CHIP_STYLES = { label: { minHeight: 44, paddingInline: 16 } };

/** The ranges of a chart, one chip each, in the order given. One is always picked. Every chart passes `RANGE_KEYS`. */
export function RangeChips({
  value,
  keys,
  onChange,
}: {
  value: RangeKey;
  keys: readonly RangeKey[];
  onChange: (range: RangeKey) => void;
}) {
  const { t } = useTranslation();

  return (
    <Chip.Group
      value={value}
      onChange={(next) => {
        const picked = keys.find((key) => key === next);
        if (picked !== undefined) {
          onChange(picked);
        }
      }}
    >
      <Group gap="xs">
        {keys.map((key) => (
          <Chip key={key} value={key} variant="outline" color="accent" styles={CHIP_STYLES}>
            {t(`chart.range.${key}`)}
          </Chip>
        ))}
      </Group>
    </Chip.Group>
  );
}
