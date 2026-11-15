import axios, { AxiosHeaders } from "axios";
import type { Schemas } from "../shared/api-types";
import { getApiErrorKey } from "../shared/api-errors";

/**
 * The cooldown the manual sync routes apply after a run. A success doesn't say how long it is, so this default is assumed
 * until a 429 gives the server's own answer.
 */
export const DEFAULT_SYNC_COOLDOWN_SECONDS = 60;

/** A whole number of seconds from the response body, or undefined when it isn't one. */
function bodySeconds(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 1
    ? value
    : undefined;
}

/** A whole number of seconds from the Retry-After header, or undefined when it isn't one. */
function headerSeconds(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }
  const seconds = Number(value);
  return Number.isInteger(seconds) && seconds >= 1 ? seconds : undefined;
}

/** The Retry-After header's value, from an AxiosHeaders or a plain headers object. */
function retryAfterHeader(headers: unknown): unknown {
  if (headers instanceof AxiosHeaders) {
    return headers.get("retry-after");
  }
  if (!headers || typeof headers !== "object") {
    return undefined;
  }
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === "retry-after") {
      return value;
    }
  }
  return undefined;
}

/**
 * The wait a failed sync asks for: the body's `retry_after` when it's an integer of at least 1, else the `Retry-After`
 * header when it parses as one, else undefined. Only a 429 asks for a wait.
 */
export function retryAfterSeconds(error: unknown): number | undefined {
  if (!axios.isAxiosError(error) || error.response?.status !== 429) {
    return undefined;
  }
  const body = error.response.data as
    | Partial<Schemas["binance.CooldownErrorResponse"]>
    | undefined;
  const fromBody = bodySeconds(body?.retry_after);
  if (fromBody !== undefined) {
    return fromBody;
  }
  return headerSeconds(retryAfterHeader(error.response.headers));
}

function hasStatus(error: unknown, status: number): boolean {
  return axios.isAxiosError(error) && error.response?.status === status;
}

/** A 429 that the server words as a sync cooldown, the only case where it asks the client to wait. */
function isSyncCooldown(error: unknown): boolean {
  return (
    hasStatus(error, 429) &&
    getApiErrorKey(error) === "errors.syncCooldown"
  );
}

/**
 * How long the button's cooldown should run after a pair of syncs settles, or undefined when the server can't have kept
 * one. A success or a 502 keeps the cooldown, and both routes firing together means the other route's fresh cooldown is
 * the one that matters, so the default wins over a shorter `retry_after`. A 429's own wait is used otherwise. A 409,
 * another 4xx, a network error or a 500 gives the cooldown back, so only a 429's wait remains.
 */
export function syncCooldownSeconds(
  results: readonly PromiseSettledResult<unknown>[],
): number | undefined {
  let seconds: number | undefined;
  const keep = (value: number) => {
    seconds = Math.max(seconds ?? 0, value);
  };

  for (const result of results) {
    if (result.status === "fulfilled" || hasStatus(result.reason, 502)) {
      keep(DEFAULT_SYNC_COOLDOWN_SECONDS);
    } else if (isSyncCooldown(result.reason)) {
      keep(retryAfterSeconds(result.reason) ?? DEFAULT_SYNC_COOLDOWN_SECONDS);
    }
  }

  return seconds;
}

/**
 * The error a pair of syncs reports: a real failure first, then a sync cooldown, then a sync that's already running.
 * A cooldown is news the countdown covers, so a real failure outranks it. The promises don't reject with undefined in
 * practice (axios rejects with an error object).
 */
export function syncFailure(
  results: readonly PromiseSettledResult<unknown>[],
): unknown {
  let realFailure: PromiseRejectedResult | undefined;
  let cooldown: PromiseRejectedResult | undefined;
  let inProgress: PromiseRejectedResult | undefined;

  for (const result of results) {
    if (result.status !== "rejected") {
      continue;
    }
    const errorKey = getApiErrorKey(result.reason);
    if (errorKey === "errors.syncCooldown") {
      cooldown ??= result;
    } else if (errorKey === "errors.syncInProgress") {
      inProgress ??= result;
    } else {
      realFailure ??= result;
    }
  }

  return (realFailure ?? cooldown ?? inProgress)?.reason;
}
