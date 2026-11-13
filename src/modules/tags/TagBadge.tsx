import { Badge } from "@mantine/core";
import { tagColor } from "./colors";

interface TagBadgeProps {
  name: string;
  /** A palette name; anything else, such as a tag not loaded yet, draws gray. */
  color: string;
  /** Badge size; "sm" fits table rows, the tags column uses a larger one. */
  size?: "sm" | "md" | "lg";
}

/**
 * A tag as a light badge in its color. tt="none" keeps the stored lower-case name, which Badge would otherwise upper-case.
 */
export function TagBadge({ name, color, size = "sm" }: TagBadgeProps) {
  return (
    <Badge component="span" color={tagColor(color)} variant="light" radius="xl" size={size} tt="none">
      {name}
    </Badge>
  );
}
