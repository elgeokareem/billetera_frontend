import { Alert, PasswordInput, rem, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getApiErrorKey } from "../shared/api-errors";
import { PrimaryButton } from "../shared/components/Buttons";
import { useSaveCredentials } from "./hooks";
import { isValidKeyText } from "./keyFormat";

interface CredentialsFormProps {
  submitLabel: string;
  /** Runs once the key is saved. */
  onSaved: () => void;
}

/** The key form shared by Connect and Replace key. The secret leaves the form as soon as it's submitted. */
export function CredentialsForm({ submitLabel, onSaved }: CredentialsFormProps) {
  const { t } = useTranslation();
  const save = useSaveCredentials();
  const [showSecret, setShowSecret] = useState(false);

  const form = useForm({
    initialValues: { apiKey: "", apiSecret: "" },
    validate: {
      apiKey: (value) => {
        if (!value.trim()) {
          return t("binance.form.keyRequired");
        }
        return isValidKeyText(value) ? null : t("binance.form.keyInvalid");
      },
      apiSecret: (value) => {
        if (!value.trim()) {
          return t("binance.form.secretRequired");
        }
        return isValidKeyText(value) ? null : t("binance.form.secretInvalid");
      },
    },
  });

  const onSubmit = ({ apiKey, apiSecret }: typeof form.values) => {
    // If the save fails, the secret has to be typed again. The key stays.
    form.setFieldValue("apiSecret", "");
    save.mutate({ apiKey, apiSecret }, { onSuccess: onSaved });
  };

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <TextInput
        label={t("binance.form.apiKey")}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        disabled={save.isPending}
        {...form.getInputProps("apiKey")}
      />
      <PasswordInput
        label={t("binance.form.apiSecret")}
        autoComplete="off"
        mt="md"
        disabled={save.isPending}
        visible={showSecret}
        onVisibilityChange={setShowSecret}
        // The show/hide toggle is a touch target too, so it gets the 44px minimum.
        vars={() => ({ root: { "--psi-button-size": rem(44) } })}
        visibilityToggleButtonProps={{
          "aria-label": t(
            showSecret ? "binance.form.hideSecret" : "binance.form.showSecret",
          ),
        }}
        {...form.getInputProps("apiSecret")}
      />
      <Text c="dimmed" size="sm" mt="sm">
        {t("binance.form.readOnlyHint")}
      </Text>
      {save.isPending && (
        <Text c="dimmed" size="sm" mt="md">
          {t("binance.connect.checking")}
        </Text>
      )}
      {save.isError && (
        <Alert color="red" mt="md">
          {t(getApiErrorKey(save.error))}
        </Alert>
      )}
      <PrimaryButton
        type="submit"
        fullWidth
        mt="xl"
        loading={save.isPending}
      >
        {submitLabel}
      </PrimaryButton>
    </form>
  );
}
