import {
  isSplitDraftEmpty,
  normalisedSplits,
  normaliseSplitAmount,
  sameSplits,
  splitDraftsOf,
  type SplitDraft,
} from "./splits";
import type { Movement, MovementPatch } from "./types";

/** The category value of a draft that means "no category". */
export const NO_CATEGORY = "none";

/** What the user has in the form: the reason as typed, the category as the select holds it, and the tags. */
export interface MovementDraft {
  reason: string;
  /** NO_CATEGORY, or the ID of a category as text. */
  category: string;
  tags: string[];
  /** The movement's parts, in position order, as the drawer edits them. */
  splits: SplitDraft[];
}

export function draftOf(
  movement: Pick<Movement, "reason" | "category_id" | "tags" | "splits">,
): MovementDraft {
  return {
    reason: movement.reason ?? "",
    category: movement.category_id === null ? NO_CATEGORY : String(movement.category_id),
    tags: [...movement.tags],
    splits: splitDraftsOf(movement),
  };
}

/**
 * The body of PATCH /movements/:id, with only the keys that changed. A reason that was cleared is sent as null, and so is
 * a category that was cleared. A reason that's the same once trimmed isn't sent, nor is a category that's the same. Tags
 * are sent as the whole list, and only when the set differs, ignoring order. Splits are sent as the whole list, and only
 * when the count, order, category, amount or tags differ; removing every part sends []. The body is empty when nothing
 * changed, and then nothing needs saving.
 */
export function patchFor(
  movement: Pick<Movement, "reason" | "category_id" | "tags" | "splits">,
  draft: MovementDraft,
): MovementPatch {
  const body: MovementPatch = {};
  const reason = draft.reason.trim();
  if (reason !== (movement.reason ?? "")) {
    body.reason = reason === "" ? null : reason;
  }
  const categoryId = draft.category === NO_CATEGORY ? null : Number(draft.category);
  if (categoryId !== movement.category_id) {
    body.category_id = categoryId;
  }
  const sameTags =
    draft.tags.length === movement.tags.length &&
    draft.tags.every((tag) => movement.tags.includes(tag));
  if (!sameTags) {
    body.tags = draft.tags;
  }
  const splits = normalisedSplits(draft.splits);
  // Only a full, sendable list replaces the saved one. An incomplete row blocks a priced save elsewhere; on a read-only
  // unpriced movement it must not silently drop the saved parts, which a replacement with a missing item would.
  const pendingParts = draft.splits.filter((part) => !isSplitDraftEmpty(part));
  if (splits.length === pendingParts.length && !sameSplits(movement.splits, splits)) {
    body.splits = splits;
  }
  return body;
}

/**
 * True when the form has something to save: a changed field, tag text typed in the movement's tags field, or a part
 * that differs from the saved ones or needs a fix the user can see. A blank part doesn't count, and neither does tag
 * text that folds into tags already there, which is what the save resolves without a request.
 */
export function hasUnsavedChanges(
  movement: Pick<Movement, "reason" | "category_id" | "tags" | "splits">,
  draft: MovementDraft,
  tagText: string,
): boolean {
  if (Object.keys(patchFor(movement, draft)).length > 0) {
    return true;
  }
  if (tagText.trim() !== "") {
    return true;
  }
  // A saved part whose category was deleted keeps Save enabled, as it was when the drawer opened.
  return (
    !sameSplits(movement.splits, normalisedSplits(draft.splits)) ||
    draft.splits.some(
      (part) =>
        part.tagText.trim() !== "" ||
        (!isSplitDraftEmpty(part) &&
          (part.category === "" || normaliseSplitAmount(part.amount) === undefined)),
    )
  );
}
