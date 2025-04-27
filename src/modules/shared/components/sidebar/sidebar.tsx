import { Box } from "@mantine/core";
import { ThemedText } from "../CustomText";

export function Sidebar() {
  return (
    <Box
      style={{ width: "25%", height: "100vh", padding: "15px 20px" }}
      id="testerino"
    >
      <ThemedText>I'm a sidebar</ThemedText>
    </Box>
  );
}
