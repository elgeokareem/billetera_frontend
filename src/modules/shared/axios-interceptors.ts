import type { QueryClient } from "@tanstack/react-query";
import type { AnyRouter } from "@tanstack/react-router";
import axios from "axios";
import { toast } from "react-toastify";
import i18n from "./i18n";
import { SESSION_PATH, sessionQuery } from "./session";

const PUBLIC_PATHS = ["/login", "/register"];
const SESSION_EXPIRED_TOAST = "session-expired";

/**
 * The response error handler for every axios call.
 *
 * A 401 means the session ended, except on `POST /auth/login`, where it means a wrong password. Any ended session
 * drops the cached data so the next user can't see it. The session check (`GET /binance/credentials`) is special:
 * it keeps its own cached `null` (so `/login`'s check doesn't send a second request) and doesn't navigate, because
 * the route guards already redirect when the check returns null.
 */
export function onResponseError(
  router: AnyRouter,
  queryClient: QueryClient,
): (error: unknown) => Promise<never> {
  return (error) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const { url, method } = error.config ?? {};

    // A wrong password, not an ended session.
    if (method === "post" && url === "/auth/login") {
      return Promise.reject(error);
    }

    if (method === "get" && url === SESSION_PATH) {
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== sessionQuery.queryKey[0],
      });
      queryClient.getMutationCache().clear();
      return Promise.reject(error);
    }

    queryClient.clear();
    const { pathname, href } = router.state.location;
    if (!PUBLIC_PATHS.includes(pathname)) {
      toast.info(i18n.t("auth.sessionExpired"), {
        toastId: SESSION_EXPIRED_TOAST,
      });
      router.navigate({ to: "/login", search: { redirect: href } });
    }

    return Promise.reject(error);
  };
}

export function axiosInterceptorsAndConfig(
  router: AnyRouter,
  queryClient: QueryClient,
) {
  axios.defaults.baseURL = import.meta.env.VITE_BACKEND_ENDPOINT;
  axios.defaults.withCredentials = true;

  axios.interceptors.response.use(
    (response) => response,
    onResponseError(router, queryClient),
  );
}
