import { Button, ButtonProps, ElementProps } from "@mantine/core";
import { INK_ON_ACCENT } from "../theme";

interface MyButtonProps
  extends ButtonProps,
    ElementProps<"button", keyof ButtonProps> {}
export function PrimaryButton(props: MyButtonProps) {
  // 44px is the minimum interactive target (App Foundation). The md button alone is 42px.
  return <Button size="md" mih={44} radius="xl" c={INK_ON_ACCENT} {...props} />;
}
