import { beforeEach, describe, expect, it } from "vitest";
import type { Movement, MovementKind } from "../movements/types";
import i18n from "../shared/i18n";
import {
  kindKey,
  movementFiling,
  movementTitle,
  priceNote,
  statusNote,
} from "./movementText";

// Returns the key with its options, so a test can read what was asked for.
const t = (key: string, options?: Record<string, string>) =>
  options ? `${key} ${JSON.stringify(options)}` : key;

function movement(overrides: Partial<Movement>): Movement {
  return {
    id: 1,
    source: "binance",
    kind: "p2p",
    external_id: "p2p-1",
    direction: "out",
    status: "completed",
    source_status: null,
    asset: "USDT",
    amount: "54",
    fee_asset: null,
    fee_amount: null,
    counter_asset: "ARS",
    counter_amount: "74520",
    unit_price: "1380",
    counterparty: null,
    occurred_at: "2026-10-29T12:00:00Z",
    reason: null,
    reason_updated_at: null,
    category_id: null,
    tags: [],
    usd_price: "1",
    usd_price_source: "binance-1m",
    usd_price_status: "priced",
    usd_value: "54",
    fee_usd_value: null,
    review_status: null,
    detection: null,
    splits: [],
    split_status: "none",
    split_rest_usd: null,
    ...overrides,
  };
}

describe("kindKey", () => {
  it("reads a P2P trade as a sale when crypto leaves, and a purchase otherwise", () => {
    expect(kindKey({ kind: "p2p", direction: "out" })).toBe("movements.kinds.p2pSale");
    expect(kindKey({ kind: "p2p", direction: "in" })).toBe("movements.kinds.p2pPurchase");
  });

  it("names the other kinds", () => {
    expect(kindKey({ kind: "pay", direction: "out" })).toBe("movements.kinds.pay");
    expect(kindKey({ kind: "withdrawal", direction: "out" })).toBe("movements.kinds.withdrawal");
    expect(kindKey({ kind: "deposit", direction: "in" })).toBe("movements.kinds.deposit");
    expect(kindKey({ kind: "convert", direction: "out" })).toBe("movements.kinds.convert");
  });

  it("names the detected kinds", () => {
    expect(kindKey({ kind: "card_spend", direction: "out" })).toBe("movements.kinds.cardSpend");
    expect(kindKey({ kind: "copy_trading", direction: "out" })).toBe("movements.kinds.copyTrading");
    expect(kindKey({ kind: "transfer", direction: "in" })).toBe("movements.kinds.transfer");
  });

  it("falls back to a generic label for a kind this build doesn't know", () => {
    const future = { kind: "future_kind" as MovementKind, direction: "out" as const };
    expect(kindKey(future)).toBe("movements.kinds.other");
  });
});

describe("movementTitle", () => {
  it("uses the reason when there is one", () => {
    expect(movementTitle(movement({ reason: "Gift for Carlos" }), t)).toBe("Gift for Carlos");
  });

  it("falls back to the kind when there is no reason", () => {
    expect(movementTitle(movement({ kind: "pay" }), t)).toBe("movements.kinds.pay");
  });

  it("names both coins of a Convert", () => {
    const convert = movement({ kind: "convert", direction: "out", asset: "BNB", counter_asset: "USDT" });
    expect(movementTitle(convert, t)).toBe(
      'dashboard.recent.convert {"kind":"movements.kinds.convert","from":"BNB","to":"USDT"}',
    );
  });
});

