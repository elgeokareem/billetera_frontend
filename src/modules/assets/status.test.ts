import { describe, expect, it } from "vitest";
import type { AssetHistoryPoint } from "../snapshots/types";
import { absentCoinStatus, everHeldIn } from "./status";

function point(amount: string): AssetHistoryPoint {
  return {
    bucket_start: "2026-10-01T00:00:00Z",
    snapshot_id: 1,
    captured_at: "2026-10-01T00:00:00Z",
    amount,
    spot_amount: amount,
    funding_amount: "0",
    usd_value: "0",
    priced: true,
  };
}

describe("absentCoinStatus", () => {
  it("is formerly held as soon as one check finds the coin, even before the others have run", () => {
    expect(absentCoinStatus(true, false)).toBe("formerly");
    expect(absentCoinStatus(true, true)).toBe("formerly");
  });

  it("is unknown only once every check has run and none found the coin", () => {
    expect(absentCoinStatus(false, true)).toBe("unknown");
  });

  it("is not known while a check is still running, so Not found is never shown early", () => {
    expect(absentCoinStatus(false, false)).toBeUndefined();
  });
});

describe("everHeldIn", () => {
  it("is false when every amount is zero, so the history shows no holding", () => {
    expect(everHeldIn([point("0"), point("0.00000000")])).toBe(false);
    expect(everHeldIn([])).toBe(false);
  });

  it("is true when any amount is above zero, even a tiny one", () => {
    expect(everHeldIn([point("0"), point("0.00000001")])).toBe(true);
  });
});
