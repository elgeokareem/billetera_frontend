import { createFileRoute } from "@tanstack/react-router";
import { Center, Box } from "@mantine/core";
import { LandingLayout } from "../modules/shared/LandingLayout";

export const Route = createFileRoute("/")({
  component: () => <Landing />
});

function Landing() {
  return (
    <LandingLayout>
      <Center>
        <Box>
          <h1>This is the landing page of the app</h1>
          <p>
            This is an app to track your crypto investments. You can register
            for an account or login if you already have one.
          </p>
        </Box>
      </Center>
    </LandingLayout>
  );
}
