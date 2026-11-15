import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_SYNC_COOLDOWN_SECONDS,
  retryAfterSeconds,
  syncCooldownSeconds,
  syncFailure,
} from "./sync";

interface ErrorOptions {
  /** The body's retry_after. When absent, the body has no such field. */
  retryAfter?: unknown;
  /** The response's Retry-After header. */
  header?: string;
}

// The error axios raises for a response, as session.test.ts builds it.
function responseError(
  status: number,
  error: string,
  options: ErrorOptions = {},
) {
  const config = { headers: new AxiosHeaders() };
  const data: { error: string; retry_after?: unknown } = { error };
  if ("retryAfter" in options) {
    data.retry_after = options.retryAfter;
  }
  return new AxiosError("failed", "ERR", config, null, {
    status,
    statusText: "",
    headers:
      options.header === undefined ? {} : { "Retry-After": options.header },
    config,
    data,
  });
}

// A request that never got an answer.
const networkError = () => new AxiosError("Network Error", "ERR_NETWORK");

const cooldown = (retryAfter?: number, header?: string) =>
  responseError(429, "sync cooldown", { retryAfter, header });
const inProgress = () => responseError(409, "sync already in progress");
const realFailure = () => responseError(502, "binance request failed");
const credentialsMissing = () =>
  responseError(409, "binance credentials not set");

const fulfilled = { status: "fulfilled", value: undefined } as const;
const rejected = (reason: unknown) =>
  ({ status: "rejected", reason }) as const;

describe("retryAfterSeconds", () => {
  it("reads the body's retry_after", () => {
    expect(retryAfterSeconds(cooldown(42))).toBe(42);
  });

  it("prefers the body's retry_after over the header", () => {
    expect(retryAfterSeconds(cooldown(42, "5"))).toBe(42);
  });

  it("falls back to the Retry-After header", () => {
    expect(retryAfterSeconds(cooldown(undefined, "37"))).toBe(37);
  });

  it("falls back to the header when the body's value isn't a whole number of seconds", () => {
    for (const retryAfter of [0, -5, 4.5, "42"]) {
      expect(
        retryAfterSeconds(responseError(429, "sync cooldown", { retryAfter, header: "37" })),
        JSON.stringify(retryAfter),
      ).toBe(37);
    }
  });

  it("is undefined when neither the body nor the header has a value", () => {
    expect(retryAfterSeconds(cooldown())).toBeUndefined();
  });

  it("is undefined when the header isn't a whole number of seconds either", () => {
    for (const header of ["0", "-5", "4.5", "soon", ""]) {
      expect(
        retryAfterSeconds(responseError(429, "sync cooldown", { header })),
        JSON.stringify(header),
      ).toBeUndefined();
    }
  });

  it("is undefined when the response isn't a 429", () => {
    expect(retryAfterSeconds(inProgress())).toBeUndefined();
    expect(
      retryAfterSeconds(responseError(502, "binance request failed")),
    ).toBeUndefined();
  });

  it("is undefined for a network error", () => {
    expect(retryAfterSeconds(networkError())).toBeUndefined();
  });

  it("is undefined for anything that isn't an axios error", () => {
    expect(retryAfterSeconds(new Error("failed"))).toBeUndefined();
    expect(retryAfterSeconds(undefined)).toBeUndefined();
  });
});

