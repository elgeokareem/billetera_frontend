import { Badge, Group, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useTagColors } from "./hooks";
import { visibleTags } from "./names";
import { TagBadge } from "./TagBadge";

interface TagPillsProps {
  tags: readonly string[];
  /** When set, a pill becomes a button that picks its tag as a filter. */
  onPick?: (name: string) => void;
}

/**
 * The tags of a movement as pills: the first 3, then a +N pill whose title names the rest. Renders nothing when the
 * movement has no tags. With onPick, each shown pill is a button, for the desktop table. A tag missing from the cached
 * list draws gray.
 */
export function TagPills({ tags, onPick }: TagPillsProps) {
  const { t } = useTranslation();
  const colorOf = useTagColors();
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
            <TagBadge name={tag} color={colorOf(tag)} />
          </UnstyledButton>
        ) : (
          <TagBadge key={tag} name={tag} color={colorOf(tag)} />
        ),
      )}
      {hidden.length > 0 && (
        <Badge color="gray" variant="light" radius="xl" size="sm" title={hidden.join(", ")}>
          {t("movements.tags.more", { count: hidden.length })}
        </Badge>
      )}
    </Group>
  );
}
