import Big from "big.js";
import { compare } from "../shared/money";
import type { Movement, Split, SplitRequest } from "./types";

/** The most parts one movement has, the same as the API's. */
export const MAX_SPLITS = 20;

/**
 * The bar's colors, one per part in position order and cycling. The rest of the movement is always the dim tone.
 */
export const SPLIT_COLORS = [
  "blue",
  "teal",
  "grape",
  "orange",
  "cyan",
  "pink",
  "lime",
  "indigo",
  "yellow",
  "red",
] as const;

/** One part while the drawer edits it. */
export interface SplitDraft {
  /** Identity in the form, so a row keeps its inputs when another is removed. */
  key: number;
  /** The part's category as the select holds it, "" when none. */
  category: string;
  /** The amount as typed, before normalising. */
  amount: string;
  tags: string[];
  /** The tag typed in this part's input and not yet added. */
  tagText: string;
  /** A saved part whose category was deleted, so the select starts empty and asks for one. */
  missingCategory?: true;
}

/** A part's field errors, under the fields that have one. */
export interface SplitRowErrors {
  category?: string;
  amount?: string;
}

/** What the drawer shows after a save attempt: each row's errors, and the over-the-limit error. */
export interface SplitDraftErrors {
  rows: SplitRowErrors[];
  total?: string;
}

/** One shown segment of a split movement, before formatting. */
export interface SplitSegment {
  name: string;
  usd: string;
}

export interface SplitSegmentsResult {
  segments: SplitSegment[];
  more: number;
}

// A part's amount: 1 to 13 digits, an optional point and 1 or 2 decimals, once spaces are gone and commas are points.
const SPLIT_AMOUNT_PATTERN = /^\d{1,13}(\.\d{1,2})?$/;

/**
 * A part's amount as the API wants it: spaces dropped, a comma read as the decimal point, 1 to 13 digits with at most
 * 2 decimals, above zero. Undefined when it breaks a rule. The result is the shortest form of the same decimal, so "20.00"
 * is "20" and "12,5" is "12.5".
 */
export function normaliseSplitAmount(text: string) {
  const normalised = text.replace(/\s+/g, "").replace(/,/g, ".");
  if (!SPLIT_AMOUNT_PATTERN.test(normalised)) {
    return undefined;
  }
  const amount = new Big(normalised);
  return amount.gt(0) ? amount.toFixed() : undefined;
}

/** The most a movement's parts may add up to: its value rounded half away from zero to cents, as the API does. */
export function splitLimit(usdValue: string) {
  return new Big(usdValue).round(2, Big.roundHalfUp).toFixed();
}

/** The sum of the parts with a valid amount. Invalid rows add nothing, as they can't be saved. */
export function splitSum(parts: readonly SplitDraft[]) {
  return parts
    .reduce((total, part) => {
      const amount = normaliseSplitAmount(part.amount);
      return amount === undefined ? total : total.plus(amount);
    }, new Big(0))
    .toFixed();
}

/**
 * The value left in the movement's own category, computed from the draft for display only: the value minus the valid
 * amounts. A rest below half a cent is zero, as the API's sub-cent rule, and it's never below zero. Null has no rest.
 */
export function draftRest(usdValue: string | null, parts: readonly SplitDraft[]) {
  if (usdValue == null) {
    return "0";
  }
  const rest = new Big(usdValue).minus(splitSum(parts));
  if (rest.lte(0)) {
    return "0";
  }
  return rest.lt("0.005") ? "0" : rest.toFixed();
}

/** A row with no category, no amount and no tags is ignored by the save, so it's not an error either. */
export function isSplitDraftEmpty(part: SplitDraft) {
  return (
    part.category === "" &&
    part.amount.trim() === "" &&
    part.tags.length === 0 &&
    part.tagText.trim() === ""
  );
}

/**
 * What blocks a save: each remaining row needs a category and a valid amount, and their sum may not pass the limit. The
 * over-the-limit key is returned even when a row has its own error, since both are shown. Empty rows are ignored.
 */
