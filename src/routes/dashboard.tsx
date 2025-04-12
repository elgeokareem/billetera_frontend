import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAuthenticated } from "../modules/shared/auth";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const hasAccess = isAuthenticated();
    if (!hasAccess) {
      return redirect({ to: "/login" });
    }
  },
  component: () => <div>Hello /dashboard! This is a protected route</div>
});
