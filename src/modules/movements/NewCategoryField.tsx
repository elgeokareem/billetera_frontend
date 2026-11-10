import { Button, Group, Stack, TextInput } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import type { Category } from "../categories/types";
import { getApiErrorKey } from "../shared/api-errors";
import { newCategoryNameError } from "./drawerCategories";

interface NewCategoryFieldProps {
  /** The loaded categories, or undefined while they load or after they failed. */
  categories: readonly Category[] | undefined;
  /** True while the drawer saves the movement. */
  disabled: boolean;
  /** True while POST /categories is in flight. */
  creating: boolean;
  /** Sends POST /categories. Resolves with the new category, rejects with the axios error. */
  onCreate: (name: string) => Promise<Category>;
  /** Called after a successful create. */
  onCreated: (category: Category) => void;
}

/**
 * The drawer's "New category" button and its inline name field. It sits inside the drawer's form, so none of its buttons
 * may submit: Enter in the field is handled here and every button is explicitly type="button".
 */
export function NewCategoryField({
  categories,
  disabled,
  creating,
  onCreate,
  onCreated,
}: NewCategoryFieldProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  /** A duplicate shows as a toast, so the field and the typed name stay to edit; every other problem stays under the field. */
  function reportError(key: string) {
    if (key === "errors.categoryExists") {
      toast.error(t(key));
      setError(null);
      return;
    }
    setError(key);
  }

  async function submit() {
    if (creating || disabled) {
      return;
    }
    const problem = newCategoryNameError(name, categories ?? []);
    if (problem !== null) {
      reportError(problem);
      return;
    }
    setError(null);
    try {
      const category = await onCreate(name);
      setOpen(false);
      setName("");
      onCreated(category);
    } catch (err) {
      reportError(getApiErrorKey(err));
    }
  }

  function cancel() {
    setOpen(false);
    setName("");
    setError(null);
  }

  if (!open) {
    return (
      <Group>
        <Button
          type="button"
          variant="default"
          radius="xl"
          mih={44}
          disabled={disabled || categories === undefined}
          onClick={() => setOpen(true)}
        >
          {t("dashboard.card.newCategory")}
        </Button>
      </Group>
    );
  }

  return (
    <Stack gap="sm">
      <TextInput
        label={t("dashboard.card.newCategoryLabel")}
        placeholder={t("dashboard.card.newCategoryPlaceholder")}
        value={name}
        maxLength={64}
        autoFocus
        disabled={creating || disabled}
        error={error ? t(error) : undefined}
        styles={{ input: { minHeight: 44 } }}
        onChange={(event) => {
          // Read now: React clears currentTarget after the event, and an updater runs later.
          const value = event.currentTarget.value;
          setName(value);
          setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            void submit();
          }
        }}
      />
      <Group gap="sm">
        <Button
          type="button"
          variant="light"
          radius="xl"
          mih={44}
          loading={creating}
          disabled={disabled}
          onClick={() => void submit()}
        >
          {t("dashboard.card.createCategory")}
        </Button>
        <Button
          type="button"
          variant="subtle"
          mih={44}
          disabled={creating || disabled}
          onClick={cancel}
        >
          {t("dashboard.card.cancel")}
        </Button>
      </Group>
    </Stack>
  );
}
