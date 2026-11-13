import { describe, expect, it } from "vitest";
import {
  actionPatch,
  reviewActions,
  reviewBadge,
  undoPatch,
} from "./review";
import type { Detection, Movement } from "./types";

function detection(overrides: Partial<Detection> = {}): Detection {
  return {
    suggested_kind: "card_spend",
    rule: "unexplained_drop",
    confidence: "medium",
    wallet: "spot",
    window_start: "2026-11-09T10:40:00Z",
    window_end: "2026-11-09T10:42:00Z",
    spot_change: "-4.0427944",
    funding_change: "0",
    explained_change: "0",
    paired_movement_id: null,
    conflict: false,
    ...overrides,
  };
}

function movement(overrides: Partial<Movement> = {}): Movement {
  return {
    id: 1,
    source: "detector",
    kind: "card_spend",
    external_id: "detector-1",
    direction: "out",
    status: "completed",
    source_status: null,
    asset: "USDT",
    amount: "4.0427944",
    fee_asset: null,
    fee_amount: null,
    counter_asset: null,
    counter_amount: null,
    unit_price: null,
    counterparty: null,
    occurred_at: "2026-11-09T10:42:00Z",
    reason: null,
    reason_updated_at: null,
    category_id: null,
    tags: [],
    usd_price: "1",
    usd_price_source: "binance-1m",
    usd_price_status: "priced",
    usd_value: "4.0427944",
    fee_usd_value: null,
    review_status: "suspected",
    detection: detection(),
    ...overrides,
  };
}

describe("reviewBadge", () => {
  it("shows Check this for a conflict, over every other badge", () => {
    const badge = reviewBadge(
      movement({ review_status: "dismissed", detection: detection({ conflict: true }) }),
    );
    expect(badge).toEqual({ key: "movements.review.badge.conflict", color: "red" });
  });

  it("shows a dismissed row as dismissed", () => {
    expect(reviewBadge(movement({ review_status: "dismissed" }))).toEqual({
      key: "movements.review.badge.dismissed",
      color: "gray",
    });
  });

  it("names a suspected kind", () => {
    expect(reviewBadge(movement({ kind: "card_spend" }))).toEqual({
      key: "movements.review.badge.card",
      color: "yellow",
    });
    expect(reviewBadge(movement({ kind: "copy_trading" }))).toEqual({
      key: "movements.review.badge.copy",
      color: "yellow",
    });
    expect(reviewBadge(movement({ kind: "transfer" }))).toEqual({
      key: "movements.review.badge.transfer",
      color: "yellow",
    });
  });

  it("shows no badge for a confirmed row or a Binance row", () => {
    expect(reviewBadge(movement({ review_status: "confirmed" }))).toBeNull();
    expect(
      reviewBadge(movement({ source: "binance", review_status: null, detection: null })),
    ).toBeNull();
  });
});

describe("reviewActions", () => {
  it("offers the three kinds for a suspected row, with the current one unfilled", () => {
    expect(reviewActions(movement())).toEqual({
      kinds: [
        { kind: "card_spend", current: true, confirmed: false, disabled: false },
        { kind: "copy_trading", current: false, confirmed: false, disabled: false },
        { kind: "transfer", current: false, confirmed: false, disabled: false },
      ],
      dismissed: false,
      canDismiss: true,
      canRestore: false,
      conflict: false,
    });
  });

  it("marks the current kind as confirmed", () => {
    const actions = reviewActions(movement({ review_status: "confirmed" }));
    expect(actions.kinds[0]).toEqual({
      kind: "card_spend",
      current: true,
      confirmed: true,
      disabled: false,
    });
  });

  it("disables the kinds and offers Restore for a dismissed row", () => {
    const actions = reviewActions(movement({ review_status: "dismissed" }));
    expect(actions.kinds.every((action) => action.disabled)).toBe(true);
    expect(actions.dismissed).toBe(true);
    expect(actions.canDismiss).toBe(false);
    expect(actions.canRestore).toBe(true);
  });

  it("shows the conflict alert when the detection has a conflict", () => {
    expect(reviewActions(movement({ detection: detection({ conflict: true }) })).conflict).toBe(true);
  });
});

describe("actionPatch", () => {
  it("confirms the current kind while it is suspected", () => {
    expect(actionPatch(movement(), { type: "kind", kind: "card_spend" })).toEqual({
      review: "confirmed",
    });
  });

  it("reclassifies under another kind", () => {
    expect(actionPatch(movement(), { type: "kind", kind: "copy_trading" })).toEqual({
      kind: "copy_trading",
    });
  });

  it("does nothing when the current kind is already confirmed", () => {
    expect(
      actionPatch(movement({ review_status: "confirmed" }), { type: "kind", kind: "card_spend" }),
    ).toBeNull();
  });

  it("dismisses, restores and keeps a conflict", () => {
    expect(actionPatch(movement(), { type: "dismiss" })).toEqual({ review: "dismissed" });
    expect(actionPatch(movement({ review_status: "dismissed" }), { type: "restore" })).toEqual({
      review: "suspected",
    });
    expect(
      actionPatch(movement({ detection: detection({ conflict: true }) }), { type: "keep" }),
    ).toEqual({ review: "confirmed" });
  });
});

describe("undoPatch", () => {
  it("returns a dismissed or reclassified row to the suggestion", () => {
    expect(undoPatch({ type: "dismiss" })).toEqual({ review: "suspected" });
    expect(undoPatch({ type: "kind", kind: "copy_trading" })).toEqual({ review: "suspected" });
  });

  it("undoing a restore dismisses the row again", () => {
    expect(undoPatch({ type: "restore" })).toEqual({ review: "dismissed" });
  });
});
