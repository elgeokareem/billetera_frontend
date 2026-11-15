import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { notCountingCaption, notCountingNames } from "./counting";
import type { Category } from "./types";

function category(id: number, name: string, countsAsSpending = true): Category {
  return {
    id,
    name,
    counts_as_spending: countsAsSpending,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

/** A t that renders the caption's shape without i18next's plural rules. */
const t = ((key: string, options?: Record<string, unknown>) => {
  if (key === "common.notCountingMore") {
    return `${String(options?.names)} +${String(options?.count)}`;
  }
  return `Not counting: ${String(options?.names)}`;
}) as TFunction;

const categories = [
  category(1, "Food"),
  category(2, "Copy trading", false),
  category(3, "Rent"),
  category(4, "Travel", false),
];

describe("notCountingNames", () => {
  it("has nothing to name when no category is flagged", () => {
    expect(notCountingNames([category(1, "Food")], {})).toEqual([]);
    expect(notCountingNames(undefined, {})).toEqual([]);
  });

  it("names the flagged categories in the list's order", () => {
    expect(notCountingNames(categories, {})).toEqual(["Copy trading", "Travel"]);
  });

  it("names nothing when the request filters by category, since the chart then shows it", () => {
    expect(notCountingNames(categories, { category_id: "2" })).toEqual([]);
    expect(notCountingNames(categories, { category_id: "none" })).toEqual([]);
  });

  it("leaves out a flagged category that an explicit exclusion already speaks for", () => {
    expect(notCountingNames(categories, { exclude_category_id: "2" })).toEqual(["Travel"]);
    expect(notCountingNames(categories, { exclude_category_id: "2,4" })).toEqual([]);
  });
});

describe("notCountingCaption", () => {
  it("has no caption with no names", () => {
    expect(notCountingCaption([], t)).toBeNull();
  });

  it("names one category", () => {
    expect(notCountingCaption(["Copy trading"], t)).toBe("Not counting: Copy trading");
  });

  it("joins two names", () => {
    expect(notCountingCaption(["Copy trading", "Travel"], t)).toBe(
      "Not counting: Copy trading, Travel",
    );
  });

  it("names the first two and counts the rest from the third", () => {
    expect(notCountingCaption(["Copy trading", "Travel", "Food"], t)).toBe(
      "Not counting: Copy trading, Travel +1",
    );
  });
});
