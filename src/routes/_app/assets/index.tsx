import { createFileRoute } from "@tanstack/react-router";
import { AssetsPage } from "../../../modules/assets/AssetsPage";

export const Route = createFileRoute("/_app/assets/")({
  component: AssetsPage,
});
