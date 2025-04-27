import { Box, BoxProps, ElementProps } from "@mantine/core";
import { Sidebar } from "./sidebar/sidebar";

interface MyBoxProps extends BoxProps, ElementProps<"div", keyof BoxProps> {}

export function ModulesContainer(props: MyBoxProps) {
  return (
    <Box
      component="section"
      style={{
        width: "100%",
        padding: "15px 20px",
        display: "flex",
        flexDirection: "row",
      }}
    >
      <Sidebar />
      {props.children}
    </Box>
  );
}
