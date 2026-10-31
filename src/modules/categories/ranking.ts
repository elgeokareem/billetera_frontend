import type { Category } from "./types";

/** At most this many categories are listed as buttons. Above it, the label card shows the most used of them. */
const BUTTONS_UNTIL = 6;
/** How many buttons the label card shows once there are more categories than BUTTONS_UNTIL. */
const SHOWN_BUTTONS = 5;

/** The order the backend uses: by name, ignoring case, then by ID. */
export function byName(a: Category, b: Category) {
  const left = a.name.toLowerCase();
  const right = b.name.toLowerCase();
  if (left !== right) {
    return left < right ? -1 : 1;
  }
  return a.id - b.id;
}

/**
 * Splits the categories a label card offers. Up to six, every one is a button, in name order. With more, the five most
 * used this month are buttons, most used first, and the rest go in a select, in name order. uses maps a category ID to
 * how many spending movements it had this month.
 */
export function splitCategories(
  categories: readonly Category[],
  uses: ReadonlyMap<number, number>,
) {
  if (categories.length <= BUTTONS_UNTIL) {
    return { buttons: [...categories], more: [] as Category[] };
  }
  const ranked = [...categories].sort(
    (a, b) => (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0) || byName(a, b),
  );
  return {
    buttons: ranked.slice(0, SHOWN_BUTTONS),
    more: ranked.slice(SHOWN_BUTTONS).sort(byName),
  };
}
