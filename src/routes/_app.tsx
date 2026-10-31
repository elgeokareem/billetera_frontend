import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppLayout } from "../modules/shared/components/AppLayout";
import { sessionQuery } from "../modules/shared/session";

// Without a Binance key, every protected page leads to Connect. Settings stays open, so the user can log out.
const PAGES_WITHOUT_KEY = ["/settings"];

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery);
    if (!session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    if (!session.configured && !PAGES_WITHOUT_KEY.includes(location.pathname)) {
      throw redirect({ to: "/connect" });
    }
  },
  // Shows the loader at once when the session isn't cached yet. pendingMinMs stops the router's 500ms default from
  // keeping the loader up after a cached session has already resolved.
  pendingMs: 0,
  pendingMinMs: 0,
  component: AppLayout,
});
