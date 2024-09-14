import { createFileRoute } from "@tanstack/react-router";
import { LandingLayout } from "../modules/shared/LandingLayout";

export const Route = createFileRoute("/login")({
  component: () => <Login />
});

function Login() {
  return (
    <LandingLayout>
      <div>login</div>
    </LandingLayout>
  );
}
