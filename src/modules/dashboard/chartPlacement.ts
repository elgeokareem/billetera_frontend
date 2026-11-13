import { movementCount } from "../movements/spending";
import type { MovementTotals } from "../movements/types";

/** Where the balance chart goes: the wide left column ("main"), or the right one under Balance ("side"). */
export type ChartPlacement = "main" | "side";

/** The label count query's state, as far as the placement rule reads it. */
export interface LabelCountState {
  status: "pending" | "error" | "success";
  data: Pick<MovementTotals, "assets"> | undefined;
}

/**
 * The chart moves to the left column only once the label count has loaded and says there are no movements left to label.
 * While the count loads or fails before its first load, or while movements are still to label, the chart stays in the right column under
 * Balance, as before.
 */
export function chartPlacement(count: LabelCountState): ChartPlacement {
  // A failed refetch keeps the last loaded count, so the chart doesn't move back for a network blip.
  if (count.data === undefined) {
    return "side";
  }
  return movementCount(count.data) === 0 ? "main" : "side";
}
