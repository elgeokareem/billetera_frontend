import i18n from "./i18n";
import { abs, isNegative } from "./money";

const EMPTY = "—";

type Value = string | null | undefined;

// Intl keeps a decimal string's full precision, which a number wouldn't. TypeScript's types only allow numbers here.
function formatDecimal(value: string, options: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(i18n.language, {
    useGrouping: "always",
    ...options,
  } as Intl.NumberFormatOptions).format(value as unknown as number);
}

export function formatUsd(value: Value) {
  if (value == null) {
    return EMPTY;
  }
  return formatDecimal(value, { style: "currency", currency: "USD" });
}

/** A coin amount without its code, with every digit it has and no trailing zeros. */
export function formatQuantity(value: Value) {
  if (value == null) {
    return EMPTY;
  }
  return formatDecimal(value, { maximumFractionDigits: 20 });
}

export function formatAmount(value: Value, asset: string) {
  if (value == null) {
    return EMPTY;
  }
  return `${formatQuantity(value)} ${asset}`;
}

/** A change in USD, with its sign: "+$305.92" or "-$12.00". Takes a decimal string. */
export function formatChangeUsd(value: string) {
  return `${isNegative(value) ? "-" : "+"}${formatUsd(abs(value))}`;
}

/** A change in percent, with its sign: "+2.5%" or "-0.4%". Takes a decimal string. */
export function formatChangePercent(value: string) {
  return `${isNegative(value) ? "-" : "+"}${formatPercent(abs(value))}`;
}

/** Takes a percentage, so "2.5" is 2.5%. */
export function formatPercent(value: Value) {
  if (value == null) {
    return EMPTY;
  }
  const percent = formatDecimal(value, { maximumFractionDigits: 1 });
  return i18n.language === "es" ? `${percent} %` : `${percent}%`;
}

export function formatDate(value: Value) {
  if (value == null) {
    return EMPTY;
  }
  return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function formatDateTime(value: Value) {
  if (value == null) {
    return EMPTY;
  }
  return new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/** A day and month with no year, such as Oct 15 or 15 oct. It's short enough for three labels on a 375px card. */
export function formatShortDate(value: Value) {
  if (value == null) {
    return EMPTY;
  }
  return new Intl.DateTimeFormat(i18n.language, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

/** The name of a month in the active language, such as October or octubre. */
export function formatMonth(value: Date) {
  return new Intl.DateTimeFormat(i18n.language, { month: "long" }).format(value);
}
