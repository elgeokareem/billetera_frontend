import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { getApiErrorKey } from "../shared/api-errors";
import { Sensitive } from "../shared/components/Sensitive";
import { formatDateTime, formatQuantity } from "../shared/format";
import { KIND_KEYS } from "./labels";
import { ReviewBadge } from "./MovementParts";
import { useUpdateMovement } from "./hooks";
import {
  actionPatch,
  reviewActions,
  type ReviewAction,
} from "./review";
import type { Detection, DetectionRule, Movement } from "./types";

interface DetectionSectionProps {
  movement: Movement;
  /** The PATCH response, so the drawer and the list show the new review state. */
  onUpdated: (movement: Movement) => void;
  /** A dismissed row: the page closes the drawer and shows the Undo toast. */
  onDismissed: (movement: Movement) => void;
}

function actionKey(action: ReviewAction) {
  return action.type === "kind" ? `kind:${action.kind}` : action.type;
}

function hintKey(rule: DetectionRule, direction: Movement["direction"]) {
  switch (rule) {
    case "unexplained_drop":
      return "movements.detection.hint.unexplainedDrop";
    case "round_amount":
      return "movements.detection.hint.roundAmount";
    case "copy_pair":
      return direction === "in"
        ? "movements.detection.hint.copyPairIn"
        : "movements.detection.hint.copyPairOut";
    case "unexplained_gain":
      return "movements.detection.hint.unexplainedGain";
  }
}

/** The same day shows the end as a time only, as the balance moved within a few minutes. */
function windowEndText(detection: Detection, language: string) {
  const start = new Date(detection.window_start);
  const end = new Date(detection.window_end);
  if (start.toDateString() !== end.toDateString()) {
    return formatDateTime(detection.window_end);
  }
  return new Intl.DateTimeFormat(language, { timeStyle: "short" }).format(end);
}

/**
 * What the detector found and the four quick decisions: card spend, copy trading, other transfer, dismiss or restore.
 * Its buttons are outside the drawer form's Save: each one is its own PATCH, so the typed reason and tags stay.
 */
export function DetectionSection({ movement, onUpdated, onDismissed }: DetectionSectionProps) {
  const { t, i18n } = useTranslation();
  const update = useUpdateMovement();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const detection = movement.detection;
  if (!detection) {
    return null;
  }

  const actions = reviewActions(movement);
  const busy = pending !== null;
  const amount = formatQuantity(movement.amount);
  const wallet = t(`movements.detection.wallet.${detection.wallet}`);

  async function run(action: ReviewAction) {
    const body = actionPatch(movement, action);
    if (!body) {
      return;
    }
    setPending(actionKey(action));
    setError(null);
    try {
      const updated = await update.mutateAsync({ id: movement.id, body });
      if (action.type === "dismiss") {
        onDismissed(updated);
        return;
      }
      onUpdated(updated);
      toast.success(
        action.type === "restore"
          ? t("movements.detection.restored")
          : t("movements.detection.savedAs", { kind: t(KIND_KEYS[updated.kind]) }),
      );
    } catch (cause) {
      setError(cause);
    } finally {
      setPending(null);
    }
  }

  return (
    <Stack gap="sm">
      <Group gap="xs" wrap="wrap">
        <Text fw={600}>{t("movements.detection.title")}</Text>
        <ReviewBadge movement={movement} />
      </Group>
      <Text size="sm">
        <Trans
          i18nKey={
            movement.direction === "out" ? "movements.detection.down" : "movements.detection.up"
          }
          values={{
            wallet,
            asset: movement.asset,
            from: formatDateTime(detection.window_start),
            to: windowEndText(detection, i18n.language),
          }}
          components={{ amount: <Sensitive>{amount}</Sensitive> }}
        />
      </Text>
      <Text size="sm" c="dimmed">
        {t(hintKey(detection.rule, movement.direction))}{" "}
        {t(`movements.detection.confidence.${detection.confidence}`)}
      </Text>

      {actions.conflict && (
        <Alert color="yellow" variant="light" title={t("movements.detection.conflictTitle")}>
          <Stack gap="sm">
            <Text size="sm">{t("movements.detection.conflictBody")}</Text>
            <Group gap="sm">
              <Button
                type="button"
                variant="default"
                radius="xl"
                mih={44}
                disabled={busy}
                loading={pending === "keep"}
                onClick={() => void run({ type: "keep" })}
              >
                {t("movements.detection.keep")}
              </Button>
              <Button
                type="button"
                variant="subtle"
                color="red"
                radius="xl"
                mih={44}
                disabled={busy}
                loading={pending === "dismiss"}
                onClick={() => void run({ type: "dismiss" })}
              >
                {t("movements.detection.dismiss")}
              </Button>
            </Group>
          </Stack>
        </Alert>
      )}

      <Text fw={600}>{t("movements.detection.question")}</Text>
      <Group gap="sm" wrap="wrap">
        {actions.kinds.map((action) => {
          const label = t(KIND_KEYS[action.kind]);
          return (
            <Button
              key={action.kind}
              type="button"
              variant={action.confirmed ? "filled" : "default"}
              color="accent"
              radius="xl"
              mih={44}
              disabled={busy || action.disabled}
              loading={pending === `kind:${action.kind}`}
              onClick={() => void run({ type: "kind", kind: action.kind })}
            >
              {action.current && !action.confirmed ? `${label} ?` : label}
            </Button>
          );
        })}
        {actions.canDismiss && (
          <Button
            type="button"
            variant="subtle"
            color="red"
            radius="xl"
            mih={44}
            disabled={busy}
            loading={pending === "dismiss"}
            onClick={() => void run({ type: "dismiss" })}
          >
            {t("movements.detection.dismiss")}
          </Button>
        )}
        {actions.canRestore && (
          <Button
            type="button"
            variant="default"
            radius="xl"
            mih={44}
            disabled={busy}
            loading={pending === "restore"}
            onClick={() => void run({ type: "restore" })}
          >
            {t("movements.detection.restore")}
          </Button>
        )}
      </Group>

      {error !== null && (
        <Alert color="red" variant="light" role="alert">
          <Text size="sm">{t(getApiErrorKey(error))}</Text>
        </Alert>
      )}
    </Stack>
  );
}
