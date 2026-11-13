import { describe, expect, it } from "vitest";
import type { Movement, Split } from "./types";
import {
  canSplit,
  draftRest,
  MAX_SPLITS,
  nextSplitKey,
  normalisedSplits,
  normaliseSplitAmount,
  sameSplits,
  splitDraftErrors,
  splitDraftsOf,
  splitLimit,
  splitSegments,
  splitSum,
  SPLIT_COLORS,
  type SplitDraft,
} from "./splits";

function part(overrides: Partial<SplitDraft> = {}): SplitDraft {
  return {
    key: 0,
    category: "1",
    amount: "20",
    tags: [],
    tagText: "",
    ...overrides,
  };
}

function savedPart(overrides: Partial<Split> = {}): Split {
  return {
    category_id: 1,
    usd_amount: "20",
    tags: [],
    ...overrides,
  };
}

function splitMovement(overrides: Partial<Movement> = {}): Movement {
  return {
    id: 1,
    source: "binance",
    kind: "p2p",
    external_id: "p2p-1",
    direction: "out",
    status: "completed",
    source_status: null,
    asset: "USDT",
    amount: "100",
    fee_asset: null,
    fee_amount: null,
    counter_asset: "ARS",
    counter_amount: "138000",
    unit_price: "1380",
    counterparty: null,
    occurred_at: "2026-11-01T12:00:00Z",
    reason: null,
    reason_updated_at: null,
    category_id: 9,
    tags: [],
    usd_price: "1",
    usd_price_source: "binance-1m",
    usd_price_status: "priced",
    usd_value: "100",
    fee_usd_value: null,
    review_status: null,
    detection: null,
    splits: [],
    split_status: "none",
    split_rest_usd: null,
    ...overrides,
  };
}

describe("normaliseSplitAmount", () => {
  it("drops spaces and reads a comma as the decimal point", () => {
    expect(normaliseSplitAmount("12,5")).toBe("12.5");
    expect(normaliseSplitAmount(" 20 ")).toBe("20");
    expect(normaliseSplitAmount("1 2.5")).toBe("12.5");
  });

  it("writes the shortest form of the same decimal", () => {
    expect(normaliseSplitAmount("20.00")).toBe("20");
    expect(normaliseSplitAmount("0.50")).toBe("0.5");
    expect(normaliseSplitAmount("020")).toBe("20");
  });

  it("refuses a missing decimal part, a missing whole part and a third decimal", () => {
    expect(normaliseSplitAmount("20.")).toBeUndefined();
    expect(normaliseSplitAmount(".5")).toBeUndefined();
    expect(normaliseSplitAmount("1.234")).toBeUndefined();
  });

  it("refuses zero, an exponent, and more than 13 digits", () => {
    expect(normaliseSplitAmount("0")).toBeUndefined();
    expect(normaliseSplitAmount("0.00")).toBeUndefined();
    expect(normaliseSplitAmount("1e2")).toBeUndefined();
    expect(normaliseSplitAmount("12345678901234")).toBeUndefined();
    expect(normaliseSplitAmount("1234567890123")).toBe("1234567890123");
  });
});

describe("splitLimit", () => {
  it("rounds the value to cents, half away from zero", () => {
    expect(splitLimit("100.004")).toBe("100");
    expect(splitLimit("100.005")).toBe("100.01");
    expect(splitLimit("100.015")).toBe("100.02");
    expect(splitLimit("100")).toBe("100");
  });
});

describe("draftRest", () => {
  it("subtracts the valid amounts from the value", () => {
    expect(draftRest("100", [part({ amount: "20" }), part({ amount: "30" })])).toBe("50");
  });

  it("shows a sub-cent rest as zero, as the API does", () => {
    expect(draftRest("100.004", [part({ amount: "100" })])).toBe("0");
  });

  it("never goes below zero when the parts pass the value", () => {
    expect(draftRest("100", [part({ amount: "120" })])).toBe("0");
  });

  it("ignores a row without a valid amount, and has no rest without a value", () => {
    expect(draftRest("100", [part({ amount: "abc" }), part({ amount: "20" })])).toBe("80");
    expect(draftRest(null, [part()])).toBe("0");
  });
});

