import { createFileRoute } from "@tanstack/react-router";
import { LandingLayout } from "../modules/shared/LandingLayout";

export const Route = createFileRoute("/register")({
  component: () => <Register />
});

function Register() {
  return (
    <LandingLayout>
      <div>register</div>
    </LandingLayout>
  );
}
