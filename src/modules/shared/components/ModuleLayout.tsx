import { Box, BoxProps, ElementProps } from "@mantine/core";

interface MyBoxProps extends BoxProps, ElementProps<"div", keyof BoxProps> {}
export function ModuleLayout(props: MyBoxProps) {
  return (
    <Box component="main" style={{ width: "80%", padding: "15px 20px" }}>
      {props.children}
    </Box>
  );
}
