import {
  Text,
  TextProps,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { JSX, ReactNode } from "react";

interface MyTextProps extends TextProps {
  children: string | JSX.Element | JSX.Element[] | ReactNode;
}

export function ThemedText(props: MyTextProps) {
  const { colorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  const color = colorScheme === "dark" ? theme.white : theme.black;

  return (
    <Text {...props} c={color}>
      {props.children}
    </Text>
  );
}

export function ModuleTitle(props: MyTextProps) {
  const { colorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  const color = colorScheme === "dark" ? theme.white : theme.black;

  return (
    <Text {...props} c={color} size="48px">
      {props.children}
    </Text>
  );
}
