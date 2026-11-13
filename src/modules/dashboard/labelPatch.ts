import type { Movement, MovementPatch } from "../movements/types";

/**
 * The body of PATCH /movements/:id when a label card picks a category. The category always goes. The typed reason goes
 * only when it was typed and differs from the saved one, as today. The typed tags go as the whole list, only when the set
 * differs from the movement's, ignoring order.
 */
export function labelPatch(
  movement: Pick<Movement, "reason" | "tags" | "review_status">,
  categoryId: number,
  typedReason: string,
  typedTags: readonly string[],
): MovementPatch {
  const body: MovementPatch = { category_id: categoryId };
  const reason = typedReason.trim();
  if (reason !== "" && reason !== (movement.reason ?? "")) {
    body.reason = reason;
  }
  const sameTags =
    typedTags.length === movement.tags.length &&
    typedTags.every((tag) => movement.tags.includes(tag));
  if (!sameTags) {
    body.tags = [...typedTags];
  }
  // Picking a category on the dashboard is a decision on a suspected row. The drawer stays explicit.
  if (movement.review_status === "suspected") {
    body.review = "confirmed";
  }
  return body;
}

/**
 * The body that undoes a label card. A suspected row also goes back to review; any other row only loses its category,
 * since a reason that was saved stays.
 */
export function labelUndoPatch(
  movement: Pick<Movement, "review_status">,
): MovementPatch {
  return movement.review_status === "suspected"
    ? { category_id: null, review: "suspected" }
    : { category_id: null };
}