describe("syncCooldownSeconds", () => {
  it(`assumes ${DEFAULT_SYNC_COOLDOWN_SECONDS} seconds when both syncs succeed`, () => {
    expect(syncCooldownSeconds([fulfilled, fulfilled])).toBe(60);
  });

  it("takes the larger wait when both syncs hit the cooldown", () => {
    expect(syncCooldownSeconds([rejected(cooldown(42)), rejected(cooldown(50))])).toBe(50);
    expect(syncCooldownSeconds([rejected(cooldown(50)), rejected(cooldown(42))])).toBe(50);
  });

  it("assumes 60 seconds when one sync succeeds and the other's wait is shorter", () => {
    // The successful route started its own cooldown, which the button can't see in its answer.
    expect(syncCooldownSeconds([fulfilled, rejected(cooldown(1))])).toBe(60);
  });

  it("keeps a wait longer than the default when one sync succeeds", () => {
    expect(syncCooldownSeconds([fulfilled, rejected(cooldown(90))])).toBe(90);
  });

  it("assumes 60 seconds when a sync fails with 502 and the other with a 409", () => {
    expect(
      syncCooldownSeconds([rejected(realFailure()), rejected(credentialsMissing())]),
    ).toBe(60);
  });

  it("starts no cooldown when both syncs are refused before reaching Binance", () => {
    expect(
      syncCooldownSeconds([
        rejected(credentialsMissing()),
        rejected(credentialsMissing()),
      ]),
    ).toBeUndefined();
    expect(
      syncCooldownSeconds([rejected(inProgress()), rejected(inProgress())]),
    ).toBeUndefined();
  });

  it("starts no cooldown for network errors, which may never have reached the server", () => {
    expect(
      syncCooldownSeconds([rejected(networkError()), rejected(networkError())]),
    ).toBeUndefined();
  });

  it("keeps a 429's wait next to a 409", () => {
    expect(
      syncCooldownSeconds([rejected(cooldown(42)), rejected(credentialsMissing())]),
    ).toBe(42);
  });

  it(`assumes ${DEFAULT_SYNC_COOLDOWN_SECONDS} seconds when a 429 carries no wait`, () => {
    expect(syncCooldownSeconds([rejected(cooldown()), fulfilled])).toBe(60);
    expect(
      syncCooldownSeconds([rejected(cooldown()), rejected(credentialsMissing())]),
    ).toBe(60);
  });
});

describe("syncFailure", () => {
  it("reports nothing when both syncs succeed", () => {
    expect(syncFailure([fulfilled, fulfilled])).toBeUndefined();
  });

  it("reports the real failure when the other sync is already running", () => {
    const failure = realFailure();
    expect(syncFailure([rejected(inProgress()), rejected(failure)])).toBe(
      failure,
    );
  });

  it("reports the real failure when it comes first", () => {
    const failure = realFailure();
    expect(syncFailure([rejected(failure), rejected(inProgress())])).toBe(
      failure,
    );
  });

  it("reports the first already-running sync when neither is a real failure", () => {
    const first = inProgress();
    expect(syncFailure([rejected(first), rejected(inProgress())])).toBe(first);
  });

  it("treats a 409 that isn't 'already in progress' as a real failure", () => {
    const failure = responseError(409, "binance credentials not set");
    expect(syncFailure([rejected(failure), fulfilled])).toBe(failure);
  });

  it("reports a network error even when the other sync is already running", () => {
    const failure = networkError();
    expect(syncFailure([rejected(failure), rejected(inProgress())])).toBe(
      failure,
    );
  });

  it("reports a real failure ahead of a cooldown", () => {
    const failure = realFailure();
    expect(syncFailure([rejected(cooldown(42)), rejected(failure)])).toBe(
      failure,
    );
    expect(syncFailure([rejected(failure), rejected(cooldown(42))])).toBe(
      failure,
    );
  });

  it("reports the cooldown ahead of an already-running sync", () => {
    const failure = cooldown(42);
    expect(syncFailure([rejected(failure), rejected(inProgress())])).toBe(
      failure,
    );
    expect(syncFailure([rejected(inProgress()), rejected(failure)])).toBe(
      failure,
    );
  });

  it("reports the cooldown when the other sync succeeds", () => {
    const failure = cooldown(42);
    expect(syncFailure([rejected(failure), fulfilled])).toBe(failure);
  });

  it("reports the first cooldown when both hit it", () => {
    const first = cooldown(42);
    expect(syncFailure([rejected(first), rejected(cooldown(50))])).toBe(first);
  });
});
