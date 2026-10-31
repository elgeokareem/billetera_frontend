import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "../../modules/dashboard/DashboardPage";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});