describe("movementFiling", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  const nameOf = (categoryId: number | null) =>
    categoryId === null ? "No category" : `Category ${categoryId}`;

  it("shows the category's name", () => {
    expect(movementFiling(movement({ category_id: 2 }), "Food", t)).toEqual({ text: "Food", needsLabel: false });
  });

  it("names a category whose name didn't load as not loaded", () => {
    expect(movementFiling(movement({ category_id: 7 }), undefined, t)).toEqual({
      text: "movements.categoryUnknown",
      needsLabel: false,
    });
  });

  it("says spending with no category needs a label", () => {
    expect(movementFiling(movement({ category_id: null }), undefined, t)).toEqual({
      text: "dashboard.recent.needsLabel",
      needsLabel: true,
    });
  });

  it("never marks a Convert with no category as needing a label, and shows its kind", () => {
    const convert = movement({ kind: "convert", direction: "out", category_id: null });
    expect(movementFiling(convert, undefined, t)).toEqual({ text: "movements.kinds.convert", needsLabel: false });
  });

  it("never marks a deposit with no category as needing a label, and shows its kind", () => {
    const deposit = movement({ kind: "deposit", direction: "in", category_id: null });
    expect(movementFiling(deposit, undefined, t)).toEqual({ text: "movements.kinds.deposit", needsLabel: false });
  });

  it("doesn't mark a pending withdrawal as needing a label, since it isn't spending yet", () => {
    const pending = movement({ kind: "withdrawal", status: "pending", category_id: null });
    expect(movementFiling(pending, undefined, t)).toEqual({
      text: "movements.kinds.withdrawal",
      needsLabel: false,
    });
  });

  it("still needs a label when it has a reason, since a reason alone isn't a label", () => {
    const withReason = movement({ reason: "Dinner", category_id: null });
    expect(movementFiling(withReason, undefined, t).needsLabel).toBe(true);
  });

  it("shows one split segment and counts the rest as more", () => {
    const split = movement({
      category_id: 9,
      split_status: "applied",
      split_rest_usd: "50",
      splits: [
        { category_id: 2, usd_amount: "20", tags: [] },
        { category_id: 3, usd_amount: "30", tags: [] },
      ],
    });
    const filing = movementFiling(split, "Food", t, nameOf);
    expect(filing.segments).toEqual([{ name: "Category 2", usd: "20" }]);
    expect(filing.more).toBe(2);
    expect(filing.text).toBe('Category 2 $20.00 · movements.split.more {"count":"2"}');
    expect(filing.needsLabel).toBe(false);
  });

  it("doesn't need a label when a fully split movement has no category", () => {
    const split = movement({
      category_id: null,
      split_status: "applied",
      split_rest_usd: "0",
      splits: [
        { category_id: 2, usd_amount: "35", tags: [] },
        { category_id: 3, usd_amount: "25", tags: [] },
      ],
    });
    const filing = movementFiling(split, undefined, t, nameOf);
    expect(filing.needsLabel).toBe(false);
    expect(filing.segments).toEqual([{ name: "Category 2", usd: "35" }]);
    expect(filing.more).toBe(1);
  });

  it("names a deleted part category as no category, and keeps the lines of an exceeds movement", () => {
    const split = movement({
      category_id: null,
      split_status: "exceeds",
      split_rest_usd: "0",
      splits: [{ category_id: null, usd_amount: "110", tags: [] }],
    });
    expect(movementFiling(split, undefined, t, nameOf).segments).toEqual([
      { name: "No category", usd: "110" },
    ]);
  });

  it("falls back to the needs-a-label line when the parts don't apply", () => {
    const unpriced = movement({
      category_id: null,
      split_status: "unpriced",
      split_rest_usd: null,
      splits: [{ category_id: 2, usd_amount: "20", tags: [] }],
    });
    expect(movementFiling(unpriced, undefined, t, nameOf)).toEqual({
      text: "dashboard.recent.needsLabel",
      needsLabel: true,
    });
  });
});

describe("statusNote", () => {
  it("names a pending or failed movement, and has nothing for a completed one", () => {
    expect(statusNote(movement({ status: "pending" }), t)).toBe("dashboard.recent.pending");
    expect(statusNote(movement({ status: "failed" }), t)).toBe("dashboard.recent.failed");
    expect(statusNote(movement({ status: "completed" }), t)).toBeNull();
  });
});

describe("priceNote", () => {
  it("says a missing price is still being looked up", () => {
    expect(priceNote(movement({ usd_value: null, usd_price: null, usd_price_status: "pending" }), t)).toBe(
      "dashboard.recent.pricing",
    );
  });

  it("says Binance has no price when the coin is unavailable", () => {
    expect(priceNote(movement({ usd_value: null, usd_price: null, usd_price_status: "unavailable" }), t)).toBe(
      "dashboard.recent.noPrice",
    );
  });

  it("adds no note when there is a value", () => {
    expect(priceNote(movement({ usd_value: "54" }), t)).toBeNull();
  });
});
