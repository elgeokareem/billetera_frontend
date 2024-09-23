import axios from "axios";
import { getCookie } from "./utils";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "../../routeTree.gen";

export function axiosInterceptorsAndConfig() {
  axios.defaults.baseURL = import.meta.env.VITE_BACKEND_ENDPOINT;
  axios.defaults.withCredentials = true;

  const router = createRouter({ routeTree });

  axios.interceptors.request.use(config => {
    const serverToken = getCookie("token");
    const token = serverToken?.split("+")[1];

    if (token) {
      const decoded = jwtDecode(token);

      const now = Date.now() / 1000;

      if (Number(decoded.exp) < now) {
        toast.error("Session expired. Please login again.");
        router.navigate({ to: "/login" });
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
