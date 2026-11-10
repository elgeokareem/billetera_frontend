import { describe, expect, it } from "vitest";
import { isValidKeyText, KEY_TEXT_MAX, KEY_TEXT_MIN } from "./keyFormat";

describe("isValidKeyText", () => {
  it("accepts the shortest and longest values", () => {
    expect(KEY_TEXT_MIN).toBe(16);
    expect(KEY_TEXT_MAX).toBe(128);
    expect(isValidKeyText("a".repeat(16))).toBe(true);
    expect(isValidKeyText("a".repeat(128))).toBe(true);
  });

  it("rejects one character too few or too many", () => {
    expect(isValidKeyText("a".repeat(15))).toBe(false);
    expect(isValidKeyText("a".repeat(129))).toBe(false);
  });

  it("trims the value first", () => {
    expect(isValidKeyText(`  ${"a".repeat(16)}  `)).toBe(true);
  });

  it("rejects empty values", () => {
    expect(isValidKeyText("")).toBe(false);
    expect(isValidKeyText("   ")).toBe(false);
  });

  it("rejects characters that aren't ASCII letters or digits", () => {
    expect(isValidKeyText(`${"a".repeat(8)} ${"a".repeat(8)}`)).toBe(false);
    for (const character of ["-", "_", "ñ", "０"]) {
      expect(isValidKeyText(`${"a".repeat(15)}${character}`)).toBe(false);
    }
  });
});
