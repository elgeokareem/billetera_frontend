import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "../../modules/dashboard/DashboardPage";
import { DASHBOARD_RANGE_KEYS, parseRangeSearch } from "../../modules/shared/chartRange";

// The range of the balance chart is in the URL, so a view survives a reload. Only the Dashboard's own ranges are kept.
export const Route = createFileRoute("/_app/dashboard")({
  validateSearch: (raw) => parseRangeSearch(raw, DASHBOARD_RANGE_KEYS),
  component: DashboardPage,
});
