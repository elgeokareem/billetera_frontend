import { Link, useRouter, useSearch } from "@tanstack/react-router";
import { Alert, PasswordInput, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { getApiErrorKey } from "../shared/api-errors";
import { PrimaryButton } from "../shared/components/Buttons";
import { PublicLayout } from "../shared/components/PublicLayout";
import i18n from "../shared/i18n";
import { safeRedirect } from "../shared/session";

export function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { redirect: redirectTo } = useSearch({ from: "/login" });

  const form = useForm({
    initialValues: { email: "", password: "" },
    validate: {
      email: (value) =>
        /^\S+@\S+$/.test(value) ? null : i18n.t("auth.invalidEmail"),
      password: (value) => (value ? null : i18n.t("auth.passwordRequired")),
    },
  });

  const mutation = useMutation({
    mutationFn: (values: typeof form.values) =>
      axios.post("/auth/login", values),
    onSuccess: () => {
      toast.success(t("auth.loginSuccess"));
      // Nothing from an earlier session may show in this one.
      queryClient.clear();
      router.history.push(safeRedirect(redirectTo));
    },
  });

  return (
    <PublicLayout
      homeLink
      title={t("auth.loginTitle")}
      subtitle={
        <>
          {t("auth.loginSubtitle")}{" "}
          <Link to="/register">{t("auth.loginLink")}</Link>
        </>
      }
    >
      <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
        <TextInput
          label={t("auth.email")}
          placeholder={t("auth.emailPlaceholder")}
          type="email"
          autoComplete="email"
          {...form.getInputProps("email")}
        />
        <PasswordInput
          label={t("auth.password")}
          placeholder={t("auth.passwordPlaceholder")}
          autoComplete="current-password"
          mt="md"
          {...form.getInputProps("password")}
        />
        {mutation.isError && (
          <Alert color="red" mt="md">
            {t(getApiErrorKey(mutation.error))}
          </Alert>
        )}
        <PrimaryButton
          type="submit"
          fullWidth
          mt="xl"
          loading={mutation.isPending}
        >
          {t("auth.loginSubmit")}
        </PrimaryButton>
      </form>
    </PublicLayout>
  );
}
