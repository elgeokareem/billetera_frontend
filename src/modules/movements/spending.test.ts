import { describe, expect, it } from "vitest";
import type { AssetTotalRow, Movement } from "./types";
import {
  SPENDING_FILTER,
  movementCount,
  needsLabel,
  isSpending,
  spendingBreakdown,
} from "./spending";

function row(overrides: Partial<AssetTotalRow>): AssetTotalRow {
  return {
    asset: "USDT",
    direction: "out",
    count: 1,
    amount: "0",
    usd_value: "0",
    unpriced_count: 0,
    ...overrides,
  };
}

describe("spendingBreakdown", () => {
  it("sums one category across assets, exactly", () => {
    // A category with a USDT row and a BTC row is one value. Floats would round the sum here.
    const breakdown = spendingBreakdown([
      row({ category_id: 1, asset: "USDT", usd_value: "275.1" }),
      row({ category_id: 1, asset: "BTC", usd_value: "37.4" }),
    ]);
    expect(breakdown.categories).toEqual([
      { categoryId: 1, usd: "312.5", count: 2, unpricedCount: 0 },
    ]);
  });

  it("keeps precision a number would lose", () => {
    const breakdown = spendingBreakdown([
      row({ category_id: 2, usd_value: "9007199254740993.00000001" }),
      row({ category_id: 2, asset: "BTC", usd_value: "1" }),
    ]);
    expect(breakdown.categories[0].usd).toBe("9007199254740994.00000001");
  });

  it("puts spending with no category last, even when it's the largest", () => {
    const breakdown = spendingBreakdown([
      row({ category_id: null, usd_value: "900" }),
      row({ category_id: 3, usd_value: "40" }),
      row({ category_id: 4, usd_value: "120" }),
    ]);
    expect(breakdown.categories.map((group) => group.categoryId)).toEqual([4, 3, null]);
  });

  it("orders by value, largest first, and breaks ties by category", () => {
    const breakdown = spendingBreakdown([
      row({ category_id: 9, usd_value: "50" }),
      row({ category_id: 2, usd_value: "50" }),
      row({ category_id: 5, usd_value: "80" }),
    ]);
    expect(breakdown.categories.map((group) => group.categoryId)).toEqual([5, 2, 9]);
  });

  it("counts unpriced rows, and adds no value for them", () => {
    const breakdown = spendingBreakdown([
      row({ category_id: 3, usd_value: "185" }),
      row({ category_id: 3, asset: "SHIB", usd_value: null, unpriced_count: 1 }),
    ]);
    expect(breakdown.categories[0]).toEqual({ categoryId: 3, usd: "185", count: 2, unpricedCount: 1 });
    expect(breakdown.unpricedCount).toBe(1);
    expect(breakdown.total).toBe("185");
  });

  it("gives null, not zero, for a category whose rows are all unpriced", () => {
    const breakdown = spendingBreakdown([
      row({ category_id: 6, asset: "SHIB", usd_value: null, unpriced_count: 1 }),
      row({ category_id: 1, usd_value: "10" }),
    ]);
    const shopping = breakdown.categories.find((group) => group.categoryId === 6);
    expect(shopping?.usd).toBeNull();
    expect(breakdown.categories.map((group) => group.categoryId)).toEqual([1, 6]);
  });

  it("totals the priced rows, and counts every row", () => {
    const breakdown = spendingBreakdown([
      row({ category_id: null, usd_value: "96.5" }),
      row({ category_id: 3, usd_value: "640" }),
      row({ category_id: 4, usd_value: null, unpriced_count: 1 }),
    ]);
    expect(breakdown.total).toBe("736.5");
    expect(breakdown.count).toBe(3);
    expect(breakdown.unpricedCount).toBe(1);
  });

  it("is empty, with a zero total, when there is no spending", () => {
    expect(spendingBreakdown([])).toEqual({ categories: [], total: "0", count: 0, unpricedCount: 0 });
  });
});

describe("spending definition", () => {
  const base: Pick<
    Movement,
    "kind" | "direction" | "status" | "category_id" | "review_status"
  > = {
    kind: "p2p",
    direction: "out",
    status: "completed",
    category_id: null,
    review_status: null,
  };

  it("filters on completed movements leaving Binance, as kinds withdrawal, p2p, pay and card_spend", () => {
    expect(SPENDING_FILTER).toEqual({
      kind: "withdrawal,p2p,pay,card_spend",
      direction: "out",
      status: "completed",
    });
  });

  it("counts a withdrawal, a P2P sale, a Pay transfer and a card spend as spending", () => {
    expect(isSpending({ ...base, kind: "withdrawal" })).toBe(true);
    expect(isSpending({ ...base, kind: "pay" })).toBe(true);
    expect(isSpending({ ...base, kind: "card_spend" })).toBe(true);
    expect(isSpending(base)).toBe(true);
  });

  it("counts a suspected card spend, and leaves a dismissed one out", () => {
    expect(isSpending({ ...base, kind: "card_spend", review_status: "suspected" })).toBe(true);
    expect(isSpending({ ...base, kind: "card_spend", review_status: "confirmed" })).toBe(true);
    expect(isSpending({ ...base, kind: "card_spend", review_status: "dismissed" })).toBe(false);
    expect(isSpending({ ...base, review_status: "dismissed" })).toBe(false);
  });

  it("doesn't count a Convert, a deposit, copy trading, another transfer, money coming in, or a pending or failed movement", () => {
    expect(isSpending({ ...base, kind: "convert" })).toBe(false);
    expect(isSpending({ ...base, kind: "deposit", direction: "in" })).toBe(false);
    expect(isSpending({ ...base, kind: "copy_trading" })).toBe(false);
    expect(isSpending({ ...base, kind: "transfer" })).toBe(false);
    expect(isSpending({ ...base, direction: "in" })).toBe(false);
    expect(isSpending({ ...base, status: "pending" })).toBe(false);
    expect(isSpending({ ...base, status: "failed" })).toBe(false);
  });

  it("needs a label only when spending has no category", () => {
    expect(needsLabel(base)).toBe(true);
    expect(needsLabel({ ...base, category_id: 3 })).toBe(false);
    expect(needsLabel({ ...base, kind: "convert" })).toBe(false);
    expect(needsLabel({ ...base, kind: "deposit", direction: "in" })).toBe(false);
    expect(needsLabel({ ...base, kind: "card_spend", review_status: "dismissed" })).toBe(false);
  });
});

describe("movementCount", () => {
  it("counts each movement once, from the asset rows only", () => {
    expect(
      movementCount({
        assets: [row({ count: 2 }), row({ asset: "BTC", count: 1 })],
      }),
    ).toBe(3);
  });

  it("is zero with no rows", () => {
    expect(movementCount({ assets: [] })).toBe(0);
  });
});
