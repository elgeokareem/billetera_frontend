import { describe, expect, it } from "vitest";
import { assetCode } from "./codes";

describe("assetCode", () => {
  it("reads a symbol and upper-cases it, as the API does", () => {
    expect(assetCode("btc")).toBe("BTC");
    expect(assetCode("BTC")).toBe("BTC");
    expect(assetCode("1inch")).toBe("1INCH");
  });

  it("accepts 1 and 32 characters, and refuses 33", () => {
    expect(assetCode("A")).toBe("A");
    expect(assetCode("a".repeat(32))).toBe("A".repeat(32));
    expect(assetCode("a".repeat(33))).toBeUndefined();
  });

  it("refuses anything that isn't a plain letter or digit", () => {
    for (const raw of ["", "BT C", "BT-C", "BTC\n", " BTC", "A/B", "A..B", "BTCé", "A%2FB"]) {
      expect(assetCode(raw), raw).toBeUndefined();
    }
  });
});
