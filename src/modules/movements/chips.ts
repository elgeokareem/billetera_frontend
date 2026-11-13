import { rangeLabel, KIND_KEYS } from "./labels";
import {
  activePreset,
  listItems,
  type MovementsSearch,
  withFilter,
  withList,
  withoutKey,
  withText,
} from "./search";
import type { MovementKind } from "./types";

export type Translate = (key: string, options?: Record<string, string>) => string;

/** One active filter, as a removable chip. `without` is the search with this filter taken out. */
export interface FilterChip {
  key: string;
  label: string;
  without: MovementsSearch;
}

interface ChipOptions {
  now: Date;
  t: Translate;
  /** The name of a category ID, or undefined while the names are unknown. "none" is handled here. */
  categoryName: (id: string) => string | undefined;
}

/**
 * The active filters, one chip per value. A list filter has a chip for each of its items, and removing one leaves the
 * others. Each chip's label names its filter, such as "Kind: P2P", so a chip reads on its own.
 */
export function filterChips(search: MovementsSearch, { now, t, categoryName }: ChipOptions): FilterChip[] {
  const chips: FilterChip[] = [];
  const labelled = (filter: string, value: string) => t("movements.chips.labelled", { label: filter, value });

  if (search.q) {
    chips.push({ key: "q", label: labelled(t("movements.filters.search"), search.q), without: withText(search, "") });
  }
  const kinds = listItems(search.kind);
  for (const kind of kinds) {
    chips.push({
      key: `kind:${kind}`,
      label: labelled(t("movements.filters.kind"), t(KIND_KEYS[kind as MovementKind] ?? kind)),
      without: withList(search, "kind", kinds.filter((item) => item !== kind)),
    });
  }
  if (search.direction) {
    chips.push({
      key: "direction",
      label: t(`movements.direction.${search.direction}`),
      without: withFilter(search, "direction", undefined),
    });
  }
  const statuses = listItems(search.status);
  for (const status of statuses) {
    chips.push({
      key: `status:${status}`,
      label: labelled(t("movements.filters.status"), t(`movements.status.${status}`)),
      without: withList(search, "status", statuses.filter((item) => item !== status)),
    });
  }
  const assets = listItems(search.asset);
  for (const asset of assets) {
    chips.push({
      key: `asset:${asset}`,
      label: labelled(t("movements.filters.asset"), asset),
      without: withList(search, "asset", assets.filter((item) => item !== asset)),
    });
  }
  if (search.asset_match === "any") {
    chips.push({
      key: "asset_match",
      label: t("movements.chips.assetMatch"),
      without: withFilter(search, "asset_match", undefined),
    });
  }
  const categories = listItems(search.category_id);
  for (const id of categories) {
    const name = id === "none" ? t("movements.noCategory") : (categoryName(id) ?? "…");
    chips.push({
      key: `category:${id}`,
      label: labelled(t("movements.filters.category"), name),
      without: withList(search, "category_id", categories.filter((item) => item !== id)),
    });
  }
  const tags = listItems(search.tag);
  for (const tag of tags) {
    chips.push({
      key: `tag:${tag}`,
      label: labelled(t("movements.filters.tag"), tag),
      without: withList(search, "tag", tags.filter((item) => item !== tag)),
    });
  }
  if (search.tag_match === "all") {
    chips.push({
      key: "tag_match",
      label: t("movements.chips.tagMatch"),
      without: withFilter(search, "tag_match", undefined),
    });
  }
  const preset = activePreset(search, now);
  if (preset) {
    chips.push({
      key: "dates",
      label: labelled(t("movements.filters.dates"), t(`movements.dates.${preset}`)),
      without: withoutKey(search, "from"),
    });
  } else if (search.from && search.to) {
    chips.push({
      key: "dates",
      label: labelled(t("movements.filters.dates"), rangeLabel(search.from, search.to)),
      without: withoutKey(search, "from"),
    });
  }
  if (search.has_reason) {
    chips.push({
      key: "has_reason",
      label: t(search.has_reason === "true" ? "movements.chips.withReason" : "movements.chips.withoutReason"),
      without: withFilter(search, "has_reason", undefined),
    });
  }
  return chips;
}
