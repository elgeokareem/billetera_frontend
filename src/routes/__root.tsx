import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import {
  createTheme,
  DEFAULT_THEME,
  MantineProvider,
  virtualColor,
} from "@mantine/core";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { axiosInterceptorsAndConfig } from "../modules/shared/axios-interceptors";
import "react-toastify/dist/ReactToastify.css";
import "@mantine/core/styles.css";

// Query
const queryClient = new QueryClient();
// Mantine
const theme = createTheme({
  colors: {
    bgPrimary: virtualColor({
      name: "bgPrimary",
      dark: DEFAULT_THEME.colors.dark[7],
      light: DEFAULT_THEME.colors.gray[0],
    }),
  },
});

export const Route = createRootRoute({
  beforeLoad: () => {
    axiosInterceptorsAndConfig();
  },
  component: () => (
    <>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme} defaultColorScheme="dark">
          <Outlet />
        </MantineProvider>
        <ToastContainer />
        <TanStackRouterDevtools />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </>
  ),
});
