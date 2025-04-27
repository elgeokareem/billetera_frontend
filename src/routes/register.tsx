import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Anchor,
  Checkbox,
  Container,
  Group,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { joiResolver } from "mantine-form-joi-resolver";
import { registerSchema } from "../modules/register/registerSchema";
import { useRegister } from "../modules/register/hooks";
import { PrimaryButton } from "../modules/shared/components/Buttons";

export const Route = createFileRoute("/register")({
  component: () => <Register />,
});

function Register() {
  const navigate = useNavigate();
  const form = useForm({
    mode: "controlled",
    initialValues: {
      email: "",
      password: "",
      confirm_password: "",
    },

    validate: joiResolver(registerSchema),
  });

  const mutation = useRegister();

  const onSubmit = async (values: typeof form.values) => {
    mutation.mutate(values);
    form.reset();
    navigate({ to: "/login" });
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">Create an account</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Already have an account? <Link to="/login">Login</Link>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(onSubmit)}>
          <TextInput
            label="Email"
            placeholder="password"
            required
            onChange={(e) => form.setFieldValue("email", e.target.value)}
          />
          <PasswordInput
            label="Password"
            placeholder="password"
            required
            mt="md"
            onChange={(e) =>
              form.setFieldValue("password", e.currentTarget.value)
            }
          />
          <PasswordInput
            label="Confirm password"
            placeholder="password"
            required
            mt="md"
            onChange={(e) =>
              form.setFieldValue("confirm_password", e.currentTarget.value)
            }
          />
          <Group mt={20}>
            <Checkbox
              label="I agree to terms and conditions"
              onChange={(e) =>
                form.setFieldValue("terms", e.currentTarget.checked)
              }
            />
            <Anchor href="#">Terms and conditions</Anchor>
          </Group>
          <PrimaryButton
            type="submit"
            mt={20}
            fullWidth
            loading={mutation.isPending}
          >
            Register
          </PrimaryButton>
        </form>

        {/* If errors show them */}
        {form.errors && (
          <Paper mt={20} p={10} radius="md">
            {Object.values(form.errors).map((error, index) => (
              <Text key={index} c="red" size="sm">
                {error?.toString()}
              </Text>
            ))}
          </Paper>
        )}
      </Paper>
    </Container>
  );
}
