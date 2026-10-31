import Big from "big.js";

/** Adds decimal strings without losing precision. A null value counts as zero. */
export function sum(values: readonly (string | null | undefined)[]) {
  return values
    .reduce((total, value) => total.plus(value ?? 0), new Big(0))
    .toFixed();
}

/**
 * Like sum, but null when none of the values is known. A group of unpriced rows then isn't shown as a zero total,
 * which would look complete.
 */
export function sumKnown(values: readonly (string | null | undefined)[]) {
  const known = values.filter((value): value is string => value != null);
  return known.length > 0 ? sum(known) : null;
}

export function diff(a: string, b: string) {
  return new Big(a).minus(b).toFixed();
}

/** Returns part as a percentage of total, or null when total is zero. */
export function percentOf(part: string, total: string) {
  const whole = new Big(total);
  if (whole.eq(0)) {
    return null;
  }
  return new Big(part).times(100).div(whole).toFixed();
}

/** Negative when a is below b, zero when they're equal, positive when a is above b. */
export function compare(a: string, b: string) {
  return new Big(a).cmp(b);
}

export function isNegative(value: string) {
  return new Big(value).lt(0);
}

export function abs(value: string) {
  return new Big(value).abs().toFixed();
}
