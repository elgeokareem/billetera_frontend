import i18n from "../shared/i18n";
import { formatDateTime } from "../shared/format";

/** A day on the time axis, such as Oct 24. The tooltip shows the full time of a point. */
export function formatDayTick(time: number) {
  return new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric" }).format(new Date(time));
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
