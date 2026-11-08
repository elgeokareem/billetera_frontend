import { Alert, Button, Group, Paper, Select, Stack, Text, TextInput } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { Category } from "../categories/types";
import type { Movement } from "../movements/types";
import { formatDate, formatQuantity, formatUsd } from "../shared/format";
import { abs } from "../shared/money";
import { PrimaryButton } from "../shared/components/Buttons";
import { Sensitive } from "../shared/components/Sensitive";
import { kindKey, priceNote } from "./movementText";

/** The new-category form of one card, kept by the queue so it survives a failed save. */
export interface NewCategoryForm {
  name: string;
  saving: boolean;
  /** A translation key for the error of the last try. */
  error?: string;
}

interface LabelCardProps {
  movement: Movement;
  /** Categories shown as buttons, in the order the card lists them. */
  buttons: Category[];
  /** The rest of the categories, offered in a select. */
  more: Category[];
  reason: string;
  onReasonChange: (reason: string) => void;
  /** A translation key for the error of the last failed save, or undefined. */
  failure?: string;
  /** The open new-category form, or undefined when it's closed. */
  form?: NewCategoryForm;
  onPick: (category: Category) => void;
  onOpenForm: () => void;
  onFormNameChange: (name: string) => void;
  onFormSubmit: () => void;
  onFormCancel: () => void;
}

/** One unlabelled movement: what it was, what it cost, and the buttons to file it under a category. */
export function LabelCard({
  movement,
  buttons,
  more,
  reason,
  onReasonChange,
  failure,
  form,
  onPick,
  onOpenForm,
  onFormNameChange,
  onFormSubmit,
  onFormCancel,
}: LabelCardProps) {
  const { t } = useTranslation();
  const missingPrice = priceNote(movement, t);

  return (
    <Paper bg="dark.6" radius={12} p={{ base: 20, sm: 24 }}>
      {/* The head is a grid, not a wrapping row, so the amount's width (masked or not) never decides where the amount sits. */}
      <div className="dash__label-head">
        <Stack gap={2} miw={0}>
          <Text fw={600} fz={18} lh={1.3}>
            {t(kindKey(movement))}
          </Text>
          <Text size="sm" c="dimmed">
            {formatDate(movement.occurred_at)} · <Sensitive>{formatQuantity(movement.amount)}</Sensitive> {movement.asset}
          </Text>
          {movement.counterparty && (
            <Text size="sm" c="dimmed" className="truncate">
              {movement.counterparty}
            </Text>
          )}
        </Stack>
        <div className="dash__label-amount">
          {movement.usd_value !== null ? (
            <Text
              fz={28}
              fw={700}
              lh={1.1}
              ff="var(--mantine-font-family-headings)"
              style={{ whiteSpace: "nowrap" }}
            >
              <Sensitive>{`${movement.direction === "in" ? "+" : "-"}${formatUsd(abs(movement.usd_value))}`}</Sensitive>
            </Text>
          ) : (
            <Text fz={28} fw={700} lh={1.1} ff="var(--mantine-font-family-headings)" style={{ whiteSpace: "nowrap" }}>
              <Sensitive>{`${movement.direction === "in" ? "+" : "-"}${formatQuantity(abs(movement.amount))}`}</Sensitive>{" "}
              {movement.asset}
            </Text>
          )}
          {missingPrice && (
            <Text size="xs" c="dimmed">
              {missingPrice}
            </Text>
          )}
        </div>
      </div>

      <Group gap="sm" mt="lg" wrap="wrap" aria-label={t("dashboard.queue.categories")}>
        {buttons.map((category) => (
          <Button key={category.id} variant="default" radius="xl" mih={44} onClick={() => onPick(category)}>
            {category.name}
          </Button>
        ))}
        {more.length > 0 && (
          <Select
            aria-label={t("dashboard.card.moreCategories")}
            placeholder={t("dashboard.card.moreCategories")}
            data={more.map((category) => ({ value: String(category.id), label: category.name }))}
            value={null}
            onChange={(value) => {
              const picked = more.find((category) => String(category.id) === value);
              if (picked) {
                onPick(picked);
              }
            }}
            allowDeselect={false}
            w={180}
            styles={{ input: { minHeight: 44, borderRadius: 22 } }}
          />
        )}
        <PrimaryButton onClick={onOpenForm} disabled={form !== undefined}>
          {t("dashboard.card.newCategory")}
        </PrimaryButton>
      </Group>

      {form && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onFormSubmit();
          }}
          style={{ marginTop: 16 }}
        >
          <Stack gap="sm">
            <TextInput
              label={t("dashboard.card.newCategoryLabel")}
              placeholder={t("dashboard.card.newCategoryPlaceholder")}
              value={form.name}
              maxLength={64}
              disabled={form.saving}
              autoFocus
              error={form.error ? t(form.error) : undefined}
              onChange={(event) => onFormNameChange(event.currentTarget.value)}
              styles={{ input: { minHeight: 44 } }}
            />
            <Group gap="sm">
              <PrimaryButton type="submit" loading={form.saving}>
                {t("dashboard.card.createCategory")}
              </PrimaryButton>
              <Button variant="subtle" mih={44} onClick={onFormCancel} disabled={form.saving}>
                {t("dashboard.card.cancel")}
              </Button>
            </Group>
          </Stack>
        </form>
      )}

      <TextInput
        mt="lg"
        label={t("dashboard.card.reasonLabel")}
        placeholder={t("dashboard.card.reasonPlaceholder")}
        value={reason}
        maxLength={500}
        onChange={(event) => onReasonChange(event.currentTarget.value)}
        styles={{
          label: { color: "var(--mantine-color-dark-2)", fontSize: 13, fontWeight: 400, marginBottom: 4 },
          input: { minHeight: 44 },
        }}
      />

      {failure && (
        <Alert color="red" variant="light" mt="md" role="alert">
          <Text size="sm">
            {t("dashboard.card.saveFailed")} {t(failure)}
          </Text>
        </Alert>
      )}
    </Paper>
  );
}
