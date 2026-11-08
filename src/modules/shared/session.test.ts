import { QueryClient } from "@tanstack/react-query";
import { isRedirect } from "@tanstack/react-router";
import axios, { AxiosError, AxiosHeaders } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type BinanceCredentials,
  redirectIfLoggedIn,
  sessionQuery,
} from "./session";

const withKey: BinanceCredentials = {
  configured: true,
  api_key_masked: "AbCd…WxYz",
  state: "active",
  read_only: true,
  ip_restricted: false,
  validated_at: "2026-11-07T10:00:00Z",
  rejected_at: null,
  updated_at: "2026-11-07T10:00:00Z",
};

const withoutKey: BinanceCredentials = { configured: false };

// The error axios raises for a response with this status, as api-errors.test.ts builds it.
function responseError(status: number) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("failed", "ERR", config, null, {
    status,
    statusText: "",
    headers: {},
    config,
    data: {},
  });
}

// A request that never got an answer.
const networkError = () => new AxiosError("Network Error", "ERR_NETWORK");

// The check must not run when the session is already cached, so a call to it fails the test.
function noRequests() {
  return vi
    .spyOn(axios, "get")
    .mockRejectedValue(new Error("unexpected request"));
}

// The value a promise rejects with. Fails the test when it resolves.
async function thrownBy(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the promise to reject");
}

async function expectRedirectTo(promise: Promise<unknown>, to: string) {
  const thrown = await thrownBy(promise);
  if (!isRedirect(thrown)) {
    throw new Error(`expected a redirect, got ${String(thrown)}`);
  }
  expect(thrown.options.to).toBe(to);
}

let queryClient: QueryClient;

beforeEach(() => {
  // A fresh cache per test, so a session seeded in one test can't reach the next.
  queryClient = new QueryClient();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("redirectIfLoggedIn", () => {
  it("sends a logged-in user with a key to the dashboard", async () => {
    const get = noRequests();
    queryClient.setQueryData(sessionQuery.queryKey, withKey);

    await expectRedirectTo(redirectIfLoggedIn(queryClient), "/dashboard");
    expect(get).not.toHaveBeenCalled();
  });

  it("sends a logged-in user without a key to the dashboard too, where the app guard takes them on to Connect", async () => {
    const get = noRequests();
    queryClient.setQueryData(sessionQuery.queryKey, withoutKey);

    await expectRedirectTo(redirectIfLoggedIn(queryClient), "/dashboard");
    expect(get).not.toHaveBeenCalled();
  });

  it("lets a logged-out visitor through when the session is cached as null", async () => {
    const get = noRequests();
    queryClient.setQueryData(sessionQuery.queryKey, null);

    await expect(redirectIfLoggedIn(queryClient)).resolves.toBeUndefined();
    expect(get).not.toHaveBeenCalled();
  });

  it("lets a logged-out visitor through when the check answers 401", async () => {
    const get = vi.spyOn(axios, "get").mockRejectedValue(responseError(401));

    await expect(redirectIfLoggedIn(queryClient)).resolves.toBeUndefined();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("lets the visitor through when the check hits a network error", async () => {
    const get = vi.spyOn(axios, "get").mockRejectedValue(networkError());

    await expect(redirectIfLoggedIn(queryClient)).resolves.toBeUndefined();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("lets the visitor through when the check answers 503", async () => {
    const get = vi.spyOn(axios, "get").mockRejectedValue(responseError(503));

    await expect(redirectIfLoggedIn(queryClient)).resolves.toBeUndefined();
    expect(get).toHaveBeenCalledTimes(1);
  });
});
