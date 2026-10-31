import { describe, expect, it } from "vitest";
import en from "./en.json";
import es from "./es.json";

// Every key path of a translation file, as dot-separated names.
function keyPaths(value: unknown, prefix = ""): string[] {
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      keyPaths(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

describe("translation files", () => {
  it("have the same keys in English and Spanish", () => {
    expect(keyPaths(es).sort()).toEqual(keyPaths(en).sort());
  });

  it("have a plural form for each _one key, and the other form beside it", () => {
    const paths = keyPaths(en);
    for (const path of paths.filter((item) => item.endsWith("_one"))) {
      expect(paths).toContain(path.replace(/_one$/, "_other"));
    }
  });

  it("have no empty strings", () => {
    const empty = keyPaths(en).filter((path) => {
      const value = path.split(".").reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], en);
      return typeof value === "string" && value.trim() === "";
    });
    expect(empty).toEqual([]);
  });
});
