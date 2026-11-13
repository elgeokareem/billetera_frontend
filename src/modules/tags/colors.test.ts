import { describe, expect, it } from "vitest";
import { TAG_COLORS, tagColor, tagColorLookup, tagColorStyle } from "./colors";
import type { Tag, TagColor } from "./types";

const tag = (id: number, name: string, color: TagColor): Tag => ({
  id,
  name,
  color,
  movement_count: 0,
});

describe("TAG_COLORS", () => {
  it("has the backend's 12 names, in its order", () => {
    expect(TAG_COLORS).toEqual([
      "red",
      "pink",
      "grape",
      "violet",
      "indigo",
      "blue",
      "cyan",
      "teal",
      "green",
      "lime",
      "yellow",
      "orange",
    ]);
    expect(new Set(TAG_COLORS).size).toBe(12);
  });
});

describe("tagColor", () => {
  it("passes every palette name through", () => {
    for (const color of TAG_COLORS) {
      expect(tagColor(color)).toBe(color);
    }
  });

  it("draws gray for a missing or unknown value", () => {
    expect(tagColor(undefined)).toBe("gray");
    expect(tagColor("")).toBe("gray");
    expect(tagColor("gray")).toBe("gray");
    expect(tagColor("Red")).toBe("gray");
    expect(tagColor("#f00")).toBe("gray");
  });
});

describe("tagColorStyle", () => {
  it("uses the light background and text of the color", () => {
    expect(tagColorStyle("teal")).toEqual({
      backgroundColor: "var(--mantine-color-teal-light)",
      color: "var(--mantine-color-teal-light-color)",
    });
  });
});

describe("tagColorLookup", () => {
  it("finds a color by name", () => {
    const colorOf = tagColorLookup([tag(1, "shared", "teal"), tag(2, "old-trip", "blue")]);
    expect(colorOf("shared")).toBe("teal");
    expect(colorOf("old-trip")).toBe("blue");
  });

  it("draws gray for an unknown name", () => {
    const colorOf = tagColorLookup([tag(1, "shared", "teal")]);
    expect(colorOf("trip-2026")).toBe("gray");
  });

  it("draws gray before the tags load", () => {
    const colorOf = tagColorLookup(undefined);
    expect(colorOf("shared")).toBe("gray");
  });
});
