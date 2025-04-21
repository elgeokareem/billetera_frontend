import {
  Text,
  TextProps,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";

interface MyTextProps extends TextProps {
  children: string;
}

export function ThemedText(props: MyTextProps) {
  const { colorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  const color = colorScheme === "dark" ? theme.white : theme.black;

  return <Text {...props} c={color} />;
}
