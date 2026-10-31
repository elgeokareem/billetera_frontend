import { Button, Group, Paper, Skeleton, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { isValidCategoryName } from "../categories/api";
import { useCategories, useCreateCategory } from "../categories/hooks";
import { splitCategories } from "../categories/ranking";
import type { Category } from "../categories/types";
import { useMovementTotals, useMovementsList, useUpdateMovement } from "../movements/hooks";
import { NEEDS_LABEL_SEARCH } from "../movements/search";
import { movementCount } from "../movements/spending";
import type { Movement, MovementPatch } from "../movements/types";
import { getApiErrorKey } from "../shared/api-errors";
import { LabelCard, type NewCategoryForm } from "./LabelCard";
import { dashboardQueries, LABEL_CARDS } from "./queries";
import { SectionError } from "./SectionStates";

/** Removes one key from a record, without touching the others. */
function without<T>(record: Record<number, T>, id: number) {
  const copy = { ...record };
  delete copy[id];
  return copy;
}

interface LabelQueueProps {
  now: Date;
  timeZone: string;
}

/**
 * The page's headline and the movements that need a label this month. Saving a label is optimistic: the card leaves at
 * once, the count drops, and the card comes back with the error if the save fails. The typed reason and the new-category
 * form live here rather than in the card, so they survive that.
 */
export function LabelQueue({ now, timeZone }: LabelQueueProps) {
  const { t } = useTranslation();
  const queries = dashboardQueries(now, timeZone);
  const count = useMovementTotals(queries.labelCount);
  const cards = useMovementsList(queries.labelCards);
  const spending = useMovementTotals(queries.spending);
  const categories = useCategories();
  const update = useUpdateMovement();
  const createCategory = useCreateCategory();

  // The cards whose save is in flight, the reasons typed on each card, the last failure of each, and the new-category forms.
  const [saving, setSaving] = useState<ReadonlySet<number>>(() => new Set());
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [failures, setFailures] = useState<Record<number, string>>({});
  const [forms, setForms] = useState<Record<number, NewCategoryForm>>({});

  // A movement in flight is still counted by the server until its save is refetched, so it's taken out here.
  const headline = count.data ? Math.max(0, movementCount(count.data) - saving.size) : null;
  const shown = (cards.data?.movements ?? []).filter((movement) => !saving.has(movement.id));

  const uses = useMemo(() => {
    const byCategory = new Map<number, number>();
    for (const row of spending.data?.assets ?? []) {
      if (row.category_id != null) {
        byCategory.set(row.category_id, (byCategory.get(row.category_id) ?? 0) + row.count);
      }
    }
    return byCategory;
  }, [spending.data]);
  const split = useMemo(
    () => splitCategories(categories.data ?? [], uses),
    [categories.data, uses],
  );

  // Sends a save. The card is hidden while it's in flight, and shown again, with the error, if the save fails.
  async function save(movement: Movement, body: MovementPatch) {
    setSaving((current) => new Set(current).add(movement.id));
    setFailures((current) => without(current, movement.id));
    try {
      await update.mutateAsync({ id: movement.id, body });
      setReasons((current) => without(current, movement.id));
      return true;
    } catch (error) {
      setFailures((current) => ({ ...current, [movement.id]: getApiErrorKey(error) }));
      return false;
    } finally {
      setSaving((current) => {
        const next = new Set(current);
        next.delete(movement.id);
        return next;
      });
    }
  }

  async function categorize(movement: Movement, category: Category) {
    const typed = (reasons[movement.id] ?? "").trim();
    const body: MovementPatch = { category_id: category.id };
    // The reason goes along only when it was typed, and not when it's the one already saved.
    if (typed !== "" && typed !== (movement.reason ?? "")) {
      body.reason = typed;
    }
    if (await save(movement, body)) {
      showUndo(movement, category.name);
    }
  }

  function showUndo(movement: Movement, categoryName: string) {
    const toastId = toast(
      <UndoToast
        message={t("dashboard.card.labelled", { category: categoryName })}
        actionLabel={t("dashboard.card.undo")}
        onUndo={() => {
          toast.dismiss(toastId);
          void undo(movement);
        }}
      />,
      { autoClose: 8000 },
    );
  }

  // Undo clears the category only. A reason that was saved stays, as the backend keeps it.
  async function undo(movement: Movement) {
    try {
      await update.mutateAsync({ id: movement.id, body: { category_id: null } });
      toast.success(t("dashboard.card.undone"));
    } catch (error) {
      toast.error(t(getApiErrorKey(error)));
    }
  }

  function openForm(id: number) {
    setForms((current) => ({ ...current, [id]: { name: "", saving: false } }));
  }

  function changeFormName(id: number, name: string) {
    setForms((current) => ({
      ...current,
      [id]: { ...current[id], name, error: undefined },
    }));
  }

  // Creates the category, then files the movement under it. A refused name keeps the form open with its message.
  async function submitForm(movement: Movement) {
    const form = forms[movement.id];
    if (!form) {
      return;
    }
    if (!isValidCategoryName(form.name)) {
      setForms((current) => ({
        ...current,
        [movement.id]: { ...form, error: "errors.invalidCategoryName" },
      }));
      return;
    }
    setForms((current) => ({ ...current, [movement.id]: { ...form, saving: true, error: undefined } }));
    let category: Category;
    try {
      category = await createCategory.mutateAsync(form.name);
    } catch (error) {
      setForms((current) => ({
        ...current,
        [movement.id]: { name: form.name, saving: false, error: getApiErrorKey(error) },
      }));
      return;
    }
    setForms((current) => without(current, movement.id));
    await categorize(movement, category);
  }

  let cardsContent;
  if (count.isPending || headline === 0) {
    cardsContent = null;
  } else if (count.isError) {
    cardsContent = null;
  } else if (cards.isPending || categories.isPending) {
    cardsContent = (
      <Stack gap="md" role="status" aria-busy="true">
        {[0, 1].map((index) => (
          <Paper key={index} bg="dark.6" radius={12} p={{ base: 20, sm: 24 }}>
            <Skeleton height={24} width="50%" radius="sm" />
            <Skeleton height={16} width="35%" mt="sm" radius="sm" />
            <Skeleton height={44} mt="lg" radius="xl" />
          </Paper>
        ))}
      </Stack>
    );
  } else if (cards.isError) {
    cardsContent = <SectionError error={cards.error} onRetry={() => cards.refetch()} />;
  } else if (categories.isError) {
    cardsContent = <SectionError error={categories.error} onRetry={() => categories.refetch()} />;
  } else {
    cardsContent = (
      <Stack gap="md">
        {shown.map((movement) => (
          <LabelCard
            key={movement.id}
            movement={movement}
            buttons={split.buttons}
            more={split.more}
            reason={reasons[movement.id] ?? movement.reason ?? ""}
            onReasonChange={(value) =>
              setReasons((current) => ({ ...current, [movement.id]: value }))
            }
            failure={failures[movement.id]}
            form={forms[movement.id]}
            onPick={(category) => void categorize(movement, category)}
            onOpenForm={() => openForm(movement.id)}
            onFormNameChange={(name) => changeFormName(movement.id, name)}
            onFormSubmit={() => void submitForm(movement)}
            onFormCancel={() => setForms((current) => without(current, movement.id))}
          />
        ))}
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        {count.isPending ? (
          <Skeleton height={48} width="75%" radius="sm" />
        ) : count.isError ? null : (
          <Title order={1} fz={{ base: 30, sm: 40 }} lh={1.1}>
            {headline === 0
              ? t("dashboard.queue.allLabelled")
              : t("dashboard.queue.headline", { count: headline ?? 0 })}
          </Title>
        )}
        {headline === 0 ? (
          <Text c="dimmed" mt="xs">
            {t("dashboard.queue.nothingLeft")}
          </Text>
        ) : (
          !count.isError && (
            <Text c="dimmed" mt="xs">
              {t("dashboard.queue.subtitle")}
            </Text>
          )
        )}
      </div>

      {count.isError && <SectionError error={count.error} onRetry={() => count.refetch()} />}
      {cardsContent}

      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        {/* "See older" is in every state, including All labelled. It has no count. */}
        <Link to="/movements" search={NEEDS_LABEL_SEARCH} className="quiet-link">
          {t("dashboard.queue.seeOlder")}
        </Link>
        {headline !== null && headline > LABEL_CARDS && (
          <Link
            to="/movements"
            search={{ ...NEEDS_LABEL_SEARCH, from: queries.month.from, to: queries.month.to }}
            className="quiet-link"
          >
            {t("dashboard.queue.reviewAll")}
          </Link>
        )}
      </Group>
    </Stack>
  );
}

function UndoToast({
  message,
  actionLabel,
  onUndo,
}: {
  message: string;
  actionLabel: string;
  onUndo: () => void;
}) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="md">
      <Text size="sm">{message}</Text>
      <Button variant="subtle" size="compact-sm" mih={44} onClick={onUndo}>
        {actionLabel}
      </Button>
    </Group>
  );
}
