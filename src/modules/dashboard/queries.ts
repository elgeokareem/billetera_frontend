import type { MovementsQuery, TotalsQuery } from "../movements/api";
import { SPENDING_FILTER } from "../movements/spending";
import { hoursBefore, monthRange } from "../shared/dateRange";
import type { SnapshotHistoryQuery } from "../snapshots/api";

/** The label queue shows this many cards. */
export const LABEL_CARDS = 3;
/** Recent movements shows this many rows. */
export const RECENT_ROWS = 5;

/**
 * The dashboard's queries, dated from `now`. The page takes `now` once, so the query keys stay the same while it's open.
 * The label queue and its count cover the current calendar month only, so a new user isn't met with older decisions.
 */
export function dashboardQueries(now: Date, timeZone: string) {
  const month = monthRange(now);
  return {
    month,
    labelCards: {
      ...SPENDING_FILTER,
      category_id: "none",
      ...month,
      limit: LABEL_CARDS,
    } satisfies MovementsQuery,
    labelCount: {
      ...SPENDING_FILTER,
      category_id: "none",
      ...month,
    } satisfies TotalsQuery,
    spending: {
      ...SPENDING_FILTER,
      group_by: "category",
      ...month,
      tz: timeZone,
    } satisfies TotalsQuery,
    recent: { limit: RECENT_ROWS } satisfies MovementsQuery,
    /** Every detected movement still to review, all time. */
    reviewCount: { review: "suspected" } satisfies TotalsQuery,
    /** This month's suspected card spends, which the spending total includes but the user hasn't confirmed. */
    unconfirmedSpending: {
      ...SPENDING_FILTER,
      kind: "card_spend",
      review: "suspected",
      ...month,
    } satisfies TotalsQuery,
    change: {
      from: hoursBefore(now, 48),
      to: hoursBefore(now, 24),
      bucket: "hour",
    } satisfies SnapshotHistoryQuery,
  };
}
