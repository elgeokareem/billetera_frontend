import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { loginSchema } from "../modules/login/loginSchema";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { toast } from "react-toastify";

export const Route = createFileRoute("/login")({
  component: () => <Login />
});

function Login() {
  const navigate = useNavigate();
  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      email: "",
      password: ""
    },

    validate: joiResolver(loginSchema)
  });

  const mutation = useMutation({
    mutationFn: (values: typeof form.values) => {
      return axios.post(
        `${import.meta.env.VITE_BACKEND_ENDPOINT}/auth/login`,
        values
      );
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error?.response?.data?.message);
    }
  });

  return (
    <LandingLayout>
      <Container size={420} my={40}>
        <Title ta="center">Welcome back!</Title>
        <Text c="dimmed" size="sm" ta="center" mt={5}>
          Do not have an account yet? <Link to="/register">Create account</Link>
        </Text>

        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <form onSubmit={form.onSubmit(values => mutation.mutate(values))}>
            <TextInput
              label="Email"
              placeholder="you@mantine.dev"
              required
              onChange={e => form.setFieldValue("email", e.target.value)}
            />
            <PasswordInput
              label="Password"
              placeholder="Your password"
              required
              mt="md"
              onChange={e =>
                form.setFieldValue("password", e.currentTarget.value)
              }
            />
            <Group justify="space-between" mt="lg">
              <Checkbox label="Remember me" />
              <Anchor component="button" size="sm">
                Forgot password?
              </Anchor>
            </Group>
            <Button fullWidth mt="xl" type="submit">
              Sign in
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
