import { normaliseTagName } from "./names";
import type { Tag } from "./types";

/**
 * The translation key of the error for a new or renamed tag, or null when it may be sent. Normalises the name with the
 * backend's rule, then looks for another tag with exactly that name. exceptId leaves the tag being renamed out, so its
 * own name is allowed.
 */
export function newTagNameError(
  name: string,
  tags: readonly Tag[],
  exceptId?: number,
): "errors.invalidTag" | "errors.tagExists" | null {
  const normalised = normaliseTagName(name);
  if (normalised === undefined) {
    return "errors.invalidTag";
  }
  if (tags.some((tag) => tag.id !== exceptId && tag.name === normalised)) {
    return "errors.tagExists";
  }
  return null;
}
