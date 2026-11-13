import { describe, expect, it } from "vitest";
import { draftOf, NO_CATEGORY, patchFor } from "./patch";

// A movement with a reason, category 3 and one tag, as the list has it.
const saved = { reason: "Rent for October", category_id: 3, tags: ["rent"] };

describe("patchFor", () => {
  it("sends only the category when only the category changed, and no reason or tags key", () => {
    const body = patchFor(saved, { reason: "Rent for October", category: "7", tags: ["rent"] });
    expect(body).toEqual({ category_id: 7 });
    expect(Object.keys(body)).not.toContain("reason");
    expect(Object.keys(body)).not.toContain("tags");
  });

  it("sends only the reason when only the reason changed, and no category or tags key", () => {
    const body = patchFor(saved, { reason: "Rent for November", category: "3", tags: ["rent"] });
    expect(body).toEqual({ reason: "Rent for November" });
    expect(Object.keys(body)).not.toContain("category_id");
    expect(Object.keys(body)).not.toContain("tags");
  });

  it("sends nothing when nothing changed", () => {
    expect(patchFor(saved, draftOf(saved))).toEqual({});
  });

  it("treats a reason with spaces around it as the same reason", () => {
    expect(
      patchFor(saved, { reason: "  Rent for October \n", category: "3", tags: ["rent"] }),
    ).toEqual({});
  });

  it("sends null for a reason that was cleared, or left as spaces", () => {
    expect(patchFor(saved, { reason: "", category: "3", tags: ["rent"] })).toEqual({ reason: null });
    expect(patchFor(saved, { reason: "   ", category: "3", tags: ["rent"] })).toEqual({ reason: null });
  });

  it("sends null for a category that was cleared", () => {
    expect(
      patchFor(saved, { reason: "Rent for October", category: NO_CATEGORY, tags: ["rent"] }),
    ).toEqual({ category_id: null });
  });

  it("sends a category to a movement that had none, as a number", () => {
    const none = { reason: null, category_id: null, tags: [] };
    expect(patchFor(none, { reason: "", category: "5", tags: [] })).toEqual({ category_id: 5 });
  });

  it("sends a reason to a movement that had none, and nothing for an empty draft", () => {
    const none = { reason: null, category_id: null, tags: [] };
    expect(patchFor(none, { reason: "Gift", category: NO_CATEGORY, tags: [] })).toEqual({
      reason: "Gift",
    });
    expect(patchFor(none, draftOf(none))).toEqual({});
  });

  it("sends a reason up to the API's 500 characters, as typed", () => {
    const reason = "x".repeat(500);
    expect(patchFor(saved, { reason, category: "3", tags: ["rent"] })).toEqual({ reason });
  });

  it("sends the whole tag list when one tag was removed", () => {
    const tagged = { reason: null, category_id: null, tags: ["a", "b"] };
    expect(patchFor(tagged, { reason: "", category: NO_CATEGORY, tags: ["a"] })).toEqual({
      tags: ["a"],
    });
  });

  it("sends an empty list when every tag was removed", () => {
    const tagged = { reason: null, category_id: null, tags: ["a", "b"] };
    expect(patchFor(tagged, { reason: "", category: NO_CATEGORY, tags: [] })).toEqual({ tags: [] });
  });

  it("sends tags to a movement that had none", () => {
    const none = { reason: null, category_id: null, tags: [] };
    expect(patchFor(none, { reason: "", category: NO_CATEGORY, tags: ["trip-2026"] })).toEqual({
      tags: ["trip-2026"],
    });
  });

  it("ignores the order of the tags", () => {
    const tagged = { reason: null, category_id: null, tags: ["a", "b"] };
    expect(patchFor(tagged, { reason: "", category: NO_CATEGORY, tags: ["b", "a"] })).toEqual({});
  });
});

describe("draftOf", () => {
  it("starts the form from the saved values", () => {
    expect(draftOf(saved)).toEqual({ reason: "Rent for October", category: "3", tags: ["rent"] });
    expect(draftOf({ reason: null, category_id: null, tags: [] })).toEqual({
      reason: "",
      category: NO_CATEGORY,
      tags: [],
    });
  });
});
