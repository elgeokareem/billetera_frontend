import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "../../modules/dashboard/DashboardPage";
import { parseRangeSearch, RANGE_KEYS } from "../../modules/shared/chartRange";

// The range of the balance chart is in the URL, so a view survives a reload. Every chart's range is accepted.
export const Route = createFileRoute("/_app/dashboard")({
  validateSearch: (raw) => parseRangeSearch(raw, RANGE_KEYS),
  component: DashboardPage,
});
