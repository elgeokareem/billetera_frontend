import { describe, expect, it } from "vitest";
import type { SnapshotAsset } from "./types";
import { coinHoldings, mergeHoldings } from "./holdings";

function asset(overrides: Partial<SnapshotAsset>): SnapshotAsset {
  return {
    wallet_type: "spot",
    asset: "BTC",
    free: "0",
    locked: "0",
    freeze: "0",
    btc_valuation: "0",
    usd_value: "0",
    priced: true,
    ...overrides,
  };
}

describe("mergeHoldings", () => {
  it("merges one coin across spot and funding, with exact sums", () => {
    const holdings = mergeHoldings([
      asset({ wallet_type: "spot", asset: "BTC", free: "0.04812834", locked: "0.00100000", usd_value: "4500.01" }),
      asset({ wallet_type: "funding", asset: "BTC", free: "0.02045240", freeze: "0.00000001", usd_value: "1912.29" }),
    ]);
    expect(holdings).toEqual([
      { asset: "BTC", amount: "0.06958075", usd: "6412.3", priced: true },
    ]);
  });

  it("sorts by USD value, largest first, with unpriced coins last", () => {
    const holdings = mergeHoldings([
      asset({ asset: "DOGE", usd_value: null, priced: false, free: "1500" }),
      asset({ asset: "USDT", usd_value: "1204.18" }),
      asset({ asset: "BTC", usd_value: "6412.30" }),
      asset({ asset: "ETH", usd_value: "1688.90" }),
    ]);
    expect(holdings.map((holding) => holding.asset)).toEqual(["BTC", "ETH", "USDT", "DOGE"]);
    expect(holdings[holdings.length - 1]).toEqual({ asset: "DOGE", amount: "1500", usd: null, priced: false });
  });

  it("is not priced when only some of a coin's rows are", () => {
    const [holding] = mergeHoldings([
      asset({ asset: "SOL", wallet_type: "spot", usd_value: "40" }),
      asset({ asset: "SOL", wallet_type: "funding", usd_value: null, priced: false }),
    ]);
    expect(holding).toEqual({ asset: "SOL", amount: "0", usd: "40", priced: false });
  });

  it("is empty for a snapshot with no assets", () => {
    expect(mergeHoldings([])).toEqual([]);
  });
});

describe("coinHoldings", () => {
  it("splits one coin into its wallets, with the free, locked and frozen parts summed exactly", () => {
    const holdings = coinHoldings(
      [
        asset({ wallet_type: "spot", asset: "BTC", free: "0.04812834", locked: "0.00100000", usd_value: "4500.01" }),
        asset({ wallet_type: "funding", asset: "BTC", free: "0.02045240", freeze: "0.00000001", usd_value: "1912.29" }),
        asset({ asset: "ETH", usd_value: "1688.90" }),
      ],
      "BTC",
    );
    expect(holdings.held).toBe(true);
    // Sums drop trailing zeros, so 0.00100000 reads back as 0.001, with every digit kept.
    expect(holdings.spot).toEqual({
      amount: "0.04912834",
      free: "0.04812834",
      locked: "0.001",
      frozen: "0",
      usd: "4500.01",
      priced: true,
    });
    expect(holdings.funding).toEqual({
      amount: "0.02045241",
      free: "0.0204524",
      locked: "0",
      frozen: "0.00000001",
      usd: "1912.29",
      priced: true,
    });
    expect(holdings.total).toEqual({
      amount: "0.06958075",
      free: "0.06858074",
      locked: "0.001",
      frozen: "0.00000001",
      usd: "6412.3",
      priced: true,
    });
  });

  it("keeps the amounts of a coin that is held in one wallet only, and gives the other wallet zero", () => {
    const holdings = coinHoldings([asset({ wallet_type: "spot", asset: "BNB", free: "2.5", usd_value: "1550" })], "BNB");
    expect(holdings.funding).toEqual({ amount: "0", free: "0", locked: "0", frozen: "0", usd: "0", priced: true });
    expect(holdings.total).toMatchObject({ amount: "2.5", usd: "1550" });
  });

  it("is not priced when some rows are, and only the priced part is in the value", () => {
    const holdings = coinHoldings(
      [
        asset({ wallet_type: "spot", asset: "SOL", free: "3", usd_value: "450" }),
        asset({ wallet_type: "funding", asset: "SOL", free: "1", usd_value: null, priced: false }),
      ],
      "SOL",
    );
    expect(holdings.total).toEqual({ amount: "4", free: "4", locked: "0", frozen: "0", usd: "450", priced: false });
    expect(holdings.funding).toEqual({ amount: "1", free: "1", locked: "0", frozen: "0", usd: null, priced: false });
  });

  it("reads a coin that no snapshot holds as zero, priced, and not held", () => {
    const holdings = coinHoldings([asset({ asset: "ETH", usd_value: "1688.90" })], "ADA");
    expect(holdings.held).toBe(false);
    expect(holdings.total).toEqual({ amount: "0", free: "0", locked: "0", frozen: "0", usd: "0", priced: true });
    expect(holdings.spot.amount).toBe("0");
    expect(holdings.funding.usd).toBe("0");
  });

  it("adds tiny amounts without floating point errors", () => {
    const holdings = coinHoldings(
      [
        asset({ wallet_type: "spot", asset: "BTC", free: "0.00000001" }),
        asset({ wallet_type: "funding", asset: "BTC", free: "0.00000002", locked: "0.00000001" }),
      ],
      "BTC",
    );
    expect(holdings.total.amount).toBe("0.00000004");
  });
});
