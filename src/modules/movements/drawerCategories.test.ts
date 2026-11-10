import { describe, expect, it } from "vitest";
import type { Category } from "../categories/types";
import { drawerCategoryOptions, newCategoryNameError } from "./drawerCategories";
import { NO_CATEGORY } from "./patch";

const cat = (id: number, name: string) =>
  ({
    id,
    name,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  }) as Category;

describe("drawerCategoryOptions", () => {
  it("has only No category when nothing is loaded or created", () => {
    expect(drawerCategoryOptions([], [], "No category")).toEqual([
      { value: NO_CATEGORY, label: "No category" },
    ]);
  });

  it("lists the loaded categories in their order, after No category", () => {
    expect(
      drawerCategoryOptions([cat(2, "Food"), cat(7, "Rent")], [], "No category"),
    ).toEqual([
      { value: NO_CATEGORY, label: "No category" },
      { value: "2", label: "Food" },
      { value: "7", label: "Rent" },
    ]);
  });

  it("appends a created category the loaded list doesn't have", () => {
    expect(
      drawerCategoryOptions(
        [cat(2, "Food")],
        [cat(9, "Gifts")],
        "No category",
      ),
    ).toEqual([
      { value: NO_CATEGORY, label: "No category" },
      { value: "2", label: "Food" },
      { value: "9", label: "Gifts" },
    ]);
  });

  it("shows a created category already in the loaded list once", () => {
    expect(
      drawerCategoryOptions(
        [cat(2, "Food")],
        [cat(2, "Food")],
        "No category",
      ),
    ).toEqual([
      { value: NO_CATEGORY, label: "No category" },
      { value: "2", label: "Food" },
    ]);
  });
});

describe("newCategoryNameError", () => {
  it("rejects an empty, blank or 65-character name", () => {
    expect(newCategoryNameError("", [])).toBe("errors.invalidCategoryName");
    expect(newCategoryNameError("   ", [])).toBe("errors.invalidCategoryName");
    expect(newCategoryNameError("x".repeat(65), [])).toBe(
      "errors.invalidCategoryName",
    );
  });

  it("rejects a name with a control character", () => {
    expect(newCategoryNameError("a\u0007b", [])).toBe(
      "errors.invalidCategoryName",
    );
  });

  it("rejects a name that clashes with an existing one ignoring case and spaces", () => {
    expect(newCategoryNameError(" food ", [cat(2, "Food")])).toBe(
      "errors.categoryExists",
    );
  });

  it("accepts a new name", () => {
    expect(
      newCategoryNameError("Gifts", [cat(2, "Food"), cat(3, "Rent")]),
    ).toBeNull();
  });

  it("accepts a 64-character name with no clash", () => {
    expect(newCategoryNameError("x".repeat(64), [])).toBeNull();
  });
});
