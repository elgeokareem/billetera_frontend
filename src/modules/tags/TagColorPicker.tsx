import { ActionIcon, ColorSwatch, Popover, SimpleGrid, UnstyledButton } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TAG_COLORS, tagColor } from "./colors";
import type { TagColor } from "./types";

interface TagColorPickerProps {
  name: string;
  color: string;
  onPick: (color: TagColor) => void;
  disabled?: boolean;
}

/**
 * The color button of a tag row and its palette popover: the 12 colors in a 4×3 grid, the current one marked. Picking a
 * color closes the popover and reports it; picking the current one only closes it.
 */
export function TagColorPicker({ name, color, onPick, disabled }: TagColorPickerProps) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const current = tagColor(color);

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-start" shadow="md" withinPortal>
      <Popover.Target>
        <ActionIcon
          variant="default"
          radius="xl"
          size={44}
          aria-label={t("tags.color.change", { name })}
          aria-expanded={opened}
          disabled={disabled}
          onClick={() => setOpened((open) => !open)}
        >
          <ColorSwatch
            component="span"
            color={`var(--mantine-color-${current}-6)`}
            size={20}
            withShadow={false}
          />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <SimpleGrid cols={4} spacing={6}>
          {TAG_COLORS.map((option) => {
            const label = t(`tags.color.names.${option}`);
            return (
              <UnstyledButton
                key={option}
                aria-label={label}
                title={label}
                onClick={() => {
                  setOpened(false);
                  if (option !== current) {
                    onPick(option);
                  }
                }}
                style={{
                  width: 36,
                  height: 36,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "50%",
                }}
              >
                <ColorSwatch
                  component="span"
                  color={`var(--mantine-color-${option}-6)`}
                  size={22}
                  withShadow={false}
                >
                  {option === current ? (
                    <IconCheck
                      size={14}
                      stroke={3}
                      style={{ color: "white", filter: "drop-shadow(0 0 1px rgba(0, 0, 0, 0.9))" }}
                    />
                  ) : null}
                </ColorSwatch>
              </UnstyledButton>
            );
          })}
        </SimpleGrid>
      </Popover.Dropdown>
    </Popover>
  );
}
