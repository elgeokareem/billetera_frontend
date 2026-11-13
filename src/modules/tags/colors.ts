import type { CSSProperties } from "react";
import type { Tag, TagColor } from "./types";

/** The palette, in the backend's order. A tag's color is always one of these names. */
export const TAG_COLORS: readonly TagColor[] = [
  "red",
  "pink",
  "grape",
  "violet",
  "indigo",
  "blue",
  "cyan",
  "teal",
  "green",
  "lime",
  "yellow",
  "orange",
];

/**
 * The palette color of a value, or gray when it's missing or outside the palette (an older cache entry, or a malformed
 * response). Badge and ColorSwatch accept both names.
 */
export function tagColor(value: string | undefined): TagColor | "gray" {
  return TAG_COLORS.includes(value as TagColor) ? (value as TagColor) : "gray";
}

/**
 * The light-variant colors of a palette name, as Mantine computes them for the active color scheme. Pills have no color
 * prop, so the two variables are applied as a style instead.
 */
export function tagColorStyle(color: string): CSSProperties {
  return {
    backgroundColor: `var(--mantine-color-${color}-light)`,
    color: `var(--mantine-color-${color}-light-color)`,
  };
}

/**
 * A name-to-color lookup over the cached tags. A name that isn't there (still loading, failed, or typed but not saved)
 * and a color outside the palette both draw gray.
 */
export function tagColorLookup(tags: readonly Tag[] | undefined): (name: string) => TagColor | "gray" {
  const colors = new Map<string, TagColor | "gray">();
  for (const tag of tags ?? []) {
    colors.set(tag.name, tagColor(tag.color));
  }
  return (name) => colors.get(name) ?? "gray";
}
