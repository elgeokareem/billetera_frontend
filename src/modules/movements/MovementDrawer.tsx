import { Alert, Drawer, Group, Select, Stack, Text, Textarea } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { type FormEvent, type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import type { Category } from "../categories/types";
import { kindKey, movementTitle, statusNote } from "../dashboard/movementText";
import { PrimaryButton } from "../shared/components/Buttons";
import { Sensitive } from "../shared/components/Sensitive";
import { getApiErrorKey } from "../shared/api-errors";
import { formatDateTime, formatQuantity, formatUsd } from "../shared/format";
import { abs } from "../shared/money";
import { signOf } from "./labels";
import { CoinAmount, UsdValue } from "./MovementParts";
import { draftOf, NO_CATEGORY, type MovementDraft, patchFor } from "./patch";
import { useUpdateMovement } from "./hooks";
import type { Movement } from "./types";

/** The reason's limit, the same as the API's. */
const REASON_LIMIT = 500;

interface MovementDrawerProps {
  /** The movement to show, or null when the drawer is closed. */
  movement: Movement | null;
  categories: readonly Category[] | undefined;
  onClose: () => void;
}

/**
 * The detail of one movement: every field the API has, and the reason and category, which can be changed here. Saving sends
 * only the keys that changed. The drawer is a full width sheet on a narrow screen.
 */
export function MovementDrawer({ movement, categories, onClose }: MovementDrawerProps) {
  const { t } = useTranslation();
  const narrow = useMediaQuery("(max-width: 47.99em)", false, { getInitialValueInEffect: false });
  // The last movement shown is kept while the drawer closes, so its content doesn't vanish during the animation.
  const [shown, setShown] = useState<Movement | null>(movement);
  if (movement !== null && movement !== shown) {
    setShown(movement);
  }

  return (
    <Drawer
      opened={movement !== null}
      onClose={onClose}
      position="right"
      size={narrow ? "100%" : 480}
      padding="lg"
      title={
        <Text fw={600} fz={18} component="span">
          {shown ? movementTitle(shown, t) : ""}
        </Text>
      }
    >
      {shown && (
        // Keyed by the movement, so each one opens with its own values in the form.
        <DrawerForm key={shown.id} movement={shown} categories={categories} onClose={onClose} />
      )}
    </Drawer>
  );
}

function DrawerForm({
  movement,
  categories,
  onClose,
}: {
  movement: Movement;
  categories: readonly Category[] | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const update = useUpdateMovement();
  const [draft, setDraft] = useState<MovementDraft>(() => draftOf(movement));
  const body = patchFor(movement, draft);
  const changed = Object.keys(body).length > 0;
  const categoryData = [
    { value: NO_CATEGORY, label: t("movements.noCategory") },
    ...(categories ?? []).map((category) => ({ value: String(category.id), label: category.name })),
  ];
  const reasonLength = [...draft.reason.trim()].length;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!changed) {
      onClose();
      return;
    }
    try {
      await update.mutateAsync({ id: movement.id, body });
      toast.success(t("movements.drawer.saved"));
      onClose();
    } catch {
      // The error shows in the drawer, and the typed reason stays.
    }
  }

  return (
    <form onSubmit={save}>
      <Stack gap="lg">
        <Stack gap="sm">
          <Text fw={600}>{t("movements.drawer.label")}</Text>
          <Textarea
            label={t("movements.drawer.reason")}
            placeholder={t("movements.drawer.reasonPlaceholder")}
            description={t("movements.drawer.reasonHelp", { count: reasonLength, limit: REASON_LIMIT })}
            value={draft.reason}
            maxLength={REASON_LIMIT}
            autosize
            minRows={2}
            maxRows={6}
            disabled={update.isPending}
            onChange={(event) => {
              // Read now: React clears currentTarget after the event, and an updater runs later.
              const reason = event.currentTarget.value;
              setDraft((current) => ({ ...current, reason }));
            }}
          />
          <Select
            label={t("movements.drawer.category")}
            data={categoryData}
            value={draft.category}
            allowDeselect={false}
            disabled={update.isPending || categories === undefined}
            onChange={(value) => value && setDraft((current) => ({ ...current, category: value }))}
            styles={{ input: { minHeight: 44 } }}
          />
        </Stack>

        {update.isError && (
          <Alert color="red" variant="light" role="alert">
            <Text size="sm">{t("movements.drawer.saveFailed")} {t(getApiErrorKey(update.error))}</Text>
          </Alert>
        )}

        <Group justify="flex-end" gap="sm">
          <PrimaryButton type="submit" disabled={!changed} loading={update.isPending}>
            {t("movements.drawer.save")}
          </PrimaryButton>
        </Group>

        <Stack gap="xs">
          <Text fw={600}>{t("movements.drawer.details")}</Text>
          <Fact label={t("movements.drawer.kind")}>{t(kindKey(movement))}</Fact>
          <Fact label={t("movements.drawer.status")}>{statusNote(movement, t) ?? t(`movements.status.${movement.status}`)}</Fact>
          {movement.source_status && <Fact label={t("movements.drawer.sourceStatus")}>{movement.source_status}</Fact>}
          <Fact label={t("movements.drawer.direction")}>{t(`movements.direction.${movement.direction}`)}</Fact>
          <Fact label={t("movements.drawer.date")}>{formatDateTime(movement.occurred_at)}</Fact>
          <Fact label={t("movements.drawer.amount")}>
            <CoinAmount movement={movement} />
          </Fact>
          <Fact label={t("movements.drawer.usd")}>
            <UsdValue movement={movement} />
          </Fact>
          {movement.counter_amount !== null && movement.counter_asset !== null && (
            <Fact label={t("movements.drawer.counter")}>
              {/* The other side of a trade moves the other way: crypto out is fiat in. */}
              <Sensitive>
                {`${signOf({ direction: movement.direction === "in" ? "out" : "in" })}${formatQuantity(abs(movement.counter_amount))}`}
              </Sensitive>{" "}
              {movement.counter_asset}
            </Fact>
          )}
          {movement.unit_price !== null && (
            <Fact label={t("movements.drawer.unitPrice")}>
              {formatQuantity(movement.unit_price)}
              {movement.counter_asset ? ` ${movement.counter_asset}` : ""}
            </Fact>
          )}
          {movement.fee_amount !== null && movement.fee_asset !== null && (
            <Fact label={t("movements.drawer.fee")}>
              <Sensitive>{formatQuantity(movement.fee_amount)}</Sensitive> {movement.fee_asset}
            </Fact>
          )}
          {movement.fee_usd_value !== null && (
            <Fact label={t("movements.drawer.feeUsd")}>
              <Sensitive>{formatUsd(movement.fee_usd_value)}</Sensitive>
            </Fact>
          )}
          {movement.counterparty && <Fact label={t("movements.drawer.counterparty")}>{movement.counterparty}</Fact>}
          {movement.reason_updated_at && (
            <Fact label={t("movements.drawer.reasonSaved")}>{formatDateTime(movement.reason_updated_at)}</Fact>
          )}
          {movement.usd_price !== null && (
            <Fact label={t("movements.drawer.usdPrice")}>{formatQuantity(movement.usd_price)} USD</Fact>
          )}
          {movement.usd_price_source && (
            <Fact label={t("movements.drawer.priceSource")}>{movement.usd_price_source}</Fact>
          )}
          <Fact label={t("movements.drawer.priceStatus")}>{t(`movements.price.${movement.usd_price_status}`)}</Fact>
          <Fact label={t("movements.drawer.source")}>{movement.source}</Fact>
          <Fact label={t("movements.drawer.externalId")}>{movement.external_id}</Fact>
          <Fact label={t("movements.drawer.id")}>{String(movement.id)}</Fact>
        </Stack>

      </Stack>
    </form>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md" py={6} style={{ borderTop: "1px solid var(--mantine-color-dark-5)" }}>
      <Text fz="sm" c="dimmed" style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Text fz="sm" ta="right" style={{ overflowWrap: "anywhere" }}>
        {children}
      </Text>
    </Group>
  );
}
