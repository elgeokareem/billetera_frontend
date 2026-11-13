import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it } from "vitest";
import { getApiErrorKey } from "./api-errors";
import { formatDayTick, formatHourTick, formatMonthTick, timeTickFormatter } from "./chartFormat";
import {
  formatAmount,
  formatDate,
  formatPercent,
  formatShortDate,
  formatUsd,
} from "./format";
import i18n from "./i18n";
import { abs, compare, diff, isNegative, percentOf, sum, sumKnown } from "./money";

// Intl separates a currency or percent sign with a non-breaking space.
const plain = (text: string) => text.replace(/\u00a0/g, " ");

// Newer ICU versions put a narrow no-break space before AM and PM, which the text comparison reads as a space.
const spaced = (text: string) => text.replace(/[\u00a0\u202f]/g, " ");

function apiError(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("failed", "ERR", config, null, {
    status,
    statusText: "",
    headers: {},
    config,
    data,
  });
}

describe("money", () => {
  it("adds without floating point errors", () => {
    expect(sum(["0.1", "0.2"])).toBe("0.3");
  });

  it("keeps precision a number would lose", () => {
    expect(sum(["9007199254740993.00000001", "1"])).toBe(
      "9007199254740994.00000001",
    );
  });

  it("counts null as zero", () => {
    expect(sum(["1.5", null, undefined])).toBe("1.5");
    expect(sum([])).toBe("0");
  });

  it("subtracts", () => {
    expect(diff("12546.78", "12240.86")).toBe("305.92");
  });

  it("returns a percentage, or null for a zero total", () => {
    expect(percentOf("25", "200")).toBe("12.5");
    expect(percentOf("25", "0")).toBeNull();
  });

  it("sums known values, and is null when none is known", () => {
    expect(sumKnown([null, undefined])).toBeNull();
    expect(sumKnown([])).toBeNull();
    expect(sumKnown(["1.5", null])).toBe("1.5");
    expect(sumKnown(["0.1", "0.2"])).toBe("0.3");
  });

  it("compares exactly, where a number would round", () => {
    expect(compare("0.1", "0.10000000000000001")).toBe(-1);
    expect(compare("305.92", "305.92000")).toBe(0);
    expect(compare("12546.78", "12240.86")).toBe(1);
  });

  it("reads the sign and the absolute value of a decimal string", () => {
    expect(isNegative("-0.00000001")).toBe(true);
    expect(isNegative("0")).toBe(false);
    expect(abs("-2.5")).toBe("2.5");
    expect(abs("2.50")).toBe("2.5");
  });
});

describe("format", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("formats USD in English", () => {
    expect(formatUsd("1233.9")).toBe("$1,233.90");
  });

  it("formats USD in Spanish", async () => {
    await i18n.changeLanguage("es");
    expect(plain(formatUsd("1233.9"))).toBe("1.233,90 US$");
  });

  it("trims trailing zeros from amounts", () => {
    expect(formatAmount("0.05000000", "ETH")).toBe("0.05 ETH");
    expect(formatAmount("1800.00000000", "USDT")).toBe("1,800 USDT");
  });

  it("keeps an amount's full precision", () => {
    expect(formatAmount("12345678901234.12345678", "BTC")).toBe(
      "12,345,678,901,234.12345678 BTC",
    );
  });

  it("formats percentages", async () => {
    expect(formatPercent("2.54")).toBe("2.5%");
    await i18n.changeLanguage("es");
    expect(plain(formatPercent("2.54"))).toBe("2,5 %");
  });

  it("shows a dash for missing values", () => {
    expect(formatUsd(null)).toBe("—");
    expect(formatAmount(undefined, "BTC")).toBe("—");
    expect(formatPercent(null)).toBe("—");
    expect(formatDate(null)).toBe("—");
  });

  it("formats dates in the active language", async () => {
    const date = "2026-10-15T12:00:00Z";
    expect(formatDate(date)).toContain("Oct");
    await i18n.changeLanguage("es");
    expect(formatDate(date)).toContain("oct");
  });

  it("formats short dates, with no year, in the active language", async () => {
    const date = "2026-10-15T12:00:00Z";
    expect(formatShortDate(date)).toBe("Oct 15");
    expect(formatShortDate(null)).toBe("—");
    await i18n.changeLanguage("es");
    expect(formatShortDate(date)).toBe("15 oct");
  });
});

describe("formatHourTick", () => {
  // A local time, so the test reads the same in any zone.
  const at = new Date(2026, 9, 30, 14, 5).getTime();

  it("writes the time of day in English", async () => {
    await i18n.changeLanguage("en");
    expect(spaced(formatHourTick(at))).toBe("02:05 PM");
  });

  it("writes the time of day in Spanish, on the 24-hour clock", async () => {
    await i18n.changeLanguage("es");
    expect(spaced(formatHourTick(at))).toBe("14:05");
    await i18n.changeLanguage("en");
  });
});

describe("chart time-axis format", () => {
  const november = new Date(2026, 10, 1, 12).getTime();

  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("writes a month in English", () => {
    expect(formatMonthTick(november)).toBe("Nov");
  });

  it("writes a month in Spanish, with or without the ICU's trailing dot", async () => {
    await i18n.changeLanguage("es");
    expect(formatMonthTick(november)).toMatch(/^nov\.?$/);
    await i18n.changeLanguage("en");
  });

  it("picks the formatter from the range", () => {
    expect(timeTickFormatter("24h")).toBe(formatHourTick);
    expect(timeTickFormatter("7d")).toBe(formatDayTick);
    expect(timeTickFormatter("30d")).toBe(formatDayTick);
    expect(timeTickFormatter("90d")).toBe(formatDayTick);
    expect(timeTickFormatter("1y")).toBe(formatMonthTick);
  });
});

describe("getApiErrorKey", () => {
  it("reads the error shape", () => {
    expect(
      getApiErrorKey(apiError(422, { error: "key is not read-only" })),
    ).toBe("errors.keyNotReadOnly");
  });

  it("reads the message shape", () => {
    expect(
      getApiErrorKey(apiError(409, { message: "client already registered" })),
    ).toBe("errors.alreadyRegistered");
  });

  it("doesn't confuse login errors with key errors", () => {
    expect(
      getApiErrorKey(apiError(401, { message: "Invalid credentials" })),
    ).toBe("errors.invalidLogin");
    expect(
      getApiErrorKey(apiError(400, { error: "invalid credentials" })),
    ).toBe("errors.invalidKey");
  });

  it("reads the tag errors", () => {
    expect(getApiErrorKey(apiError(400, { error: "invalid tag" }))).toBe(
      "errors.invalidTag",
    );
    expect(getApiErrorKey(apiError(400, { error: "too many tags" }))).toBe(
      "errors.tooManyTags",
    );
  });

  it("falls back for unknown text", () => {
    expect(getApiErrorKey(apiError(500, { error: "boom" }))).toBe(
      "errors.generic",
    );
    expect(getApiErrorKey(apiError(500, undefined))).toBe("errors.generic");
    expect(getApiErrorKey(new Error("boom"))).toBe("errors.generic");
  });

  it("detects a network failure", () => {
    expect(getApiErrorKey(new AxiosError("Network Error"))).toBe(
      "errors.network",
    );
  });
});
