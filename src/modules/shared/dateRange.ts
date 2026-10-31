const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * A UTC instant as the API reads it: RFC 3339 with Z and no milliseconds. It never has a "+", which the API would read
 * as a space, so the value needs no escaping.
 */
export function apiInstant(date: Date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** The calendar month that holds now, in the browser's time zone. `from` is included and `to` is excluded. */
export function monthRange(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { from: apiInstant(start), to: apiInstant(end) };
}

/** The instant the given number of hours before now, as an API instant. */
export function hoursBefore(now: Date, hours: number) {
  return apiInstant(new Date(now.getTime() - hours * HOUR_MS));
}

/** The instant the given number of days before now, as an API instant. */
export function daysBefore(now: Date, days: number) {
  return apiInstant(new Date(now.getTime() - days * DAY_MS));
}

/** The browser's time zone, as an IANA name. UTC when the browser doesn't give one. */
export function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
