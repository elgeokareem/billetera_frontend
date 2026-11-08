import { Link, useNavigate } from "@tanstack/react-router";
import { Alert, PasswordInput, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useTranslation } from "react-i18next";
import { getApiErrorKey } from "../shared/api-errors";
import { PrimaryButton } from "../shared/components/Buttons";
import { PublicLayout } from "../shared/components/PublicLayout";
import i18n from "../shared/i18n";
import { useRegister } from "./hooks";

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mutation = useRegister();

  const form = useForm({
    initialValues: { email: "", password: "", confirm_password: "" },
    validate: {
      email: (value) =>
        /^\S+@\S+$/.test(value) ? null : i18n.t("auth.invalidEmail"),
      password: (value) =>
        value.length >= 3 ? null : i18n.t("auth.passwordTooShort"),
      confirm_password: (value, values) =>
        value === values.password ? null : i18n.t("auth.passwordMismatch"),
    },
  });

  const onSubmit = (values: typeof form.values) => {
    mutation.mutate(values, {
      onSuccess: () => navigate({ to: "/login" }),
    });
  };

  return (
    <PublicLayout
      homeLink
      title={t("auth.registerTitle")}
      subtitle={
        <>
          {t("auth.registerSubtitle")}{" "}
          <Link to="/login">{t("auth.registerLink")}</Link>
        </>
      }
    >
      <form onSubmit={form.onSubmit(onSubmit)}>
        <TextInput
          label={t("auth.email")}
          placeholder={t("auth.emailPlaceholder")}
          type="email"
          autoComplete="email"
          {...form.getInputProps("email")}
        />
        <PasswordInput
          label={t("auth.password")}
          autoComplete="new-password"
          mt="md"
          {...form.getInputProps("password")}
        />
        <PasswordInput
          label={t("auth.confirmPassword")}
          autoComplete="new-password"
          mt="md"
          {...form.getInputProps("confirm_password")}
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
          {t("auth.registerSubmit")}
        </PrimaryButton>
      </form>
    </PublicLayout>
  );
}
