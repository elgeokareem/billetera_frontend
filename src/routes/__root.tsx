import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import { MantineProvider } from "@mantine/core";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { axiosInterceptorsAndConfig } from "../modules/shared/axios-interceptors";
import "react-toastify/dist/ReactToastify.css";
import "@mantine/core/styles.css";

const queryClient = new QueryClient();
// Create a client

export const Route = createRootRoute({
  beforeLoad: () => {
    axiosInterceptorsAndConfig();
  },
  component: () => (
    <>
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <div>
            <Outlet />
          </div>
        </MantineProvider>
        <ToastContainer />
        <TanStackRouterDevtools />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </>
  )
});
