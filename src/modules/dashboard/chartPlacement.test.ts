import { describe, expect, it } from "vitest";
import { chartPlacement, type LabelCountState } from "./chartPlacement";

// The placement only reads the status and the asset rows' counts, so one row is enough.
function countState(status: LabelCountState["status"], movements?: number): LabelCountState {
  return {
    status,
    data:
      movements === undefined
        ? undefined
        : {
            assets: [
              {
                amount: String(movements),
                asset: "USDT",
                count: movements,
                direction: "out",
                unpriced_count: 0,
                usd_value: null,
              },
            ],
          },
  };
}

describe("chartPlacement", () => {
  it("moves the chart to the left column when the count has loaded and says zero", () => {
    expect(chartPlacement(countState("success", 0))).toBe("main");
  });

  it("keeps the chart in the right column while movements are still to label", () => {
    expect(chartPlacement(countState("success", 2))).toBe("side");
  });

  it("keeps the chart in the right column while the count is loading", () => {
    expect(chartPlacement(countState("pending"))).toBe("side");
  });

  it("keeps the chart in the right column when the count has failed", () => {
    expect(chartPlacement(countState("error"))).toBe("side");
  });

  it("keeps the last loaded count when a refetch fails", () => {
    expect(chartPlacement(countState("error", 0))).toBe("main");
  });
});
