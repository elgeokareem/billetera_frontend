import {
  Button,
  ButtonProps,
  ElementProps,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";

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

interface ButtonPropsInterface {
  label: string;
  key: unknown;
}
export function ButtonGroup({
  data,
  active,
}: {
  data: ButtonPropsInterface[];
  active: string;
}) {
  const theme = useMantineTheme();
  const navigate = useNavigate();

  return (
    <Button.Group>
      {data.map(({ label, key }) => {
        return (
          <Button
            color={key === active ? theme.colors.gray[0] : "yellow"}
            c={key === active ? theme.colors.dark[6] : "purple"}
            key={key as string}
            onClick={() => {
              navigate({
                search: { graphType: key },
              });
            }}
          >
            {label}
          </Button>
        );
      })}
    </Button.Group>
  );
}
