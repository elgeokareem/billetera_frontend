import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Container, Group, useMantineTheme } from "@mantine/core";
import { PrimaryButton } from "../modules/shared/components/Buttons";

export const Route = createFileRoute("/")({
  component: () => <Landing />,
});

function Landing() {
  const theme = useMantineTheme();
  const navigate = useNavigate();

  const onClickLogin = () => {
    console.log("redirect to login");
    navigate({ to: "/login" });
  };

  const onClickRegister = () => {
    navigate({ to: "/register" });
  };

  return (
    <Container fluid bg={theme.colors.dark[7]} h="100%">
      <Group justify="space-between">
        <Group style={{ width: "10%" }} justify="center">
          <img
            src="/assets/billetera-logo-transparent-bg.png"
            alt="Logo"
            width={100}
          />
        </Group>
        <Group gap="md">
          <PrimaryButton onClick={onClickLogin}>Login</PrimaryButton>
          <PrimaryButton onClick={onClickRegister}>Register</PrimaryButton>
        </Group>
      </Group>
    </Container>
  );
}
