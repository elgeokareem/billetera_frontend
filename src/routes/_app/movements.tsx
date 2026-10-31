import { createFileRoute } from "@tanstack/react-router";
import { MovementsPage } from "../../modules/movements/MovementsPage";
import { parseMovementsSearch } from "../../modules/movements/search";

// The filters live in the URL, so a filtered view can be shared and survives a reload.
export const Route = createFileRoute("/_app/movements")({
  validateSearch: parseMovementsSearch,
  component: MovementsPage,
});
