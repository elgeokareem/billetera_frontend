import { describe, expect, it } from "vitest";
import type { Category } from "./types";
import { isValidCategoryName } from "./api";
import { splitCategories } from "./ranking";

function category(id: number, name: string): Category {
  return { id, name, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
}

const names = (list: Category[]) => list.map((item) => item.name);

describe("splitCategories", () => {
  it("shows every category as a button, in name order, up to six", () => {
    const categories = [category(1, "Food"), category(2, "Income"), category(3, "Rent"), category(4, "Travel")];
    const { buttons, more } = splitCategories(categories, new Map([[4, 9]]));
    expect(names(buttons)).toEqual(["Food", "Income", "Rent", "Travel"]);
    expect(more).toEqual([]);
  });

  it("shows the five most used as buttons, and the rest in a select, above six", () => {
    const categories = [
      category(1, "Food"), category(2, "Health"), category(3, "Income"), category(4, "Rent"),
      category(5, "Shopping"), category(6, "Transfer"), category(7, "Travel"), category(8, "Utilities"),
    ];
    const uses = new Map([[5, 3], [1, 2], [7, 2], [2, 2], [4, 1], [6, 1]]);
    const { buttons, more } = splitCategories(categories, uses);
    expect(names(buttons)).toEqual(["Shopping", "Food", "Health", "Travel", "Rent"]);
    expect(names(more)).toEqual(["Income", "Transfer", "Utilities"]);
  });

  it("breaks ties in use by name, and puts unused categories after the used ones", () => {
    const categories = [
      category(1, "Zebra"), category(2, "Alpha"), category(3, "Mango"), category(4, "Beta"),
      category(5, "Gamma"), category(6, "Delta"), category(7, "Echo"),
    ];
    const { buttons, more } = splitCategories(categories, new Map([[1, 1]]));
    expect(names(buttons)).toEqual(["Zebra", "Alpha", "Beta", "Delta", "Echo"]);
    expect(names(more)).toEqual(["Gamma", "Mango"]);
  });
});

describe("isValidCategoryName", () => {
  it("accepts 1 to 64 characters once trimmed", () => {
    expect(isValidCategoryName("  Food ")).toBe(true);
    expect(isValidCategoryName("a".repeat(64))).toBe(true);
  });

  it("refuses an empty name, a long one and control characters", () => {
    expect(isValidCategoryName("   ")).toBe(false);
    expect(isValidCategoryName("a".repeat(65))).toBe(false);
    expect(isValidCategoryName("food\u0007")).toBe(false);
  });

  it("counts characters, not UTF-16 units", () => {
    expect(isValidCategoryName("😀".repeat(64))).toBe(true);
    expect(isValidCategoryName("😀".repeat(65))).toBe(false);
  });
});
