import { createFileRoute } from "@tanstack/react-router";
import { CoinDetail } from "../../../modules/assets/CoinDetail";

export const Route = createFileRoute("/_app/assets/$asset")({
  component: CoinDetail,
});
