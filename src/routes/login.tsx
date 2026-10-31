import { createFileRoute, redirect } from "@tanstack/react-router";
import { type } from "arktype";
import { LoginPage } from "../modules/login/LoginPage";
import { sessionQuery } from "../modules/shared/session";

const loginSearchSchema = type({ "redirect?": "string" });

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  beforeLoad: async ({ context }) => {
    // If the check itself fails, the login form is still the right page.
    const session = await context.queryClient
      .ensureQueryData(sessionQuery)
      .catch(() => null);
    if (session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
});
