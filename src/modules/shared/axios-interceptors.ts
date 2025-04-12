import axios from "axios";
import { getCookie } from "./utils";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import { routeTree } from "../../routeTree.gen";
import { createRouter } from "@tanstack/react-router";

export function axiosInterceptorsAndConfig() {
  const router = createRouter({ routeTree });
  const nonAuthPaths = [
    router.routesByPath["/"].path,
    router.routesByPath["/login"].path,
    router.routesByPath["/register"].path
  ];
  const currentPath = router.state.location
    .pathname as (typeof nonAuthPaths)[number];

  axios.defaults.baseURL = import.meta.env.VITE_BACKEND_ENDPOINT;
  axios.defaults.withCredentials = true;

  // TODO: Probably need to take into consideration the loading state of the app

  axios.interceptors.request.use(config => {
    const serverToken = getCookie("token");
    const token = serverToken?.split("+")[1];

    if (token) {
      const decoded = jwtDecode(token);

      const now = Date.now() / 1000;

      if (Number(decoded.exp) < now) {
        toast.error("Session expired. Please login again.");
        if (!nonAuthPaths.includes(currentPath)) {
          router.navigate({ to: "/login" });
        }
        return Promise.reject("Session expired");
      }
    }

    return config;
  });

  axios.interceptors.response.use(
    response => {
      const serverToken = getCookie("token");
      const token = serverToken?.split("+")[1];

      if (token) {
        const decoded = jwtDecode(token);

        console.log(decoded);
      }
      return response;
    },
    error => {
      if (error.response?.status === 401) {
        console.error("Unauthorized");
      }

      return Promise.reject(error);
    }
  );
}
