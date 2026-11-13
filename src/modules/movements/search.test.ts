import { describe, expect, it } from "vitest";
import { apiInstant, monthRange } from "../shared/dateRange";
import { parseSearch, stringifySearch } from "../shared/search-params";
import { queryString } from "./api";
import {
  activePreset,
  assetSymbols,
  hasFilters,
  type MovementsSearch,
  NEEDS_LABEL_SEARCH,
  parseMovementsSearch,
  presetRange,
  tagNames,
  toMovementsQuery,
  withFilter,
  withList,
  withoutKey,
  withText,
} from "./search";

// The router hands over the raw search; these tests pass the same shape.
const parse = (raw: Record<string, unknown>) => parseMovementsSearch(raw);

describe("parseMovementsSearch", () => {
  it("keeps valid filters as the API names them", () => {
    expect(
      parse({
        q: "rent",
        kind: "p2p,pay",
        direction: "out",
        status: "completed,pending",
        asset: "bnb",
        asset_match: "any",
        category_id: "3,none",
        has_reason: "false",
      }),
    ).toEqual({
      q: "rent",
      kind: "p2p,pay",
      direction: "out",
      status: "completed,pending",
      asset: "BNB",
      asset_match: "any",
      category_id: "3,none",
      has_reason: "false",
    });
  });

  it("drops the items the API would refuse, and keeps the rest", () => {
    expect(parse({ kind: "p2p,bogus,,pay", status: "nope", category_id: "0,-1,1.5,abc,7" })).toEqual({
      kind: "p2p,pay",
      category_id: "7",
    });
  });

  it("removes a repeated item, and caps a list at 20 items", () => {
    expect(parse({ kind: "p2p,p2p,pay" })).toEqual({ kind: "p2p,pay" });
    const many = Array.from({ length: 25 }, (_, index) => `${index + 1}`).join(",");
    expect(parse({ category_id: many }).category_id?.split(",")).toHaveLength(20);
  });

  it("drops an unknown direction, reason or asset match", () => {
    expect(parse({ direction: "both", has_reason: "yes", asset_match: "asset" })).toEqual({});
  });

  it("keeps asset_match only with a coin", () => {
    expect(parse({ asset_match: "any" })).toEqual({});
    expect(parse({ asset: "!!", asset_match: "any" })).toEqual({});
    expect(parse({ asset: "btc", asset_match: "any" })).toEqual({ asset: "BTC", asset_match: "any" });
  });

  it("normalises the tag names, drops the invalid ones and dedupes them", () => {
    expect(parse({ tag: "Trip-2026,TRIP-2026,shared" })).toEqual({ tag: "trip-2026,shared" });
    expect(parse({ tag: "a,,a,b,c" })).toEqual({ tag: "a,b,c" });
    expect(parse({ tag: `${"x".repeat(33)},ok` })).toEqual({ tag: "ok" });
    expect(parse({ tag: "a,b" })).toEqual({ tag: "a,b" });
  });

  it("caps the tag list at 20 names", () => {
    const many = Array.from({ length: 25 }, (_, index) => `tag-${index + 1}`).join(",");
    expect(parse({ tag: many }).tag?.split(",")).toHaveLength(20);
  });

  it("reads a space in a tag from a + or %20", () => {
    expect(parse(parseSearch("?tag=trip+2026"))).toEqual({ tag: "trip 2026" });
    expect(parse(parseSearch("?tag=trip%202026"))).toEqual({ tag: "trip 2026" });
  });

  it("keeps tag_match only as all, and only with a tag", () => {
    expect(parse({ tag_match: "all" })).toEqual({});
    expect(parse({ tag: "trip-2026", tag_match: "any" })).toEqual({ tag: "trip-2026" });
    expect(parse({ tag: "trip-2026", tag_match: "all" })).toEqual({
      tag: "trip-2026",
      tag_match: "all",
    });
    expect(parse({ tag: "x".repeat(33), tag_match: "all" })).toEqual({});
  });

  it("keeps the search text as typed, but trimmed and at most 100 characters", () => {
    expect(parse({ q: "  1.50  " })).toEqual({ q: "1.50" });
    expect(parse({ q: "   " })).toEqual({});
    expect(parse({ q: "x".repeat(150) }).q).toHaveLength(100);
  });

  it("reads a value that isn't text as absent", () => {
    expect(parse({ q: 5, kind: null, from: 1 })).toEqual({});
  });

  it("keeps a time with an offset, so that the + of the offset is read correctly", () => {
    const search = parseSearch("?from=2026-10-01T00%3A00%3A00%2B02%3A00&to=2026-11-01T00%3A00%3A00Z");
    expect(parse(search)).toEqual({ from: "2026-10-01T00:00:00+02:00", to: "2026-11-01T00:00:00Z" });
  });

  it("drops a range that doesn't parse, or that ends before it starts", () => {
    expect(parse({ from: "2026-10-01", to: "2026-11-01T00:00:00Z" })).toEqual({ to: "2026-11-01T00:00:00Z" });
    expect(parse({ from: "2026-11-01T00:00:00Z", to: "2026-10-01T00:00:00Z" })).toEqual({});
  });

  it("reads the Dashboard's Needs a label link exactly", () => {
    const link = stringifySearch(NEEDS_LABEL_SEARCH);
    expect(link).toBe("?kind=withdrawal,p2p,pay&direction=out&status=completed&category_id=none");
    expect(parse(parseSearch(link))).toEqual(NEEDS_LABEL_SEARCH);
  });

  it("reads the Dashboard's Review all link, which adds the current month", () => {
    const { from, to } = monthRange(new Date(2026, 9, 15));
    const link = stringifySearch({ ...NEEDS_LABEL_SEARCH, from, to });
    expect(parse(parseSearch(link))).toEqual({ ...NEEDS_LABEL_SEARCH, from, to });
  });
});

