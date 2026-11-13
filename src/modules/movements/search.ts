import { apiInstant, monthRange } from "../shared/dateRange";
import { normaliseTagName } from "../tags/names";
import type { MovementsQuery } from "./api";
import { SPENDING_FILTER } from "./spending";
import type { MovementKind, MovementStatus } from "./types";

/**
 * The filters of /movements, in the URL. The names are the API's own, so a link carries a filter exactly as the API takes
 * it. A list is comma-separated text, such as kind=p2p,pay, which is what the API reads. Only the search params that
 * parseMovementsSearch lets through are kept, so the state is always a query the API accepts.
 */
export interface MovementsSearch {
  q?: string;
  kind?: string;
  direction?: "in" | "out";
  status?: string;
  asset?: string;
  asset_match?: "any";
  category_id?: string;
  tag?: string;
  tag_match?: "all";
  review?: string;
  from?: string;
  to?: string;
  has_reason?: "true" | "false";
}

export type MovementsSearchKey = keyof MovementsSearch;

export const MOVEMENT_KINDS: readonly MovementKind[] = [
  "deposit",
  "withdrawal",
  "pay",
  "p2p",
  "convert",
  "card_spend",
  "copy_trading",
  "transfer",
];
export const MOVEMENT_STATUSES: readonly MovementStatus[] = ["pending", "completed", "failed"];
/** The values of the review filter, as the API names them. "none" is a movement from Binance. */
export const REVIEW_ITEMS = ["suspected", "confirmed", "dismissed", "none"] as const;
export type ReviewItem = (typeof REVIEW_ITEMS)[number];
export const DATE_PRESETS = ["thisMonth", "lastMonth", "last90Days"] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

/** The most items one list filter names, the same as the API. */
const MAX_LIST_ITEMS = 20;
/** The longest search text, in characters after trimming. */
const MAX_SEARCH_LENGTH = 100;
const ASSET_SYMBOL = /^[A-Za-z0-9]{1,32}$/;
const CATEGORY_ID = /^[1-9]\d{0,18}$/;
const MAX_BIGINT = 9223372036854775807n;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/** The "Needs a label" preset: spending with no category, and no date filter. */
export const NEEDS_LABEL_SEARCH = {
  ...SPENDING_FILTER,
  category_id: "none",
} satisfies MovementsSearch;

/** The link to every detected movement still to review: suspected rows, all time. */
export const REVIEW_SEARCH = {
  review: "suspected",
} satisfies MovementsSearch;

function unique(items: string[]) {
  return [...new Set(items)].slice(0, MAX_LIST_ITEMS);
}

/** Reads a comma list: each item is normalised and kept only when keep allows it. Nothing left means no filter. */
function readList(value: unknown, keep: (item: string) => boolean, normalise: (item: string) => string = (item) => item) {
  if (typeof value !== "string") {
    return undefined;
  }
  const items = unique(value.split(",").map(normalise).filter(keep));
  return items.length > 0 ? items.join(",") : undefined;
}

function readText(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }
  const text = [...value.trim()].slice(0, MAX_SEARCH_LENGTH).join("").trim();
  return text === "" ? undefined : text;
}

function readInstant(value: unknown) {
  return typeof value === "string" && INSTANT.test(value) && !Number.isNaN(Date.parse(value)) ? value : undefined;
}

function readCategory(item: string) {
  return item === "none" || (CATEGORY_ID.test(item) && BigInt(item) <= MAX_BIGINT);
}

/**
 * Reads the search params of /movements, as the router hands them over. Anything the API would refuse is dropped, so a
 * hand-typed URL shows the filters it can apply, and a range that ends before it starts is dropped as a whole.
 */
export function parseMovementsSearch(raw: Record<string, unknown>): MovementsSearch {
  const search: MovementsSearch = {};
  const put = <K extends MovementsSearchKey>(key: K, value: MovementsSearch[K] | undefined) => {
    if (value !== undefined) {
      search[key] = value;
    }
  };

  put("q", readText(raw.q));
  put("kind", readList(raw.kind, (item) => MOVEMENT_KINDS.includes(item as MovementKind)));
  put("direction", raw.direction === "in" || raw.direction === "out" ? raw.direction : undefined);
  put("status", readList(raw.status, (item) => MOVEMENT_STATUSES.includes(item as MovementStatus)));
  put("review", readList(raw.review, (item) => REVIEW_ITEMS.includes(item as ReviewItem)));
  put("asset", readList(raw.asset, (item) => ASSET_SYMBOL.test(item), (item) => item.toUpperCase()));
  put("asset_match", search.asset !== undefined && raw.asset_match === "any" ? "any" : undefined);
  put("category_id", readList(raw.category_id, readCategory));
  put(
    "tag",
    readList(raw.tag, (item) => item !== "", (item) => normaliseTagName(item) ?? ""),
  );
  put("tag_match", search.tag !== undefined && raw.tag_match === "all" ? "all" : undefined);
  put("has_reason", raw.has_reason === "true" || raw.has_reason === "false" ? raw.has_reason : undefined);

  const from = readInstant(raw.from);
  const to = readInstant(raw.to);
  if (from && to && Date.parse(from) >= Date.parse(to)) {
    return search;
  }
  put("from", from);
  put("to", to);
  return search;
}

