import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import axios from "axios";
import "./modules/shared/i18n";
import { axiosInterceptorsAndConfig } from "./modules/shared/axios-interceptors";
import {
  FullPageError,
  FullPageLoader,
} from "./modules/shared/components/PageStates";
import { parseSearch, stringifySearch } from "./modules/shared/search-params";
import "./app.css";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 4xx won't change on a retry
      retry: (failureCount, error) => {
        const status = axios.isAxiosError(error) ? error.response?.status : 0;
        return !(status && status >= 400 && status < 500) && failureCount < 2;
      },
    },
  },
});

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { queryClient },
  // Search values stay text, so a filter such as q=1.50 is searched for as written (see search-params.ts).
  parseSearch,
  stringifySearch,
  defaultPendingComponent: FullPageLoader,
  defaultErrorComponent: ({ error }) => <FullPageError error={error} />,
});

axiosInterceptorsAndConfig(router, queryClient);

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
