import { compare, sumKnown } from "../shared/money";
import type {
  AssetTotalRow,
  Movement,
  MovementKind,
  MovementTotals,
} from "./types";

/**
 * The kinds that can be spending: money that leaves Binance as a withdrawal, a P2P sale, a Pay transfer or a card spend.
 * Copy trading and other transfers move money around without spending it.
 */
export const SPENDING_KINDS: readonly MovementKind[] = [
  "withdrawal",
  "p2p",
  "pay",
  "card_spend",
];

/**
 * The filter that defines spending: completed movements leaving Binance. Convert and deposits aren't spending. A withdrawal
 * to the user's own wallet is, since the backend can't tell it apart. Fees aren't in the totals.
 */
export const SPENDING_FILTER = {
  kind: SPENDING_KINDS.join(","),
  direction: "out",
  status: "completed",
} as const;

type SpendingFields = Pick<
  Movement,
  "kind" | "direction" | "status" | "review_status"
>;

export function isSpending(movement: SpendingFields) {
  return (
    SPENDING_KINDS.includes(movement.kind) &&
    movement.direction === "out" &&
    movement.status === "completed" &&
    movement.review_status !== "dismissed"
  );
}

/**
 * Spending with no category and an uncategorized share. split_rest_usd is null when the parts don't apply (no parts, or
 * an unpriced movement), which leaves the whole movement in its own category, so it still needs a label. A fully split
 * movement has a rest of "0" and never needs one. A reason alone doesn't count as a label.
 */
export function needsLabel(
  movement: SpendingFields &
    Pick<Movement, "category_id" | "split_rest_usd">,
) {
  if (!isSpending(movement) || movement.category_id !== null) {
    return false;
  }
  return (
    movement.split_rest_usd == null ||
    compare(movement.split_rest_usd, "0") > 0
  );
}

export interface CategorySpending {
  /** The category, or null for spending that has none. */
  categoryId: number | null;
  /** The sum of the priced rows, with full precision. It's null when none of the rows is priced. */
  usd: string | null;
  count: number;
  unpricedCount: number;
}

export interface SpendingBreakdown {
  /** Largest first. Spending with no category comes last, and so does a category with no known value. */
  categories: CategorySpending[];
  /** The sum of every priced row. It's incomplete while unpricedCount is above zero. */
  total: string;
  /**
   * Counts across categories. With group_by=category a split movement counts once per category it reaches, so this can
   * be more than the number of movements; it's only used as a "none at all" check.
   */
  count: number;
  unpricedCount: number;
}

function compareCategories(a: CategorySpending, b: CategorySpending) {
  if (a.categoryId === null || b.categoryId === null) {
    return Number(a.categoryId === null) - Number(b.categoryId === null);
  }
  if (a.usd !== null && b.usd !== null) {
    return compare(b.usd, a.usd) || a.categoryId - b.categoryId;
  }
  if (a.usd === null && b.usd === null) {
    return a.categoryId - b.categoryId;
  }
  return a.usd === null ? 1 : -1;
}

/**
 * Sums the spending rows of a totals response per category. An asset row is one coin in one direction, so a category
 * with rows of USDT and BTC gets one value, summed exactly. Unpriced rows add no value, but they're counted, so the
 * caller can say the total isn't complete.
 */
export function spendingBreakdown(
  rows: readonly AssetTotalRow[],
): SpendingBreakdown {
  const groups = new Map<
    number | null,
    { usd: (string | null)[]; count: number; unpricedCount: number }
  >();
  for (const row of rows) {
    const categoryId = row.category_id ?? null;
    const group = groups.get(categoryId) ?? {
      usd: [],
      count: 0,
      unpricedCount: 0,
    };
    group.usd.push(row.usd_value);
    group.count += row.count;
    group.unpricedCount += row.unpriced_count;
    groups.set(categoryId, group);
  }

  const categories = [...groups].map(([categoryId, group]) => ({
    categoryId,
    usd: sumKnown(group.usd),
    count: group.count,
    unpricedCount: group.unpricedCount,
  }));
  categories.sort(compareCategories);

  // Counts are whole numbers, not money, so they add as numbers.
  return {
    categories,
    total: sumKnown(rows.map((row) => row.usd_value)) ?? "0",
    count: rows.reduce((total, row) => total + row.count, 0),
    unpricedCount: rows.reduce((total, row) => total + row.unpriced_count, 0),
  };
}

/**
 * The number of movements in a totals response, counted from its asset rows. Each movement is in one asset row, while a
 * movement can be in a fee row and a counter row too, so those aren't added. It's correct on a query without
 * group_by=category: there the portions of a split movement fall into one asset row and count once.
 */
export function movementCount(totals: Pick<MovementTotals, "assets">) {
  return totals.assets.reduce((count, row) => count + row.count, 0);
}
