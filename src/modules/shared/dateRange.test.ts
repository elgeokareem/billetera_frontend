import { describe, expect, it } from "vitest";
import { apiInstant, daysBefore, hoursBefore, monthRange } from "./dateRange";

// The expected values are built with local Date constructors, so these checks hold in any time zone.
describe("apiInstant", () => {
  it("writes UTC with Z and without milliseconds", () => {
    expect(apiInstant(new Date("2026-10-30T12:00:00.123Z"))).toBe("2026-10-30T12:00:00Z");
  });

  it("never writes a plus sign, which the API would read as a space", () => {
    expect(apiInstant(new Date(2026, 9, 1))).not.toContain("+");
  });
});

describe("monthRange", () => {
  it("covers the calendar month of now, in local time", () => {
    expect(monthRange(new Date(2026, 9, 15, 9, 30))).toEqual({
      from: apiInstant(new Date(2026, 9, 1)),
      to: apiInstant(new Date(2026, 10, 1)),
    });
  });

  it("includes the first moment of the month", () => {
    const { from } = monthRange(new Date(2026, 9, 20));
    expect(new Date(from).getTime()).toBe(new Date(2026, 9, 1, 0, 0, 0).getTime());
  });

  it("ends where the next month starts, so the whole last day is inside", () => {
    const { to } = monthRange(new Date(2026, 9, 31, 23, 59));
    expect(new Date(to).getTime()).toBe(new Date(2026, 10, 1).getTime());
  });

  it("rolls over the year from December", () => {
    expect(monthRange(new Date(2026, 11, 31, 23, 0))).toEqual({
      from: apiInstant(new Date(2026, 11, 1)),
      to: apiInstant(new Date(2027, 0, 1)),
    });
  });

  it("uses Z times, so the query needs no escaping", () => {
    const { from, to } = monthRange(new Date(2026, 1, 10));
    expect(from.endsWith("Z")).toBe(true);
    expect(to.endsWith("Z")).toBe(true);
  });
});

describe("hoursBefore and daysBefore", () => {
  const now = new Date("2026-10-30T12:00:00Z");

  it("subtracts exact hours", () => {
    expect(hoursBefore(now, 48)).toBe("2026-10-28T12:00:00Z");
    expect(hoursBefore(now, 24)).toBe("2026-10-29T12:00:00Z");
  });

  it("subtracts days", () => {
    expect(daysBefore(now, 30)).toBe("2026-09-30T12:00:00Z");
  });
});