export function splitDraftErrors(
  parts: readonly SplitDraft[],
  limit: string,
): SplitDraftErrors {
  const rows = parts.map((part) => {
    if (isSplitDraftEmpty(part)) {
      return {};
    }
    const errors: SplitRowErrors = {};
    if (part.category === "") {
      errors.category = "movements.split.pickCategory";
    }
    if (normaliseSplitAmount(part.amount) === undefined) {
      errors.amount = "movements.split.badAmount";
    }
    return errors;
  });
  const total =
    compare(splitSum(parts), limit) > 0 ? "movements.split.over" : undefined;
  return { rows, total };
}

/**
 * The PATCH body's parts: the whole list, empty rows dropped, in position order. Each row needs a category and a valid
 * amount to be sent; the drawer's save blocks before this can hide an incomplete row.
 */
export function normalisedSplits(parts: readonly SplitDraft[]): SplitRequest[] {
  const splits: SplitRequest[] = [];
  for (const part of parts) {
    if (isSplitDraftEmpty(part)) {
      continue;
    }
    const amount = normaliseSplitAmount(part.amount);
    if (part.category === "" || amount === undefined) {
      continue;
    }
    splits.push({
      category_id: Number(part.category),
      usd_amount: amount,
      tags: [...part.tags],
    });
  }
  return splits;
}

/** True when the saved parts and the draft's parts are the same set, amount and tags, in the same order. */
export function sameSplits(
  saved: readonly Split[],
  normalised: readonly SplitRequest[],
) {
  if (saved.length !== normalised.length) {
    return false;
  }
  return saved.every((part, index) => {
    const next = normalised[index];
    if (part.category_id !== next.category_id) {
      return false;
    }
    if (compare(part.usd_amount, next.usd_amount) !== 0) {
      return false;
    }
    const tags = next.tags ?? [];
    return (
      part.tags.length === tags.length &&
      part.tags.every((tag) => tags.includes(tag))
    );
  });
}

/** The drawer's rows for the parts the API returned. A deleted category leaves its row asking for one. */
export function splitDraftsOf(movement: Pick<Movement, "splits">): SplitDraft[] {
  return movement.splits.map((part, index) => ({
    key: index,
    category: part.category_id === null ? "" : String(part.category_id),
    amount: part.usd_amount,
    tags: [...part.tags],
    tagText: "",
    ...(part.category_id === null ? { missingCategory: true as const } : {}),
  }));
}

/** The key for a new row: above every row in the form, so removing and adding doesn't reuse a live one. */
export function nextSplitKey(parts: readonly SplitDraft[]) {
  return parts.reduce((highest, part) => Math.max(highest, part.key), -1) + 1;
}

/** A movement can be split when it has a USD value above zero. */
export function canSplit(movement: Pick<Movement, "usd_value">) {
  return movement.usd_value != null && compare(movement.usd_value, "0") > 0;
}

/**
 * The parts of a split movement in the list, in order, then the rest when it's above zero. At most two are returned; the
 * caller shows "+n" for the others. A movement whose parts don't apply has no segments.
 */
export function splitSegments(
  movement: Pick<
    Movement,
    "split_status" | "split_rest_usd" | "splits" | "category_id"
  >,
  nameOf: (categoryId: number | null) => string,
): SplitSegmentsResult {
  if (
    movement.split_status !== "applied" &&
    movement.split_status !== "exceeds"
  ) {
    return { segments: [], more: 0 };
  }
  const all: SplitSegment[] = movement.splits.map((part) => ({
    name: nameOf(part.category_id),
    usd: part.usd_amount,
  }));
  if (
    movement.split_rest_usd != null &&
    compare(movement.split_rest_usd, "0") > 0
  ) {
    all.push({ name: nameOf(movement.category_id), usd: movement.split_rest_usd });
  }
  const segments = all.slice(0, 2);
  return { segments, more: all.length - segments.length };
}
