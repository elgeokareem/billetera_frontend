import { Group, Pill, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { visibleTags } from "./names";

interface TagPillsProps {
  tags: readonly string[];
  /** When set, a pill becomes a button that picks its tag as a filter. */
  onPick?: (name: string) => void;
}

/**
 * The tags of a movement as pills: the first 3, then a +N pill whose title names the rest. Renders nothing when the
 * movement has no tags. With onPick, each shown pill is a button, for the desktop table.
 */
export function TagPills({ tags, onPick }: TagPillsProps) {
  const { t } = useTranslation();
  const { shown, hidden } = visibleTags(tags);
  if (tags.length === 0) {
    return null;
  }

  return (
    <Group gap={4} wrap="wrap">
      {shown.map((tag) =>
        onPick ? (
          <UnstyledButton
            key={tag}
            aria-label={t("movements.tags.filterBy", { name: tag })}
            onClick={(event) => {
              // The row opens its drawer on a click; picking a tag must not.
              event.stopPropagation();
              onPick(tag);
            }}
          >
            <Pill size="sm" bg="dark.4">
              {tag}
            </Pill>
          </UnstyledButton>
        ) : (
          <Pill key={tag} size="sm" bg="dark.4">
            {tag}
          </Pill>
        ),
      )}
      {hidden.length > 0 && (
        <Pill size="sm" bg="dark.4" title={hidden.join(", ")}>
          {t("movements.tags.more", { count: hidden.length })}
        </Pill>
      )}
    </Group>
  );
}
