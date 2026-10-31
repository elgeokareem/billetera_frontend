import { describe, expect, it } from "vitest";
import { parseSearch, stringifySearch } from "./search-params";

describe("parseSearch", () => {
  it("keeps every value as the text the URL has", () => {
    expect(parseSearch("?q=1.50&r=1e3&s=null&t=true&u=007")).toEqual({
      q: "1.50",
      r: "1e3",
      s: "null",
      t: "true",
      u: "007",
    });
  });

  it("reads an escaped comma and a %2B as the characters they stand for", () => {
    expect(parseSearch("?kind=p2p%2Cpay&from=2026-10-01T00%3A00%3A00%2B02%3A00")).toEqual({
      kind: "p2p,pay",
      from: "2026-10-01T00:00:00+02:00",
    });
  });

  it("accepts a search without its leading question mark", () => {
    expect(parseSearch("kind=p2p")).toEqual({ kind: "p2p" });
  });

  it("returns an empty object for an empty search", () => {
    expect(parseSearch("")).toEqual({});
  });
});

describe("stringifySearch", () => {
  it("writes a list with plain commas and a time with plain colons, as the API reads them", () => {
    expect(stringifySearch({ kind: "withdrawal,p2p,pay", from: "2026-10-01T00:00:00Z" })).toBe(
      "?kind=withdrawal,p2p,pay&from=2026-10-01T00:00:00Z",
    );
  });

  it("escapes a + as %2B, so an offset survives the URL", () => {
    expect(stringifySearch({ from: "2026-10-01T00:00:00+02:00" })).toBe("?from=2026-10-01T00:00:00%2B02:00");
  });

  it("leaves out missing values and writes numbers and booleans as text", () => {
    expect(stringifySearch({ a: undefined, b: null, c: "x", d: 3, e: true })).toBe("?c=x&d=3&e=true");
  });

  it("writes nothing for an empty search", () => {
    expect(stringifySearch({})).toBe("");
  });

  it("gives back the same text it was given, for values a number reader would change", () => {
    const search = { q: "1.50", r: "1e3", s: "null", t: "2 + 2 = 4", u: "100%" };
    expect(parseSearch(stringifySearch(search))).toEqual(search);
  });
});
