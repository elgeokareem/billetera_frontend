import type { MovementsSearch } from "../movements/search";

/**
 * The Movements filter of a coin: the movements it's in, and the Converts into it, as asset_match=any means. The search is
 * what Movements reads from the URL, so the link carries exactly the filter the page shows.
 */
export function coinMovementsSearch(asset: string): MovementsSearch {
  return { asset, asset_match: "any" };
}
