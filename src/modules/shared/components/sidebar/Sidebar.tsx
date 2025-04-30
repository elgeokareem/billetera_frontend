import { SidebarItem, SidebarItems } from "./SidebarItems";
import { IconHome, IconUser, IconSettings } from "@tabler/icons-react";

export function Sidebar() {
  return (
    <nav
      style={{ width: "25%", height: "100vh", padding: "15px 0px 15px 20px" }}
      id="testerino"
    >
      <SidebarItems title="Navigation">
        <SidebarItem label="Dashboard" to="/" icon={<IconHome />} />
        <SidebarItem label="Portfolio" to="/" icon={} />
        <SidebarItem label="Transactions" to="/" icon={} />
        <SidebarItem label="Trading" to="/" icon={} />
      </SidebarItems>
    </nav>
  );
}
