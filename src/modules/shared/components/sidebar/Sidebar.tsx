import { Stack } from "@mantine/core";
import { SidebarItem, SidebarItems } from "./SidebarItems";
import { IconHome, IconDeviceLaptop } from "@tabler/icons-react";

export function Sidebar() {
  return (
    <nav
      style={{ width: "15%", height: "100vh", padding: "15px 0px 15px 20px" }}
      id="testerino"
    >
      <Stack gap={10}>
        <SidebarItems title="Navigation">
          <SidebarItem label="Dashboard" to="/" icon={<IconHome />} />
          <SidebarItem label="Portfolio" to="/" icon={<IconDeviceLaptop />} />
          <SidebarItem
            label="Transactions"
            to="/"
            icon={<IconDeviceLaptop />}
          />
          <SidebarItem label="Trading" to="/" icon={<IconDeviceLaptop />} />
        </SidebarItems>

        <SidebarItems title="Analytics">
          <SidebarItem label="Performance" to="/" icon={<IconHome />} />
          <SidebarItem label="Charts" to="/" icon={<IconDeviceLaptop />} />
          <SidebarItem label="Reports" to="/" icon={<IconDeviceLaptop />} />
        </SidebarItems>
      </Stack>
    </nav>
  );
}
