import i18n from "./i18n";
import { formatDateTime } from "./format";
import type { RangeKey } from "./chartRange";

/** A day on the time axis, such as Oct 24. The tooltip shows the full time of a point. */
export function formatDayTick(time: number) {
  return new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric" }).format(new Date(time));
}

/** A time of day on the time axis, such as 14:00 or 02:00 PM. The 24-hour range labels its axis with these. */
export function formatHourTick(time: number) {
  return new Intl.DateTimeFormat(i18n.language, { hour: "2-digit", minute: "2-digit" }).format(new Date(time));
}

/** A month on the time axis, such as Nov. The year range labels its axis with these; the tooltip has the full date. */
export function formatMonthTick(time: number) {
  return new Intl.DateTimeFormat(i18n.language, { month: "short" }).format(new Date(time));
}

/** The time-axis formatter a range uses: hours of the day for 24h, the month for a year, the day otherwise. */
export function timeTickFormatter(range: RangeKey) {
  if (range === "24h") {
    return formatHourTick;
  }
  if (range === "1y") {
    return formatMonthTick;
  }
  return formatDayTick;
}

/** The full date and time of a point, for the tooltip. */
export function formatMoment(time: number) {
  return formatDateTime(new Date(time).toISOString());
}

/**
 * A USD tick on the value axis. The axis is a drawing scale, so its labels are rounded and show cents only when they have them;
 * the tooltip shows the exact value.
 */
export function formatUsdTick(value: number) {
  return new Intl.NumberFormat(i18n.language, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/** A coin amount tick on the axis. Like the USD ticks, it's rounded for the axis alone. */
export function formatAmountTick(value: number) {
  return new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 6 }).format(value);
}
