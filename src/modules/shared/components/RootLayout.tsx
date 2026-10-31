import { Outlet, useRouteContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ToastContainer } from "react-toastify";
import { MantineProvider } from "@mantine/core";
import { theme } from "../theme";
import "react-toastify/dist/ReactToastify.css";
import "@mantine/core/styles.css";

export function RootLayout() {
  const { queryClient } = useRouteContext({ from: "__root__" });

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} forceColorScheme="dark">
        <Outlet />
        <ToastContainer theme="dark" />
      </MantineProvider>
      {import.meta.env.DEV && (
        <>
          <TanStackRouterDevtools />
          <ReactQueryDevtools />
        </>
      )}
    </QueryClientProvider>
  );
}
