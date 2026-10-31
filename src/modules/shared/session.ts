import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import axios from "axios";
import { toast } from "react-toastify";
import { getApiErrorKey } from "./api-errors";
import type { Schemas } from "./api-types";
import i18n from "./i18n";

export const SESSION_PATH = "/binance/credentials";

/** A saved Binance key, as GET and PUT /binance/credentials describe it. The key and the secret are never in it. */
export type BinanceKey = Schemas["binance.CredentialsConfigured"];

export type BinanceCredentials = Schemas["binance.CredentialsResponse"]["credentials"];

// The session cookie is httpOnly and the backend has no /auth/me, so a protected call is how we find out if
// the user is logged in. null means they aren't.
async function fetchSession(): Promise<BinanceCredentials | null> {
  try {
    const { data } = await axios.get<Schemas["binance.CredentialsResponse"]>(
      SESSION_PATH,
    );
    return data.credentials;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null;
    }
    throw error;
  }
}

export const sessionQuery = queryOptions({
  queryKey: ["session"],
  queryFn: fetchSession,
  retry: false,
  staleTime: 5 * 60 * 1000,
});

const DEFAULT_ROUTE = "/dashboard";

/** Only follows a path inside this app, so a crafted login link can't send the user to another site. */
export function safeRedirect(redirect: string | undefined) {
  if (!redirect || !/^\/(?![/\\])/.test(redirect)) {
    return DEFAULT_ROUTE;
  }
  return redirect;
}

/** Ends the session on the server, then clears the cached data and goes to the login page. */
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => axios.post("/auth/logout"),
    onSuccess: () => {
      queryClient.clear();
      navigate({ to: "/login" });
    },
    onError: (error) => {
      toast.error(i18n.t(getApiErrorKey(error)));
    },
  });
}
