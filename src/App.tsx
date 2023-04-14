import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Navigate, Outlet, useRouter } from "@tanstack/react-router";
import Layout from "./modules/shared/Layout";

export default function App() {
  const queryClient = new QueryClient();
  const router = useRouter();

  // TODO: check if user is logged in. If not, redirect to login page
  // if (router.state.currentLocation.pathname === "/") {
  //   return <Navigate to="/auth/login" />;
  // }

  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Outlet />
      </Layout>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
