import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { syncFailure } from "./sync";

// The error axios raises for a response, as session.test.ts builds it.
function responseError(status: number, error: string) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("failed", "ERR", config, null, {
    status,
    statusText: "",
    headers: {},
    config,
    data: { error },
  });
}

// A request that never got an answer.
const networkError = () => new AxiosError("Network Error", "ERR_NETWORK");

const inProgress = () => responseError(409, "sync already in progress");
const realFailure = () => responseError(502, "binance request failed");

const fulfilled = { status: "fulfilled", value: undefined } as const;
const rejected = (reason: unknown) =>
  ({ status: "rejected", reason }) as const;

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
});
