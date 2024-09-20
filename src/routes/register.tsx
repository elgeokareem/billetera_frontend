import { createFileRoute, Link } from "@tanstack/react-router";
import { LandingLayout } from "../modules/shared/LandingLayout";
import {
  Anchor,
  Button,
  Checkbox,
  Container,
  Group,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { joiResolver } from "mantine-form-joi-resolver";
import { registerSchema } from "../modules/register/registerSchema";

export const Route = createFileRoute("/register")({
  component: () => <Register />
});

function Register() {
  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      email: "",
      password: ""
    },

    validate: joiResolver(registerSchema)
  });

  return (
    <LandingLayout>
      <Container size={420} my={40}>
        <Title ta="center">Create an account</Title>
        <Text c="dimmed" size="sm" ta="center" mt={5}>
          Already have an account? <Link to="/login">Login</Link>
        </Text>

        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <form onSubmit={form.onSubmit(values => console.log(values))}>
            <TextInput
              label="Email"
              placeholder="password"
              required
              onChange={e => form.setFieldValue("email", e.target.value)}
            />
            <PasswordInput
              label="Password"
              placeholder="password"
              required
              mt="md"
              onChange={e =>
                form.setFieldValue("password", e.currentTarget.value)
              }
            />
            <PasswordInput
              label="Confirm password"
              placeholder="password"
              required
              mt="md"
              onChange={e =>
                form.setFieldValue("confirmPassword", e.currentTarget.value)
              }
            />
            <Group mt={20}>
              <Checkbox
                label="I agree to terms and conditions"
                onChange={e =>
                  form.setFieldValue("terms", e.currentTarget.checked)
                }
              />
              <Anchor href="#">Terms and conditions</Anchor>
            </Group>
            <Button type="submit" variant="light" mt={20} fullWidth>
              Register
            </Button>
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
    </LandingLayout>
  );
}
