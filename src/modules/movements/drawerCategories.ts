import { isValidCategoryName } from "../categories/api";
import type { Category } from "../categories/types";
import { NO_CATEGORY } from "./patch";

export interface CategoryOption {
  value: string;
  label: string;
}

/**
 * The drawer's Select data: "No category" first, then the loaded categories in their order, then any category created in
 * this drawer that the loaded list doesn't have yet (the refetch may not have landed, or may have failed).
 */
export function drawerCategoryOptions(
  categories: readonly Category[],
  created: readonly Category[],
  noCategoryLabel: string,
): CategoryOption[] {
  const loaded = categories.map((category) => ({
    value: String(category.id),
    label: category.name,
  }));
  const loadedIds = new Set(categories.map((category) => category.id));
  const pending = created
    .filter((category) => !loadedIds.has(category.id))
    .map((category) => ({
      value: String(category.id),
      label: category.name,
    }));
  return [
    { value: NO_CATEGORY, label: noCategoryLabel },
    ...loaded,
    ...pending,
  ];
}

/**
 * The translation key of the error for a new category name, or null when it may be sent. Checks the backend's name rule,
 * then a case-insensitive clash with a loaded category (compared trimmed, with toLowerCase).
 */
export function newCategoryNameError(
  name: string,
  categories: readonly Category[],
): string | null {
  if (!isValidCategoryName(name)) {
    return "errors.invalidCategoryName";
  }
  const wanted = name.trim().toLowerCase();
  if (categories.some((category) => category.name.toLowerCase() === wanted)) {
    return "errors.categoryExists";
  }
  return null;
}
