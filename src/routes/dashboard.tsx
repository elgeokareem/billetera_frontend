import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAuthenticated } from "../modules/shared/auth";
import { ModulesContainer } from "../modules/shared/components/ModulesContainer";
import { ModuleLayout } from "../modules/shared/components/ModuleLayout";
import {
  ModuleTitle,
  ThemedText,
} from "../modules/shared/components/CustomText";

export const Route = createFileRoute("/dashboard")({
  // beforeLoad: async () => {
  //   const hasAccess = isAuthenticated();
  //   if (!hasAccess) {
  //     return redirect({ to: "/login" });
  //   }
  // },
  component: () => (
    <ModulesContainer>
      <Dashboard />
    </ModulesContainer>
  ),
});

function Dashboard() {
  return (
    <ModuleLayout>
      <ModuleTitle>Dashboard</ModuleTitle>
      <ThemedText>Ayy lmao</ThemedText>
    </ModuleLayout>
  );
}
