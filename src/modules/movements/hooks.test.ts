import { describe, expect, it } from "vitest";
import { feedRows } from "./hooks";
import type { Movement, MovementsPage } from "./types";

function movement(id: number): Movement {
  return {
    id,
    source: "binance",
    kind: "withdrawal",
    external_id: `w-${id}`,
    direction: "out",
    status: "completed",
    source_status: null,
    asset: "USDT",
    amount: "10",
    fee_asset: null,
    fee_amount: null,
    counter_asset: null,
    counter_amount: null,
    unit_price: null,
    counterparty: null,
    occurred_at: "2026-10-01T00:00:00Z",
    reason: null,
    reason_updated_at: null,
    category_id: null,
    usd_price: null,
    usd_price_source: null,
    usd_price_status: "pending",
    usd_value: null,
    fee_usd_value: null,
  };
}

const page = (ids: number[], next: string | null): MovementsPage => ({
  movements: ids.map(movement),
  next_cursor: next,
});

describe("feedRows", () => {
  it("joins the pages in the order they were loaded", () => {
    const rows = feedRows([page([5, 4], "c1"), page([3, 2], null)]);
    expect(rows.map((row) => row.id)).toEqual([5, 4, 3, 2]);
  });

  it("shows a movement once, even when two pages hold it", () => {
    const rows = feedRows([page([5, 4], "c1"), page([4, 3], null)]);
    expect(rows.map((row) => row.id)).toEqual([5, 4, 3]);
  });

  it("is empty before any page has loaded", () => {
    expect(feedRows([])).toEqual([]);
  });
});
