import type { Movement, MovementPatch } from "./types";

/** The category value of a draft that means "no category". */
export const NO_CATEGORY = "none";

/** What the user has in the form: the reason as typed, and the category as the select holds it. */
export interface MovementDraft {
  reason: string;
  /** NO_CATEGORY, or the ID of a category as text. */
  category: string;
}

export function draftOf(movement: Pick<Movement, "reason" | "category_id">): MovementDraft {
  return {
    reason: movement.reason ?? "",
    category: movement.category_id === null ? NO_CATEGORY : String(movement.category_id),
  };
}

/**
 * The body of PATCH /movements/:id, with only the keys that changed. A reason that was cleared is sent as null, and so is
 * a category that was cleared. A reason that's the same once trimmed isn't sent, nor is a category that's the same. The
 * body is empty when nothing changed, and then nothing needs saving.
 */
export function patchFor(movement: Pick<Movement, "reason" | "category_id">, draft: MovementDraft): MovementPatch {
  const body: MovementPatch = {};
  const reason = draft.reason.trim();
  if (reason !== (movement.reason ?? "")) {
    body.reason = reason === "" ? null : reason;
  }
  const categoryId = draft.category === NO_CATEGORY ? null : Number(draft.category);
  if (categoryId !== movement.category_id) {
    body.category_id = categoryId;
  }
  return body;
}