/**
 * The query of GET /movements and of the export, from the search. Times are sent in Z, so a + never reaches the URL,
 * whatever offset the URL had. Paging (limit and cursor) is added by the caller.
 */
export function toMovementsQuery(search: MovementsSearch): Omit<MovementsQuery, "limit" | "cursor"> {
  return {
    q: search.q,
    kind: search.kind,
    direction: search.direction,
    status: search.status,
    asset: search.asset,
    asset_match: search.asset_match,
    category_id: search.category_id,
    tag: search.tag,
    tag_match: search.tag_match,
    review: search.review,
    from: search.from ? apiInstant(new Date(search.from)) : undefined,
    to: search.to ? apiInstant(new Date(search.to)) : undefined,
    has_reason: search.has_reason,
  };
}

/** The range a date preset means, as API instants. `to` is exclusive, and the local calendar decides the days. */
export function presetRange(preset: DatePreset, now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  switch (preset) {
    case "thisMonth":
      return monthRange(now);
    case "lastMonth":
      return {
        from: apiInstant(new Date(year, month - 1, 1)),
        to: apiInstant(new Date(year, month, 1)),
      };
    case "last90Days":
      // The last 90 calendar days, today included: from the start of the day 89 days back, to the start of tomorrow.
      return {
        from: apiInstant(new Date(year, month, day - 89)),
        to: apiInstant(new Date(year, month, day + 1)),
      };
  }
}

/** The preset whose range the search has, or undefined when the dates are something else, or there are none. */
export function activePreset(search: Pick<MovementsSearch, "from" | "to">, now: Date): DatePreset | undefined {
  if (!search.from || !search.to) {
    return undefined;
  }
  const from = apiInstant(new Date(search.from));
  const to = apiInstant(new Date(search.to));
  return DATE_PRESETS.find((preset) => {
    const range = presetRange(preset, now);
    return range.from === from && range.to === to;
  });
}

/** The items of a list filter, as an array. A missing filter is empty. */
export function listItems(value: string | undefined) {
  return value ? value.split(",") : [];
}

/** Coin symbols as the API takes them: upper case, and only the ones that are symbols. */
export function assetSymbols(items: readonly string[]) {
  return items.map((item) => item.trim().toUpperCase()).filter((item) => ASSET_SYMBOL.test(item));
}

/** Tag names as the API takes them: normalised, with the invalid ones dropped. */
export function tagNames(items: readonly string[]) {
  return items.map(normaliseTagName).filter((item): item is string => item !== undefined);
}

/**
 * Sets a list filter to these items, or removes it when there are none. A coin filter with no coins also drops
 * asset_match, and a tag filter with no tags drops tag_match.
 */
export function withList(
  search: MovementsSearch,
  key: "kind" | "status" | "asset" | "category_id" | "tag" | "review",
  items: string[],
) {
  const value = unique(key === "tag" ? tagNames(items) : items).join(",") || undefined;
  const next = withFilter(search, key, value);
  if (key === "asset" && value === undefined) {
    delete next.asset_match;
  }
  if (key === "tag" && value === undefined) {
    delete next.tag_match;
  }
  return next;
}

/** Sets one filter, or removes it when the value is undefined. A removed key leaves no trace, so "any filter set" stays true. */
export function withFilter<K extends MovementsSearchKey>(
  search: MovementsSearch,
  key: K,
  value: MovementsSearch[K] | undefined,
): MovementsSearch {
  const next = { ...search };
  if (value === undefined) {
    delete next[key];
  } else {
    next[key] = value;
  }
  return next;
}

/**
 * Removes one key of the search. A date range goes as a whole, since its two ends belong together, and a coin goes with
 * asset_match, as a tag goes with tag_match.
 */
export function withoutKey(search: MovementsSearch, key: MovementsSearchKey): MovementsSearch {
  const next = { ...search };
  delete next[key];
  if (key === "from" || key === "to") {
    delete next.from;
    delete next.to;
  }
  if (key === "asset") {
    delete next.asset_match;
  }
  if (key === "tag") {
    delete next.tag_match;
  }
  return next;
}

/** The keys of the Movements filters. The search can also hold params that aren't filters. */
const FILTER_KEYS = [
  "q",
  "kind",
  "direction",
  "status",
  "asset",
  "asset_match",
  "category_id",
  "tag",
  "tag_match",
  "review",
  "from",
  "to",
  "has_reason",
] as const satisfies readonly MovementsSearchKey[];

/** Whether any filter is set. A param that isn't a filter doesn't count. */
export function hasFilters(search: MovementsSearch) {
  return FILTER_KEYS.some((key) => search[key] !== undefined);
}

/** Sets the search text as the API takes it: trimmed, and at most 100 characters. Blank text removes it. */
export function withText(search: MovementsSearch, text: string): MovementsSearch {
  const next = { ...search };
  const q = readText(text);
  if (q === undefined) {
    delete next.q;
  } else {
    next.q = q;
  }
  return next;
}
