import { describe, expect, it } from "vitest";
import { filterChips } from "./chips";
import { parseMovementsSearch, presetRange } from "./search";

// Returns the key with its options, so a test can read what each label names.
const t = (key: string, options?: Record<string, string>) =>
  options ? `${key} ${JSON.stringify(options)}` : key;

const now = new Date(2026, 9, 15, 12, 30);
const categoryName = (id: string) => ({ "3": "Food", "7": "Rent" })[id];

function chipsOf(raw: Record<string, unknown>) {
  return filterChips(parseMovementsSearch(raw), { now, t, categoryName });
}

describe("filterChips", () => {
  it("shows no chip when no filter is set", () => {
    expect(chipsOf({})).toEqual([]);
  });

  it("gives each value of a list its own chip", () => {
    const labels = chipsOf({ kind: "p2p,pay" }).map((chip) => chip.label);
    expect(labels).toEqual([
      'movements.chips.labelled {"label":"movements.filters.kind","value":"movements.kinds.p2p"}',
      'movements.chips.labelled {"label":"movements.filters.kind","value":"movements.kinds.pay"}',
    ]);
  });

  it("removing one value of a list keeps the others", () => {
    const search = parseMovementsSearch({ kind: "p2p,pay" });
    const [first] = filterChips(search, { now, t, categoryName });
    expect(first.without).toEqual({ kind: "pay" });
  });

  it("removing the last value of a list removes the filter", () => {
    const search = parseMovementsSearch({ category_id: "3" });
    const [only] = filterChips(search, { now, t, categoryName });
    expect(only.without).toEqual({});
  });

  it("removing the only coin chip drops asset_match too", () => {
    const search = parseMovementsSearch({ asset: "BTC", asset_match: "any" });
    const only = filterChips(search, { now, t, categoryName }).find((chip) => chip.key === "asset:BTC");
    expect(only?.without).toEqual({});
  });

  it("names a category by its name, and no category as such", () => {
    const labels = chipsOf({ category_id: "3,none,99" }).map((chip) => chip.label);
    expect(labels).toEqual([
      'movements.chips.labelled {"label":"movements.filters.category","value":"Food"}',
      'movements.chips.labelled {"label":"movements.filters.category","value":"movements.noCategory"}',
      'movements.chips.labelled {"label":"movements.filters.category","value":"…"}',
    ]);
  });

  it("shows a date preset by its name, and a range that isn't one by its dates", () => {
    const { from, to } = presetRange("lastMonth", now);
    const [preset] = chipsOf({ from, to });
    expect(preset.label).toContain("movements.dates.lastMonth");
    const [custom] = chipsOf({ from: "2026-10-01T00:00:00Z", to: "2026-10-08T00:00:00Z" });
    expect(custom.label).toContain("movements.filters.dates");
    expect(custom.label).not.toContain("movements.dates.");
    expect(custom.without).toEqual({});
  });

  it("gives every kind of filter a chip, and removing each leaves the rest", () => {
    const raw = {
      q: "rent",
      kind: "p2p",
      direction: "out",
      status: "pending",
      asset: "BTC",
      asset_match: "any",
      category_id: "7",
      has_reason: "true",
    };
    const chips = chipsOf(raw);
    expect(chips.map((chip) => chip.key)).toEqual([
      "q",
      "kind:p2p",
      "direction",
      "status:pending",
      "asset:BTC",
      "asset_match",
      "category:7",
      "has_reason",
    ]);
    const full = parseMovementsSearch(raw);
    for (const chip of chips) {
      expect(chip.without).not.toEqual(full);
      expect(Object.keys(chip.without).length).toBeLessThan(Object.keys(full).length);
    }
    const reason = chips.find((chip) => chip.key === "has_reason");
    expect(reason?.label).toBe("movements.chips.withReason");
  });
});
