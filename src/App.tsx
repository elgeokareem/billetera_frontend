import { Outlet } from "@tanstack/react-router";
import Layout from "./modules/shared/Layout";

export default function App() {
  // TODO: make redirect if the user is not logged to the login page
  return (
    <>
      <Layout>
        <Outlet />
      </Layout>
    </>
  );
}