describe("splitSum", () => {
  it("adds the valid rows exactly and ignores the others", () => {
    expect(splitSum([part({ amount: "0.1" }), part({ amount: "0.2" }), part({ amount: "0" })])).toBe(
      "0.3",
    );
  });
});

describe("splitDraftErrors", () => {
  it("has no errors for a valid set", () => {
    expect(
      splitDraftErrors([part({ amount: "20" }), part({ amount: "30" })], "100"),
    ).toEqual({ rows: [{}, {}] });
  });

  it("ignores a row with no category, no amount and no tags", () => {
    expect(splitDraftErrors([part({ category: "", amount: "" })], "100")).toEqual({ rows: [{}] });
  });

  it("asks for a category when an amount is typed", () => {
    expect(splitDraftErrors([part({ category: "", amount: "20" })], "100")).toEqual({
      rows: [{ category: "movements.split.pickCategory" }],
    });
  });

  it("asks for an amount when a category is picked", () => {
    expect(splitDraftErrors([part({ amount: "" })], "100")).toEqual({
      rows: [{ amount: "movements.split.badAmount" }],
    });
  });

  it("refuses zero, three decimals and text in the amount", () => {
    for (const amount of ["0", "1.234", "abc"]) {
      expect(splitDraftErrors([part({ amount })], "100")).toEqual({
        rows: [{ amount: "movements.split.badAmount" }],
      });
    }
  });

  it("reports the over-the-limit error with the row errors", () => {
    expect(splitDraftErrors([part({ amount: "120" })], "100")).toEqual({
      rows: [{}],
      total: "movements.split.over",
    });
    expect(splitDraftErrors([part({ category: "", amount: "120" })], "100")).toEqual({
      rows: [{ category: "movements.split.pickCategory" }],
      total: "movements.split.over",
    });
  });

  it("allows exactly the limit, and the limit of a sub-cent value", () => {
    expect(splitDraftErrors([part({ amount: "100" })], "100").total).toBeUndefined();
    expect(splitDraftErrors([part({ amount: "100" })], splitLimit("100.004")).total).toBeUndefined();
    expect(splitDraftErrors([part({ amount: "100.01" })], splitLimit("100.004")).total).toBe(
      "movements.split.over",
    );
  });
});

describe("normalisedSplits", () => {
  it("sends the whole list in order, with the shortest amounts", () => {
    expect(
      normalisedSplits([
        part({ key: 0, category: "3", amount: "20,5", tags: ["groceries"] }),
        part({ key: 1, category: "4", amount: "30.00" }),
      ]),
    ).toEqual([
      { category_id: 3, usd_amount: "20.5", tags: ["groceries"] },
      { category_id: 4, usd_amount: "30", tags: [] },
    ]);
  });

  it("drops empty rows", () => {
    expect(
      normalisedSplits([
        part({ category: "", amount: "", tags: [], tagText: "" }),
        part({ key: 1, category: "3", amount: "20" }),
      ]),
    ).toEqual([{ category_id: 3, usd_amount: "20", tags: [] }]);
  });

  it("is empty when every row was removed", () => {
    expect(normalisedSplits([])).toEqual([]);
  });
});

describe("sameSplits", () => {
  it("treats amounts as decimals, so 20 and 20.00 are the same", () => {
    expect(
      sameSplits([savedPart({ usd_amount: "20" })], [
        { category_id: 1, usd_amount: "20.00", tags: [] },
      ]),
    ).toBe(true);
  });

  it("ignores the order of a part's tags", () => {
    expect(
      sameSplits(
        [savedPart({ tags: ["a", "b"] })],
        [{ category_id: 1, usd_amount: "20", tags: ["b", "a"] }],
      ),
    ).toBe(true);
  });

  it("notices a different count, position order or category", () => {
    expect(sameSplits([savedPart(), savedPart({ category_id: 2 })], [
      { category_id: 1, usd_amount: "20", tags: [] },
    ])).toBe(false);
    expect(
      sameSplits(
        [savedPart({ category_id: 1 }), savedPart({ category_id: 2 })],
        [
          { category_id: 2, usd_amount: "20", tags: [] },
          { category_id: 1, usd_amount: "20", tags: [] },
        ],
      ),
    ).toBe(false);
    expect(
      sameSplits([savedPart()], [{ category_id: 2, usd_amount: "20", tags: [] }]),
    ).toBe(false);
  });

  it("notices a different tag set and a removed list", () => {
    expect(
      sameSplits([savedPart({ tags: ["a"] })], [
        { category_id: 1, usd_amount: "20", tags: ["b"] },
      ]),
    ).toBe(false);
    expect(sameSplits([savedPart()], [])).toBe(false);
  });
});

