import { describe, expect, it } from "vitest";
import { draftOf, NO_CATEGORY, patchFor } from "./patch";
import type { MovementDraft } from "./patch";
import type { Split } from "./types";

// A movement with a reason, category 3 and one tag, as the list has it.
const saved = { reason: "Rent for October", category_id: 3, tags: ["rent"], splits: [] };

function draft(overrides: Partial<MovementDraft>): MovementDraft {
  return {
    reason: "Rent for October",
    category: "3",
    tags: ["rent"],
    splits: [],
    ...overrides,
  };
}

function savedPart(overrides: Partial<Split> = {}): Split {
  return { category_id: 3, usd_amount: "20", tags: [], ...overrides };
}

describe("patchFor", () => {
  it("sends only the category when only the category changed, and no reason or tags key", () => {
    const body = patchFor(saved, draft({ category: "7" }));
    expect(body).toEqual({ category_id: 7 });
    expect(Object.keys(body)).not.toContain("reason");
    expect(Object.keys(body)).not.toContain("tags");
  });

  it("sends only the reason when only the reason changed, and no category or tags key", () => {
    const body = patchFor(saved, draft({ reason: "Rent for November" }));
    expect(body).toEqual({ reason: "Rent for November" });
    expect(Object.keys(body)).not.toContain("category_id");
    expect(Object.keys(body)).not.toContain("tags");
  });

  it("sends nothing when nothing changed", () => {
    expect(patchFor(saved, draftOf(saved))).toEqual({});
  });

  it("treats a reason with spaces around it as the same reason", () => {
    expect(patchFor(saved, draft({ reason: "  Rent for October \n" }))).toEqual({});
  });

  it("sends null for a reason that was cleared, or left as spaces", () => {
    expect(patchFor(saved, draft({ reason: "" }))).toEqual({ reason: null });
    expect(patchFor(saved, draft({ reason: "   " }))).toEqual({ reason: null });
  });

  it("sends null for a category that was cleared", () => {
    expect(patchFor(saved, draft({ category: NO_CATEGORY }))).toEqual({ category_id: null });
  });

  it("sends a category to a movement that had none, as a number", () => {
    const none = { reason: null, category_id: null, tags: [], splits: [] };
    expect(patchFor(none, draft({ reason: "", category: "5", tags: [] }))).toEqual({ category_id: 5 });
  });

  it("sends a reason to a movement that had none, and nothing for an empty draft", () => {
    const none = { reason: null, category_id: null, tags: [], splits: [] };
    expect(patchFor(none, draft({ reason: "Gift", category: NO_CATEGORY, tags: [] }))).toEqual({
      reason: "Gift",
    });
    expect(patchFor(none, draftOf(none))).toEqual({});
  });

  it("sends a reason up to the API's 500 characters, as typed", () => {
    const reason = "x".repeat(500);
    expect(patchFor(saved, draft({ reason }))).toEqual({ reason });
  });

  it("sends the whole tag list when one tag was removed", () => {
    const tagged = { reason: null, category_id: null, tags: ["a", "b"], splits: [] };
    expect(patchFor(tagged, draft({ reason: "", category: NO_CATEGORY, tags: ["a"] }))).toEqual({
      tags: ["a"],
    });
  });

  it("sends an empty list when every tag was removed", () => {
    const tagged = { reason: null, category_id: null, tags: ["a", "b"], splits: [] };
    expect(patchFor(tagged, draft({ reason: "", category: NO_CATEGORY, tags: [] }))).toEqual({ tags: [] });
  });

  it("sends tags to a movement that had none", () => {
    const none = { reason: null, category_id: null, tags: [], splits: [] };
    expect(patchFor(none, draft({ reason: "", category: NO_CATEGORY, tags: ["trip-2026"] }))).toEqual({
      tags: ["trip-2026"],
    });
  });

  it("ignores the order of the tags", () => {
    const tagged = { reason: null, category_id: null, tags: ["a", "b"], splits: [] };
    expect(patchFor(tagged, draft({ reason: "", category: NO_CATEGORY, tags: ["b", "a"] }))).toEqual({});
  });

  it("sends no splits key when the parts didn't change", () => {
    const split = {
      ...saved,
      splits: [savedPart({ category_id: 3, usd_amount: "20", tags: ["rent"] })],
    };
    const body = patchFor(
      split,
      draft({
        splits: [{ key: 0, category: "3", amount: "20.00", tags: ["rent"], tagText: "" }],
      }),
    );
    expect(body).toEqual({});
    expect(Object.keys(body)).not.toContain("splits");
  });

  it("sends the whole normalised list when a part changed", () => {
    const split = {
      ...saved,
      splits: [savedPart({ category_id: 3, usd_amount: "20", tags: ["rent"] })],
    };
    expect(
      patchFor(
        split,
        draft({
          splits: [
            { key: 0, category: "3", amount: "20", tags: ["rent"], tagText: "" },
            { key: 1, category: "4", amount: "12,5", tags: ["trip"], tagText: "" },
          ],
        }),
      ),
    ).toEqual({
      splits: [
        { category_id: 3, usd_amount: "20", tags: ["rent"] },
        { category_id: 4, usd_amount: "12.5", tags: ["trip"] },
      ],
    });
  });

  it("sends splits to a movement that had none, and [] when every part was removed", () => {
    expect(
      patchFor(
        saved,
        draft({
          splits: [{ key: 0, category: "4", amount: "9", tags: [], tagText: "" }],
        }),
      ),
    ).toEqual({ splits: [{ category_id: 4, usd_amount: "9", tags: [] }] });

    const split = { ...saved, splits: [savedPart()] };
    expect(patchFor(split, draft({ splits: [] }))).toEqual({ splits: [] });
  });

  it("doesn't send an incomplete list, so a saved part whose category was deleted isn't dropped", () => {
    const split = {
      ...saved,
      splits: [savedPart({ category_id: null, usd_amount: "20" })],
    };
    expect(
      patchFor(
        split,
        draft({
          splits: [
            {
              key: 0,
              category: "",
              amount: "20",
              tags: [],
              tagText: "",
              missingCategory: true,
            },
          ],
        }),
      ),
    ).toEqual({});
    expect(
      patchFor(
        saved,
        draft({
          splits: [{ key: 0, category: "", amount: "5", tags: [], tagText: "" }],
        }),
      ),
    ).toEqual({});
  });
});

describe("draftOf", () => {
  it("starts the form from the saved values", () => {
    expect(draftOf(saved)).toEqual({
      reason: "Rent for October",
      category: "3",
      tags: ["rent"],
      splits: [],
    });
    expect(draftOf({ reason: null, category_id: null, tags: [], splits: [] })).toEqual({
      reason: "",
      category: NO_CATEGORY,
      tags: [],
      splits: [],
    });
  });

  it("starts the parts from the saved ones, in order", () => {
    expect(
      draftOf({
        reason: null,
        category_id: 3,
        tags: [],
        splits: [
          savedPart({ category_id: 4, usd_amount: "20", tags: ["groceries"] }),
          savedPart({ category_id: null, usd_amount: "5" }),
        ],
      }),
    ).toEqual({
      reason: "",
      category: "3",
      tags: [],
      splits: [
        { key: 0, category: "4", amount: "20", tags: ["groceries"], tagText: "" },
        { key: 1, category: "", amount: "5", tags: [], tagText: "", missingCategory: true },
      ],
    });
  });
});
