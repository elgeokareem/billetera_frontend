import { describe, expect, it } from "vitest";
import { labelPatch, labelUndoPatch } from "./labelPatch";

const saved = { reason: "Dinner", tags: ["shared", "trip-2026"], review_status: null };

describe("labelPatch", () => {
  it("sends the category alone when nothing else changed", () => {
    expect(labelPatch(saved, 3, "Dinner", ["shared", "trip-2026"])).toEqual({ category_id: 3 });
  });

  it("sends a typed reason that differs from the saved one", () => {
    expect(labelPatch(saved, 3, "  Dinner with Ana  ", ["shared", "trip-2026"])).toEqual({
      category_id: 3,
      reason: "Dinner with Ana",
    });
  });

  it("sends no reason when the field is blank", () => {
    expect(labelPatch(saved, 3, "   ", ["shared", "trip-2026"])).toEqual({ category_id: 3 });
  });

  it("sends no reason when it's the saved one, once trimmed", () => {
    expect(labelPatch(saved, 3, " Dinner ", ["shared", "trip-2026"])).toEqual({ category_id: 3 });
  });

  it("sends tags only when the set changed", () => {
    expect(labelPatch(saved, 3, "Dinner", ["shared"])).toEqual({
      category_id: 3,
      tags: ["shared"],
    });
  });

  it("ignores the order of the tags", () => {
    expect(labelPatch(saved, 3, "Dinner", ["trip-2026", "shared"])).toEqual({ category_id: 3 });
  });

  it("sends an empty list when every tag was removed", () => {
    expect(labelPatch(saved, 3, "Dinner", [])).toEqual({ category_id: 3, tags: [] });
  });

  it("sends tags to a movement that had none", () => {
    expect(labelPatch({ reason: null, tags: [], review_status: null }, 5, "", ["trip-2026"])).toEqual({
      category_id: 5,
      tags: ["trip-2026"],
    });
  });

  it("sends the category, the reason and the tags together", () => {
    expect(labelPatch({ reason: null, tags: [], review_status: null }, 5, "Dinner", ["shared"])).toEqual({
      category_id: 5,
      reason: "Dinner",
      tags: ["shared"],
    });
  });

  it("confirms a suspected row in the same call", () => {
    expect(labelPatch({ ...saved, review_status: "suspected" }, 3, "Dinner", ["shared", "trip-2026"])).toEqual({
      category_id: 3,
      review: "confirmed",
    });
  });

  it("sends no review for a Binance row or a confirmed one", () => {
    expect(labelPatch(saved, 3, "Dinner", ["shared", "trip-2026"])).toEqual({ category_id: 3 });
    expect(
      labelPatch({ ...saved, review_status: "confirmed" }, 3, "Dinner", ["shared", "trip-2026"]),
    ).toEqual({ category_id: 3 });
  });
});

describe("labelUndoPatch", () => {
  it("returns a suspected row to review with the category cleared", () => {
    expect(labelUndoPatch({ review_status: "suspected" })).toEqual({
      category_id: null,
      review: "suspected",
    });
  });

  it("only clears the category for any other movement", () => {
    expect(labelUndoPatch({ review_status: null })).toEqual({ category_id: null });
    expect(labelUndoPatch({ review_status: "confirmed" })).toEqual({ category_id: null });
  });
});
