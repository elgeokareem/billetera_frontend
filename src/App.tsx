import {
  Navigate,
  Outlet,
  useNavigate,
  useRouter
} from "@tanstack/react-router";
import { useEffect } from "react";
import Layout from "./modules/shared/Layout";

export default function App() {
  const router = useRouter();

  // TODO: check if user is logged in. If not, redirect to login page
  if (router.state.currentLocation.pathname === "/") {
    return <Navigate to="/auth/login" />;
  }

  return (
    <>
      <Layout>
        <Outlet />
      </Layout>
    </>
  );
}
