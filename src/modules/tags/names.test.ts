import { describe, expect, it } from "vitest";
import {
  applyTagInput,
  MAX_TAGS,
  normaliseTagName,
  normaliseTags,
  toTagCase,
  visibleTags,
  withPendingTag,
} from "./names";

const names = (count: number) => Array.from({ length: count }, (_, index) => `tag-${index + 1}`);

describe("toTagCase", () => {
  it("lower-cases ASCII", () => {
    expect(toTagCase("Trip-2026")).toBe("trip-2026");
  });

  it("maps İ to a plain i, as Go does", () => {
    expect(toTagCase("İSTANBUL")).toBe("istanbul");
  });

  it("never applies the final-sigma rule", () => {
    expect(toTagCase("Σ")).toBe("σ");
    expect(toTagCase("ΑΣ")).toBe("ασ");
  });

  it("lower-cases accented letters", () => {
    expect(toTagCase("ÑANDÚ")).toBe("ñandú");
  });
});

describe("normaliseTagName", () => {
  it("trims and lower-cases", () => {
    expect(normaliseTagName("  Trip-2026  ")).toBe("trip-2026");
  });

  it("allows spaces inside a name", () => {
    expect(normaliseTagName("Trip 2026")).toBe("trip 2026");
  });

  it("refuses empty text and spaces only", () => {
    expect(normaliseTagName("")).toBeUndefined();
    expect(normaliseTagName("   ")).toBeUndefined();
  });

  it("counts code points, so 32 emoji are accepted and 33 aren't", () => {
    expect(normaliseTagName("😀".repeat(32))).toBe("😀".repeat(32));
    expect(normaliseTagName("😀".repeat(33))).toBeUndefined();
  });

  it("counts accented letters the same way", () => {
    expect(normaliseTagName("Ñ".repeat(32))).toBe("ñ".repeat(32));
    expect(normaliseTagName("Ñ".repeat(33))).toBeUndefined();
  });

  it("refuses a control character, a lone surrogate and a comma", () => {
    expect(normaliseTagName("a\tb")).toBeUndefined();
    expect(normaliseTagName("a\nb")).toBeUndefined();
    expect(normaliseTagName("a\u0000b")).toBeUndefined();
    expect(normaliseTagName("\ud800")).toBeUndefined();
    expect(normaliseTagName("a,b")).toBeUndefined();
  });
});

describe("normaliseTags", () => {
  it("keeps the order, and drops a repeat after lower-casing", () => {
    expect(normaliseTags(["Shared", "Trip", "shared"])).toEqual(["shared", "trip"]);
  });

  it("drops invalid names", () => {
    expect(normaliseTags(["a", "bad,name", "", "  ", "b"])).toEqual(["a", "b"]);
  });

  it("keeps the first 10 tags", () => {
    expect(normaliseTags(names(12))).toEqual(names(10));
  });
});

describe("applyTagInput", () => {
  it("normalises the items with no error", () => {
    expect(applyTagInput(["Trip", "shared"])).toEqual({ tags: ["trip", "shared"] });
  });

  it("reports an invalid name, and keeps the rest", () => {
    expect(applyTagInput(["trip", "a,b"])).toEqual({ tags: ["trip"], error: "invalid" });
  });

  it("reports the limit past 10 distinct names", () => {
    expect(applyTagInput(names(11))).toEqual({ tags: names(10), error: "limit" });
  });

  it("doesn't count a repeat towards the limit", () => {
    expect(applyTagInput([...names(10), "tag-1"])).toEqual({ tags: names(10) });
  });

  it("reports invalid before limit", () => {
    expect(applyTagInput(["a,b", ...names(11)])).toEqual({ tags: names(10), error: "invalid" });
  });
});

describe("withPendingTag", () => {
  it("changes nothing for blank text", () => {
    expect(withPendingTag(["trip"], "   ")).toEqual({ tags: ["trip"] });
  });

  it("adds a valid pending name, normalised", () => {
    expect(withPendingTag(["shared"], "Trip-2026")).toEqual({ tags: ["shared", "trip-2026"] });
  });

  it("reports an invalid pending name", () => {
    expect(withPendingTag(["shared"], "a,b")).toEqual({ tags: ["shared"], error: "invalid" });
  });

  it("reports the limit for an 11th name", () => {
    expect(withPendingTag(names(10), "tag-11")).toEqual({ tags: names(10), error: "limit" });
  });

  it("doesn't add a repeat of a tag already there", () => {
    expect(withPendingTag(["trip"], "Trip")).toEqual({ tags: ["trip"] });
  });
});

describe("visibleTags", () => {
  it("shows nothing for no tags", () => {
    expect(visibleTags([])).toEqual({ shown: [], hidden: [] });
  });

  it("shows up to 3 tags and hides the rest", () => {
    expect(visibleTags(["a", "b", "c"])).toEqual({ shown: ["a", "b", "c"], hidden: [] });
    expect(visibleTags(["a", "b", "c", "d"])).toEqual({ shown: ["a", "b", "c"], hidden: ["d"] });
  });

  it("hides all but 3 of a longer list", () => {
    expect(visibleTags(names(MAX_TAGS))).toEqual({ shown: names(3), hidden: names(MAX_TAGS).slice(3) });
  });
});
