import type { Movement, MovementPatch } from "../movements/types";

/**
 * The body of PATCH /movements/:id when a label card picks a category. The category always goes. The typed reason goes
 * only when it was typed and differs from the saved one, as today. The typed tags go as the whole list, only when the set
 * differs from the movement's, ignoring order.
 */
export function labelPatch(
  movement: Pick<Movement, "reason" | "tags">,
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
  return body;
}
