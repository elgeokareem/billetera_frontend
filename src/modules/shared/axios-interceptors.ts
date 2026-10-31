import type { QueryClient } from "@tanstack/react-query";
import type { AnyRouter } from "@tanstack/react-router";
import axios from "axios";
import { toast } from "react-toastify";
import i18n from "./i18n";
import { SESSION_PATH } from "./session";

const PUBLIC_PATHS = ["/login", "/register"];
const SESSION_EXPIRED_TOAST = "session-expired";

export function axiosInterceptorsAndConfig(
  router: AnyRouter,
  queryClient: QueryClient,
) {
  axios.defaults.baseURL = import.meta.env.VITE_BACKEND_ENDPOINT;
  axios.defaults.withCredentials = true;

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const { url, method } = error.config ?? {};
      const isSessionCheck = method === "get" && url === SESSION_PATH;
      const isAuthCall = url?.startsWith("/auth/");

      if (error.response?.status === 401 && !isSessionCheck && !isAuthCall) {
        queryClient.clear();
        const { pathname, href } = router.state.location;
        if (!PUBLIC_PATHS.includes(pathname)) {
          toast.info(i18n.t("auth.sessionExpired"), {
            toastId: SESSION_EXPIRED_TOAST,
          });
          router.navigate({ to: "/login", search: { redirect: href } });
        }
      }

      return Promise.reject(error);
    },
  );
}
