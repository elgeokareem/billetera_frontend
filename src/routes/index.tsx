import { createFileRoute } from "@tanstack/react-router";
import { Button, Container, Flex, useMantineTheme } from "@mantine/core";
import { ThemedText } from "../modules/shared/components/CustomText";

export const Route = createFileRoute("/")({
  component: () => <Landing />,
});

function Landing() {
  const theme = useMantineTheme();

  return (
    <Container fluid bg={theme.colors.dark[7]} h="100%">
      <Flex justify="space-between">
        <ThemedText>LOGO</ThemedText>
        <div>
          <Button>Login</Button>
          <Button>Register</Button>
        </div>
      </Flex>
    </Container>
  );
}
