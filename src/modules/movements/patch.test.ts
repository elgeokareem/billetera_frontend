import { describe, expect, it } from "vitest";
import { draftOf, NO_CATEGORY, patchFor } from "./patch";

// A movement with a reason and category 3, as the list has it.
const saved = { reason: "Rent for October", category_id: 3 };

describe("patchFor", () => {
  it("sends only the category when only the category changed, and no reason key", () => {
    const body = patchFor(saved, { reason: "Rent for October", category: "7" });
    expect(body).toEqual({ category_id: 7 });
    expect(Object.keys(body)).not.toContain("reason");
  });

  it("sends only the reason when only the reason changed, and no category key", () => {
    const body = patchFor(saved, { reason: "Rent for November", category: "3" });
    expect(body).toEqual({ reason: "Rent for November" });
    expect(Object.keys(body)).not.toContain("category_id");
  });

  it("sends nothing when nothing changed", () => {
    expect(patchFor(saved, draftOf(saved))).toEqual({});
  });

  it("treats a reason with spaces around it as the same reason", () => {
    expect(patchFor(saved, { reason: "  Rent for October \n", category: "3" })).toEqual({});
  });

  it("sends null for a reason that was cleared, or left as spaces", () => {
    expect(patchFor(saved, { reason: "", category: "3" })).toEqual({ reason: null });
    expect(patchFor(saved, { reason: "   ", category: "3" })).toEqual({ reason: null });
  });

  it("sends null for a category that was cleared", () => {
    expect(patchFor(saved, { reason: "Rent for October", category: NO_CATEGORY })).toEqual({ category_id: null });
  });

  it("sends a category to a movement that had none, as a number", () => {
    const none = { reason: null, category_id: null };
    expect(patchFor(none, { reason: "", category: "5" })).toEqual({ category_id: 5 });
  });

  it("sends a reason to a movement that had none, and nothing for an empty draft", () => {
    const none = { reason: null, category_id: null };
    expect(patchFor(none, { reason: "Gift", category: NO_CATEGORY })).toEqual({ reason: "Gift" });
    expect(patchFor(none, draftOf(none))).toEqual({});
  });

  it("sends a reason up to the API's 500 characters, as typed", () => {
    const reason = "x".repeat(500);
    expect(patchFor(saved, { reason, category: "3" })).toEqual({ reason });
  });
});

describe("draftOf", () => {
  it("starts the form from the saved values", () => {
    expect(draftOf(saved)).toEqual({ reason: "Rent for October", category: "3" });
    expect(draftOf({ reason: null, category_id: null })).toEqual({ reason: "", category: NO_CATEGORY });
  });
});
