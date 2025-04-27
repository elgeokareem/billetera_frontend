import {
  Button,
  ButtonProps,
  ElementProps,
  Text,
  useMantineTheme,
} from "@mantine/core";

interface MyButtonProps
  extends ButtonProps,
    ElementProps<"button", keyof ButtonProps> {}
export function PrimaryButton(props: MyButtonProps) {
  const theme = useMantineTheme();

  return (
    <Button variant="filled" color={theme.colors.primaryYellow[0]} {...props}>
      <Text c={theme.colors.dark[7]}>{props.children}</Text>
    </Button>
  );
}
