import { Container, Tabs } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { FaCamera, FaCircle, FaGear } from "react-icons/fa6";

import { ReactNode } from "react";

export function LandingLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <Container>
      <Tabs defaultValue="home">
        <Tabs.List>
          <Tabs.Tab
            value="home"
            leftSection={<FaCamera />}
            onClick={() => navigate({ to: "/" })}
          >
            Home
          </Tabs.Tab>

          <Tabs.Tab
            value="login"
            leftSection={<FaCircle />}
            onClick={() => navigate({ to: "/login" })}
          >
            Login
          </Tabs.Tab>

          <Tabs.Tab
            value="register"
            leftSection={<FaGear />}
            onClick={() => navigate({ to: "/register" })}
          >
            Register
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {children}
    </Container>
  );
}
