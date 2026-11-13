import type {
  DetectionKind,
  Movement,
  MovementPatch,
  ReviewStatus,
} from "./types";

/** A badge for a movement that the detector created, or null when it needs none. */
export interface ReviewBadgeInfo {
  key: string;
  color: "red" | "gray" | "yellow";
}

type ReviewFields = Pick<Movement, "kind" | "review_status" | "detection">;

/**
 * The one review badge a movement shows, if any. A conflict comes first, then a dismissed row, then a suspected one.
 * A confirmed movement and a Binance row show none.
 */
export function reviewBadge(movement: ReviewFields): ReviewBadgeInfo | null {
  if (movement.detection?.conflict) {
    return { key: "movements.review.badge.conflict", color: "red" };
  }
  if (movement.review_status === "dismissed") {
    return { key: "movements.review.badge.dismissed", color: "gray" };
  }
  if (movement.review_status === "suspected") {
    switch (movement.kind) {
      case "card_spend":
        return { key: "movements.review.badge.card", color: "yellow" };
      case "copy_trading":
        return { key: "movements.review.badge.copy", color: "yellow" };
      case "transfer":
        return { key: "movements.review.badge.transfer", color: "yellow" };
    }
  }
  return null;
}

/** The kinds a detected movement can be, in the order the drawer offers them. */
export const REVIEW_KINDS: readonly DetectionKind[] = [
  "card_spend",
  "copy_trading",
  "transfer",
];

export interface ReviewKindAction {
  kind: DetectionKind;
  /** This is the movement's current kind. */
  current: boolean;
  /** This is the current kind and the movement is confirmed, so the button is filled. */
  confirmed: boolean;
  disabled: boolean;
}

/** What the drawer's detection actions offer for a movement. */
export interface ReviewActions {
  kinds: ReviewKindAction[];
  dismissed: boolean;
  canDismiss: boolean;
  canRestore: boolean;
  /** The conflict alert, with Keep it and Dismiss, is shown. */
  conflict: boolean;
}

export function reviewActions(movement: ReviewFields): ReviewActions {
  const dismissed = movement.review_status === "dismissed";
  return {
    kinds: REVIEW_KINDS.map((kind) => ({
      kind,
      current: kind === movement.kind,
      confirmed: kind === movement.kind && movement.review_status === "confirmed",
      disabled: dismissed,
    })),
    dismissed,
    canDismiss: !dismissed,
    canRestore: dismissed,
    conflict: movement.detection?.conflict === true,
  };
}

export type ReviewAction =
  | { type: "kind"; kind: DetectionKind }
  | { type: "dismiss" }
  | { type: "restore" }
  | { type: "keep" };

/**
 * The PATCH one quick action sends. Clicking the current kind while suspected confirms it; clicking another kind
 * reclassifies and confirms it; clicking the current kind while confirmed does nothing.
 */
export function actionPatch(movement: ReviewFields, action: ReviewAction): MovementPatch | null {
  switch (action.type) {
    case "kind":
      if (action.kind === movement.kind) {
        return movement.review_status === "confirmed" ? null : { review: "confirmed" };
      }
      return { kind: action.kind };
    case "dismiss":
      return { review: "dismissed" };
    case "restore":
      return { review: "suspected" };
    case "keep":
      return { review: "confirmed" };
  }
}

/**
 * The PATCH that undoes an action. A dismissed or reclassified row returns to the detector's suggestion; undoing a
 * restore dismisses it again.
 */
export function undoPatch(action: ReviewAction): MovementPatch {
  return action.type === "restore" ? { review: "dismissed" } : { review: "suspected" };
}

/** The translation key of a review status, shared by the drawer's facts. */
export function reviewStatusKey(status: ReviewStatus): string | null {
  return status === null ? null : `movements.review.${status}`;
}