describe("splitDraftsOf", () => {
  it("starts each row from a saved part, with no pending tag", () => {
    expect(
      splitDraftsOf({
        splits: [
          savedPart({ category_id: 3, usd_amount: "20", tags: ["a"] }),
          savedPart({ category_id: null, usd_amount: "5.5" }),
        ],
      }),
    ).toEqual([
      { key: 0, category: "3", amount: "20", tags: ["a"], tagText: "" },
      { key: 1, category: "", amount: "5.5", tags: [], tagText: "", missingCategory: true },
    ]);
  });
});

describe("nextSplitKey", () => {
  it("goes above every row, and starts at zero", () => {
    expect(nextSplitKey([])).toBe(0);
    expect(nextSplitKey([part({ key: 0 }), part({ key: 1 })])).toBe(2);
    expect(nextSplitKey([part({ key: 5 })])).toBe(6);
  });
});

describe("canSplit", () => {
  it("needs a USD value above zero", () => {
    expect(canSplit({ usd_value: "100" })).toBe(true);
    expect(canSplit({ usd_value: "0.01" })).toBe(true);
    expect(canSplit({ usd_value: "0" })).toBe(false);
    expect(canSplit({ usd_value: null })).toBe(false);
  });
});

describe("splitSegments", () => {
  const nameOf = (categoryId: number | null) =>
    categoryId === null ? "No category" : `Category ${categoryId}`;

  it("shows two segments and counts the rest as more", () => {
    const movement = splitMovement({
      category_id: 9,
      split_status: "applied",
      split_rest_usd: "50",
      splits: [savedPart({ category_id: 1, usd_amount: "20" }), savedPart({ category_id: 2, usd_amount: "30" })],
    });
    expect(splitSegments(movement, nameOf)).toEqual({
      segments: [
        { name: "Category 1", usd: "20" },
        { name: "Category 2", usd: "30" },
      ],
      more: 1,
    });
  });

  it("adds the rest only when it's above zero, in the movement's category", () => {
    const base = splitMovement({
      category_id: 9,
      split_status: "applied",
      splits: [savedPart({ category_id: 1, usd_amount: "100" })],
    });
    expect(splitSegments({ ...base, split_rest_usd: "0" }, nameOf)).toEqual({
      segments: [{ name: "Category 1", usd: "100" }],
      more: 0,
    });
    expect(splitSegments({ ...base, split_rest_usd: "0.5" }, nameOf)).toEqual({
      segments: [
        { name: "Category 1", usd: "100" },
        { name: "Category 9", usd: "0.5" },
      ],
      more: 0,
    });
  });

  it("names a deleted part category as no category", () => {
    const movement = splitMovement({
      split_status: "applied",
      split_rest_usd: "0",
      splits: [savedPart({ category_id: null, usd_amount: "20" })],
    });
    expect(splitSegments(movement, nameOf).segments[0].name).toBe("No category");
  });

  it("has no segments when the parts don't apply", () => {
    const unpriced = splitMovement({
      split_status: "unpriced",
      split_rest_usd: null,
      splits: [savedPart()],
    });
    expect(splitSegments(unpriced, nameOf)).toEqual({ segments: [], more: 0 });
    expect(splitSegments(splitMovement(), nameOf)).toEqual({ segments: [], more: 0 });
  });
});

describe("constants", () => {
  it("caps the parts at 20 and cycles ten bar colors", () => {
    expect(MAX_SPLITS).toBe(20);
    expect(SPLIT_COLORS).toHaveLength(10);
  });
});
