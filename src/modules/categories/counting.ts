import type { TFunction } from "i18next";
import { listItems, type MovementsSearch } from "../movements/search";
import type { Category } from "./types";

/**
 * The names of the flagged categories that this request is actually leaving out because of the flag. A request with
 * category_id shows exactly the named categories, flagged or not, so nothing is left out there. An explicit exclusion
 * is already spoken for by its own chip, so its category isn't named again. The order is the categories' own list order.
 */
export function notCountingNames(
  categories: readonly Category[] | undefined,
  search: Pick<MovementsSearch, "category_id" | "exclude_category_id">,
): string[] {
  if (!categories || listItems(search.category_id).length > 0) {
    return [];
  }
  const excluded = new Set(listItems(search.exclude_category_id));
  return categories
    .filter((category) => !category.counts_as_spending && !excluded.has(String(category.id)))
    .map((category) => category.name);
}

/**
 * The one dimmed line that says which categories the numbers leave out, such as "Not counting: Copy trading". Up to two
 * names are listed; from the third, only the first two are named and the rest are counted, so the line stays short.
 */
export function notCountingCaption(names: readonly string[], t: TFunction): string | null {
  if (names.length === 0) {
    return null;
  }
  const shown =
    names.length <= 2
      ? names.join(", ")
      : t("common.notCountingMore", { names: names.slice(0, 2).join(", "), count: names.length - 2 });
  return t("common.notCounting", { names: shown });
}
