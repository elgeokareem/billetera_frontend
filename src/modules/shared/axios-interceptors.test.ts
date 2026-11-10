import { QueryClient } from "@tanstack/react-query";
import type { AnyRouter } from "@tanstack/react-router";
import { AxiosError, AxiosHeaders } from "axios";
import { toast } from "react-toastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { onResponseError } from "./axios-interceptors";
import { SESSION_PATH, sessionQuery } from "./session";

vi.mock("react-toastify", () => ({ toast: { info: vi.fn() } }));

const session = { configured: false as const };
const movements = [{ id: 1 }];

// The error axios raises for a response, with the request it answers, as session.test.ts builds it.
function responseError(status: number, url: string, method = "get") {
  const config = { url, method, headers: new AxiosHeaders() };
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

function fakeRouter(pathname: string) {
  const navigate = vi.fn();
  const router = {
    state: { location: { pathname, href: pathname } },
    navigate,
  } as unknown as AnyRouter;
  return { router, navigate };
}

// A cache with data from a session, and a finished mutation, so each test sees what a 401 must clear.
function seededClient() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(sessionQuery.queryKey, session);
  queryClient.setQueryData(["movements", "list"], movements);
  queryClient
    .getMutationCache()
    .build(queryClient, { mutationFn: async () => undefined });
  return queryClient;
}

let queryClient: QueryClient;

beforeEach(() => {
  queryClient = seededClient();
  vi.clearAllMocks();
});

function expectCacheCleared() {
  expect(queryClient.getQueryData(sessionQuery.queryKey)).toBeUndefined();
  expect(queryClient.getQueryData(["movements", "list"])).toBeUndefined();
  expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
}

function expectCacheKept() {
  expect(queryClient.getQueryData(sessionQuery.queryKey)).toEqual(session);
  expect(queryClient.getQueryData(["movements", "list"])).toEqual(movements);
  expect(queryClient.getMutationCache().getAll()).toHaveLength(1);
}

describe("onResponseError", () => {
  it("clears the cache, toasts and redirects for a 401 away from the public pages", async () => {
    const { router, navigate } = fakeRouter("/dashboard");
    const error = responseError(401, "/movements");

    await expect(onResponseError(router, queryClient)(error)).rejects.toBe(
      error,
    );

    expectCacheCleared();
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith({
      to: "/login",
      search: { redirect: "/dashboard" },
    });
  });

  it("clears the cache without a toast or navigation for a 401 on a public page", async () => {
    const { router, navigate } = fakeRouter("/login");
    const error = responseError(401, "/movements");

    await expect(onResponseError(router, queryClient)(error)).rejects.toBe(
      error,
    );

    expectCacheCleared();
    expect(toast.info).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("keeps the session check's cached null and clears the rest, without a toast or navigation", async () => {
    const { router, navigate } = fakeRouter("/dashboard");
    const error = responseError(401, SESSION_PATH);

    await expect(onResponseError(router, queryClient)(error)).rejects.toBe(
      error,
    );

    expect(queryClient.getQueryData(sessionQuery.queryKey)).toEqual(session);
    expect(queryClient.getQueryData(["movements", "list"])).toBeUndefined();
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
    expect(toast.info).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("leaves a wrong password's 401 on POST /auth/login alone", async () => {
    const { router, navigate } = fakeRouter("/login");
    const error = responseError(401, "/auth/login", "post");

    await expect(onResponseError(router, queryClient)(error)).rejects.toBe(
      error,
    );

    expectCacheKept();
    expect(toast.info).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("clears and redirects for a 401 on another auth call, such as logout", async () => {
    const { router, navigate } = fakeRouter("/settings");
    const error = responseError(401, "/auth/logout", "post");

    await expect(onResponseError(router, queryClient)(error)).rejects.toBe(
      error,
    );

    expectCacheCleared();
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith({
      to: "/login",
      search: { redirect: "/settings" },
    });
  });

  it("leaves the cache alone for a 500", async () => {
    const { router, navigate } = fakeRouter("/dashboard");
    const error = responseError(500, "/movements");

    await expect(onResponseError(router, queryClient)(error)).rejects.toBe(
      error,
    );

    expectCacheKept();
    expect(toast.info).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("leaves the cache alone for a network error with no response", async () => {
    const { router, navigate } = fakeRouter("/dashboard");
    const error = networkError();

    await expect(onResponseError(router, queryClient)(error)).rejects.toBe(
      error,
    );

    expectCacheKept();
    expect(toast.info).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("leaves the cache alone for a non-axios error", async () => {
    const { router, navigate } = fakeRouter("/dashboard");
    const error = new Error("boom");

    await expect(onResponseError(router, queryClient)(error)).rejects.toBe(
      error,
    );

    expectCacheKept();
    expect(toast.info).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
