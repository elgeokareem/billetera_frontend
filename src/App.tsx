import { Outlet } from "@tanstack/react-router";
import Layout from "./modules/shared/Layout";

export default function App() {
  return (
    <>
      <Layout>
        <Outlet />
      </Layout>
    </>
  );
}
