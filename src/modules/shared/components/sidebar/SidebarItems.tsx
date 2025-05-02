import { Box, Flex, Text } from "@mantine/core";
import { useNavigate, LinkProps } from "@tanstack/react-router";

interface SidebarItemsProps {
  title: string;
  children: React.ReactNode;
}
export function SidebarItems({ title, children }: SidebarItemsProps) {
  return (
    <>
      <Text>{title}</Text>
      <Box
        component="ul"
        style={{ display: "flex", flexDirection: "column", gap: "20px" }}
      >
        {children}
      </Box>
    </>
  );
}

interface SidebarItemProps {
  label: string;
  icon?: React.ReactNode;
  to: LinkProps["to"];
}
export function SidebarItem({ label, to, icon }: SidebarItemProps) {
  const navigate = useNavigate();

  return (
    <Flex
      component="li"
      style={{ cursor: "pointer" }}
      onClick={() => navigate({ to })}
      gap={5}
    >
      {icon}
      <Text>{label}</Text>
    </Flex>
  );
}