describe("toMovementsQuery", () => {
  it("sends a list with its commas and no empty keys", () => {
    const query = toMovementsQuery(parse({ kind: "p2p,pay", category_id: "none" }));
    expect(queryString(query)).toBe("?kind=p2p,pay&category_id=none");
  });

  it("sends a time with an offset as a Z time, so no + reaches the API", () => {
    const query = toMovementsQuery(parse({ from: "2026-10-01T00:00:00+02:00", to: "2026-11-01T00:00:00+02:00" }));
    expect(query.from).toBe("2026-09-30T22:00:00Z");
    expect(query.to).toBe("2026-10-31T22:00:00Z");
    expect(queryString(query)).not.toContain("+");
    expect(queryString(query)).not.toContain("%2B");
  });

  it("would send a + as %2B if one ever reached the query", () => {
    expect(queryString({ tz: "Etc/GMT+5", from: "2026-10-01T00:00:00+02:00" })).toBe(
      "?tz=Etc%2FGMT%2B5&from=2026-10-01T00%3A00%3A00%2B02%3A00",
    );
  });

  it("sends the same filters as the list, so the export matches what the user sees", () => {
    const search = parse({ q: "rent", direction: "out", asset: "btc", asset_match: "any", has_reason: "true" });
    expect(queryString(toMovementsQuery(search))).toBe(
      "?q=rent&direction=out&asset=BTC&asset_match=any&has_reason=true",
    );
  });

  it("sends a search text with its spaces as + and an ampersand escaped", () => {
    expect(queryString(toMovementsQuery(parse({ q: "rent & food" })))).toBe("?q=rent+%26+food");
  });

  it("carries the tag filter and tag_match to the list and the export", () => {
    const search = parse({ tag: "trip-2026,shared", tag_match: "all" });
    expect(queryString(toMovementsQuery(search))).toBe("?tag=trip-2026,shared&tag_match=all");
    expect(queryString(toMovementsQuery(parse({ tag: "trip 2026" })))).toBe("?tag=trip+2026");
  });

  it("never carries paging, which the list adds itself", () => {
    expect(queryString(toMovementsQuery(parse({})))).toBe("");
  });
});

describe("date presets", () => {
  const now = new Date(2026, 9, 15, 12, 30);

  it("this month is the calendar month of now", () => {
    expect(presetRange("thisMonth", now)).toEqual(monthRange(now));
  });

  it("last month is the calendar month before now", () => {
    expect(presetRange("lastMonth", now)).toEqual({
      from: apiInstant(new Date(2026, 8, 1)),
      to: apiInstant(new Date(2026, 9, 1)),
    });
  });

  it("the last 90 days include today, and their end is tomorrow", () => {
    expect(presetRange("last90Days", now)).toEqual({
      from: apiInstant(new Date(2026, 6, 18)),
      to: apiInstant(new Date(2026, 9, 16)),
    });
  });

  it("recognises the range of a preset, and no other", () => {
    const search = { ...presetRange("lastMonth", now) };
    expect(activePreset({ from: search.from, to: search.to }, now)).toBe("lastMonth");
    expect(activePreset({ from: search.from, to: "2026-10-02T00:00:00Z" }, now)).toBeUndefined();
    expect(activePreset({}, now)).toBeUndefined();
  });
});

