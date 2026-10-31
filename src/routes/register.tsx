import { createFileRoute, redirect } from "@tanstack/react-router";
import { RegisterPage } from "../modules/register/RegisterPage";
import { sessionQuery } from "../modules/shared/session";

export const Route = createFileRoute("/register")({
  beforeLoad: async ({ context }) => {
    // If the check itself fails, the form is still the right page.
    const session = await context.queryClient
      .ensureQueryData(sessionQuery)
      .catch(() => null);
    if (session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: RegisterPage,
});
