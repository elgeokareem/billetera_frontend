import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "../modules/landing/LandingPage";
import { redirectIfLoggedIn } from "../modules/shared/session";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => redirectIfLoggedIn(context.queryClient),
  component: LandingPage,
});
