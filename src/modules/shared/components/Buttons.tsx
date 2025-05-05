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

interface ButtonPropsInterface<T extends string | number | boolean> {
  label: string;
  key: T;
}
export function ButtonGroup<T extends string | number | boolean>({
  data,
  active,
  onClick,
}: {
  data: ButtonPropsInterface<T>[];
  active: string;
  onClick?: (key: T) => void;
}) {
  const theme = useMantineTheme();

  return (
    <Button.Group>
      {data.map(({ label, key }) => {
        return (
          <Button
            color={key === active ? theme.colors.gray[0] : theme.colors.dark[4]}
            c={key === active ? theme.colors.dark[6] : "white"}
            key={key as string}
            onClick={() => {
              if (onClick) {
                onClick(key);
              }
            }}
          >
            {label}
          </Button>
        );
      })}
    </Button.Group>
  );
}
