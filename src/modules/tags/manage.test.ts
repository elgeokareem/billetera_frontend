import { describe, expect, it } from "vitest";
import { newTagNameError } from "./manage";
import type { Tag, TagColor } from "./types";

const tag = (id: number, name: string, color: TagColor = "teal"): Tag => ({
  id,
  name,
  color,
  movement_count: 0,
});

const tags = [tag(1, "shared"), tag(2, "istanbul")];

describe("newTagNameError", () => {
  it("accepts a valid new name", () => {
    expect(newTagNameError("Trip 2026", tags)).toBeNull();
  });

  it("refuses a blank name", () => {
    expect(newTagNameError("", tags)).toBe("errors.invalidTag");
    expect(newTagNameError("   ", tags)).toBe("errors.invalidTag");
  });

  it("refuses 33 code points", () => {
    expect(newTagNameError("😀".repeat(33), tags)).toBe("errors.invalidTag");
  });

  it("refuses a comma", () => {
    expect(newTagNameError("a,b", tags)).toBe("errors.invalidTag");
  });

  it("refuses a control character", () => {
    expect(newTagNameError("a\nb", tags)).toBe("errors.invalidTag");
  });

  it("refuses an exact duplicate", () => {
    expect(newTagNameError("shared", tags)).toBe("errors.tagExists");
  });

  it("refuses a duplicate after trimming and lower-casing", () => {
    expect(newTagNameError("  SHARED  ", tags)).toBe("errors.tagExists");
  });

  it("applies the İ rule", () => {
    expect(newTagNameError("İSTANBUL", tags)).toBe("errors.tagExists");
  });

  it("allows the tag's own name when it is being renamed", () => {
    expect(newTagNameError("Shared", tags, 1)).toBeNull();
    expect(newTagNameError("shared", tags, 1)).toBeNull();
  });

  it("still refuses another tag's name when an ID is excepted", () => {
    expect(newTagNameError("istanbul", tags, 1)).toBe("errors.tagExists");
  });
});