describe("changing the search", () => {
  const search = parse({ kind: "p2p,pay", category_id: "none", direction: "out" });

  it("sets a list, and removes it when no item is left", () => {
    expect(withList(search, "kind", ["pay"])).toEqual({ kind: "pay", category_id: "none", direction: "out" });
    expect(withList(search, "kind", [])).toEqual({ category_id: "none", direction: "out" });
  });

  it("drops asset_match when the last coin goes", () => {
    expect(withList({ asset: "BTC", asset_match: "any", kind: "pay" }, "asset", [])).toEqual({ kind: "pay" });
  });

  it("keeps asset_match while a coin is left", () => {
    expect(withList({ asset: "BTC,ETH", asset_match: "any" }, "asset", ["BTC"])).toEqual({
      asset: "BTC",
      asset_match: "any",
    });
  });

  it("removing the asset filter drops asset_match too", () => {
    expect(withoutKey({ asset: "BTC", asset_match: "any" }, "asset")).toEqual({});
  });

  it("normalises a tag list, and drops tag_match with the last tag", () => {
    expect(withList({}, "tag", ["Trip", "a,b", "SHARED"])).toEqual({ tag: "trip,shared" });
    expect(withList({ tag: "a,b", tag_match: "all" }, "tag", ["a"])).toEqual({
      tag: "a",
      tag_match: "all",
    });
    expect(withList({ tag: "a", tag_match: "all" }, "tag", [])).toEqual({});
  });

  it("removing the tag filter drops tag_match too", () => {
    expect(withoutKey({ tag: "a", tag_match: "all" }, "tag")).toEqual({});
  });

  it("keeps the first 20 tag names after normalising", () => {
    const many = Array.from({ length: 25 }, (_, index) => `Tag-${index + 1}`);
    expect(withList({}, "tag", many).tag?.split(",")).toHaveLength(20);
  });

  it("sets or removes one filter, with no undefined key left behind", () => {
    const cleared = withFilter(search, "direction", undefined);
    expect(cleared).not.toHaveProperty("direction");
    expect(withFilter(search, "has_reason", "true")).toMatchObject({ has_reason: "true" });
  });

  it("removes a date range as a whole", () => {
    const dated = { ...search, from: "2026-10-01T00:00:00Z", to: "2026-11-01T00:00:00Z" };
    expect(withoutKey(dated, "to")).toEqual(search);
  });

  it("sets the search text trimmed, and blank text removes it", () => {
    expect(withText(search, "  food ")).toMatchObject({ q: "food" });
    expect(withText(withText(search, "food"), "   ")).not.toHaveProperty("q");
  });

  it("tells whether a filter is set, and reads empty after the last one is removed", () => {
    expect(hasFilters(search)).toBe(true);
    expect(hasFilters({ tag: "trip-2026" })).toBe(true);
    expect(hasFilters({ tag: "trip-2026", tag_match: "all" })).toBe(true);
    const none = withList(withList(search, "kind", []), "category_id", []);
    expect(hasFilters(withFilter(none, "direction", undefined))).toBe(false);
  });

  it("keeps only symbols, in upper case", () => {
    expect(assetSymbols(["btc", " usdt ", "BT C", "", "1INCH"])).toEqual(["BTC", "USDT", "1INCH"]);
  });

  it("keeps only valid tag names, normalised", () => {
    expect(tagNames(["Trip", "a,b", "", " shared "])).toEqual(["trip", "shared"]);
  });
});

describe("the tag search round trip", () => {
  it("survives stringifySearch and parseSearch", () => {
    const search = { tag: "trip 2026,shared", tag_match: "all" } as const;
    expect(parse(parseSearch(stringifySearch(search)))).toEqual(search);
  });

  it("leaves Needs a label with neither tag nor tag_match", () => {
    expect(NEEDS_LABEL_SEARCH).not.toHaveProperty("tag");
    expect(NEEDS_LABEL_SEARCH).not.toHaveProperty("tag_match");
  });
});

describe("hasFilters with a param that isn't a filter", () => {
  // A stale show_balances param from an old URL (Hide Balances D21) isn't a filter.
  const notAFilter = { show_balances: "true" } as MovementsSearch;

  it("doesn't count a key that isn't a filter", () => {
    expect(hasFilters(notAFilter)).toBe(false);
  });

  it("counts a real filter alongside it", () => {
    expect(hasFilters({ ...notAFilter, q: "rent" })).toBe(true);
  });
});
