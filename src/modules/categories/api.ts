import axios from "axios";
import type { Schemas } from "../shared/api-types";

const MAX_NAME_LENGTH = 64;

/**
 * The rule the backend applies to a name: trimmed, 1 to 64 characters, and no control characters. Checking it here
 * spares a round trip for a name the backend would refuse with 400 invalid name.
 */
export function isValidCategoryName(name: string) {
  const trimmed = name.trim();
  return (
    [...trimmed].length >= 1 &&
    [...trimmed].length <= MAX_NAME_LENGTH &&
    !/\p{Cc}/u.test(trimmed)
  );
}

export async function fetchCategories() {
  const { data } = await axios.get<Schemas["categories.ListResponse"]>(
    "/categories",
  );
  return data.categories;
}

export async function createCategory(name: string) {
  const { data } = await axios.post<Schemas["categories.CategoryEnvelope"]>(
    "/categories",
    {
      name: name.trim(),
    },
  );
  return data.category;
}

export async function renameCategory(id: number, name: string) {
  const { data } = await axios.patch<Schemas["categories.CategoryEnvelope"]>(
    `/categories/${id}`,
    { name: name.trim() },
  );
  return data.category;
}

/** DELETE /categories/:id. Its movements keep their reasons and lose the category. */
export async function deleteCategory(id: number) {
  await axios.delete(`/categories/${id}`);
}
