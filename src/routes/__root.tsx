import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import {
  Box,
  colorsTuple,
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
      dark: DEFAULT_THEME.colors.dark[0],
      light: "indigo",
    }),
    primaryYellow: colorsTuple("#EAB307"),
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
          {/* TODO: Check how can i change the background color using a virtual color */}
          <Box bg="bgPrimary" h="100%" id="testerino">
            <Outlet />
          </Box>
        </MantineProvider>
        <ToastContainer />
        <TanStackRouterDevtools />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </>
  ),
});
