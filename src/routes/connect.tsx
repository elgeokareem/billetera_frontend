import { createFileRoute, redirect } from "@tanstack/react-router";
import { ConnectPage } from "../modules/binance/ConnectPage";
import { sessionQuery } from "../modules/shared/session";

export const Route = createFileRoute("/connect")({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery);
    if (!session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    if (session.configured) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: ConnectPage,
});
