import { Link, useNavigate } from "@tanstack/react-router";
import { Alert, PasswordInput, TextInput } from "@mantine/core";
import { useForm, type UseFormReturnType } from "@mantine/form";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getApiErrorKey } from "../shared/api-errors";
import { PrimaryButton } from "../shared/components/Buttons";
import { PublicLayout } from "../shared/components/PublicLayout";
import i18n from "../shared/i18n";
import { useRegister } from "./hooks";
import type { RegisterForm } from "./types";
import {
  confirmPasswordError,
  emailError,
  fieldsToRevalidate,
  passwordError,
  REGISTER_FIELDS,
  type RegisterField,
} from "./validation";

// Translates a validation key; null stays null (no error).
const translate = (key: string | null) => (key ? i18n.t(key) : null);

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mutation = useRegister();

  // Fields that re-validate on every change: blurred with a value, or after a submit attempt.
  // A state container gives a stable Set identity without reading a ref during render.
  const [live] = useState(() => new Set<RegisterField>());

  const form: UseFormReturnType<RegisterForm> = useForm<RegisterForm>({
    initialValues: { email: "", password: "", confirm_password: "" },
    validate: {
      email: (value) => translate(emailError(value)),
      password: (value) => translate(passwordError(value)),
      confirm_password: (value, values) =>
        translate(confirmPasswordError(value, values.password)),
    },
    onValuesChange: (values, previous) => {
      for (const field of fieldsToRevalidate(values, previous, live)) {
        live.add(field);
        form.validateField(field);
      }
    },
  });

  // Blurring a field with a value makes it live and checks it. Empty fields stay quiet.
  const validateOnBlur = (field: RegisterField) => () => {
    if (form.getValues()[field] === "") {
      return;
    }
    live.add(field);
    form.validateField(field);
  };

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
      <form
        onSubmit={form.onSubmit(onSubmit, () => {
          REGISTER_FIELDS.forEach((field) => live.add(field));
        })}
      >
        <TextInput
          label={t("auth.email")}
          placeholder={t("auth.emailPlaceholder")}
          type="email"
          autoComplete="email"
          {...form.getInputProps("email")}
          onBlur={validateOnBlur("email")}
        />
        <PasswordInput
          label={t("auth.password")}
          autoComplete="new-password"
          mt="md"
          {...form.getInputProps("password")}
          onBlur={validateOnBlur("password")}
        />
        <PasswordInput
          label={t("auth.confirmPassword")}
          autoComplete="new-password"
          mt="md"
          {...form.getInputProps("confirm_password")}
          onBlur={validateOnBlur("confirm_password")}
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
