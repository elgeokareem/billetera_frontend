import { describe, expect, it } from "vitest";
import { parseMovementsSearch } from "../movements/search";
import { parseSearch, stringifySearch } from "../shared/search-params";
import { coinMovementsSearch } from "./links";

// The search helpers take a plain record, as the router hands them, so the typed search is spread into one.
describe("coinMovementsSearch", () => {
  it("writes the coin with asset_match=any, so the list includes the Converts into it", () => {
    expect(stringifySearch({ ...coinMovementsSearch("BTC") })).toBe("?asset=BTC&asset_match=any");
  });

  it("reads back to the same filter in Movements", () => {
    const link = stringifySearch({ ...coinMovementsSearch("BTC") });
    expect(parseMovementsSearch(parseSearch(link))).toEqual({ asset: "BTC", asset_match: "any" });
  });
});
