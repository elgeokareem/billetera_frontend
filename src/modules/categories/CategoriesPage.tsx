import { ActionIcon, Button, Group, Modal, Paper, SimpleGrid, Skeleton, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { type FormEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { dashboardQueries } from "../dashboard/queries";
import { SectionError, SectionSkeleton } from "../dashboard/SectionStates";
import { useMovementTotals } from "../movements/hooks";
import { type CategorySpending, spendingBreakdown } from "../movements/spending";
import { getApiErrorKey } from "../shared/api-errors";
import { browserTimeZone } from "../shared/dateRange";
import { PrimaryButton } from "../shared/components/Buttons";
import { Sensitive } from "../shared/components/Sensitive";
import { formatUsd } from "../shared/format";
import { TagsColumn } from "../tags/TagsColumn";
import { isValidCategoryName } from "./api";
import { useCategories, useCreateCategory, useDeleteCategory, useRenameCategory } from "./hooks";
import type { Category } from "./types";

/** The categories the empty state offers. They are translated, so they follow the active language. */
const SUGGESTIONS = [
  "categories.suggestions.food",
  "categories.suggestions.rent",
  "categories.suggestions.travel",
  "categories.suggestions.transfer",
] as const;

/** A category being renamed, with the name as typed and the last error. */
interface Renaming {
  id: number;
  name: string;
  error: string | null;
}

/**
 * The categories: create, rename and delete, with this month's spending per category. The spending comes from the same
 * totals call as the Dashboard, so the two always agree. A category's name opens the Movements view filtered by it.
 */
export function CategoriesPage() {
  const { t } = useTranslation();
  // Taken once, as the Dashboard takes it, so both pages ask for the same totals and share the cache.
  const [now] = useState(() => new Date());
  const [timeZone] = useState(browserTimeZone);
  const categories = useCategories();
  const spending = useMovementTotals(dashboardQueries(now, timeZone).spending);
  const create = useCreateCategory();
  const rename = useRenameCategory();
  const remove = useDeleteCategory();

  const [name, setName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<Renaming | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const breakdown = useMemo(
    () => (spending.data ? spendingBreakdown(spending.data.assets) : null),
    [spending.data],
  );
  const byCategory = useMemo(() => {
    const map = new Map<number, CategorySpending>();
    for (const group of breakdown?.categories ?? []) {
      if (group.categoryId !== null) {
        map.set(group.categoryId, group);
      }
    }
    return map;
  }, [breakdown]);

  // Creates a category. A name the rule refuses is caught here, so the server is only asked for a valid one.
  async function createNamed(value: string, clearField: boolean) {
    if (!isValidCategoryName(value)) {
      setCreateError("errors.invalidCategoryName");
      return;
    }
    setCreateError(null);
    try {
      await create.mutateAsync(value.trim());
      if (clearField) {
        setName("");
      }
    } catch (error) {
      setCreateError(getApiErrorKey(error));
    }
  }

  function submitForm(event: FormEvent) {
    event.preventDefault();
    void createNamed(name, true);
  }

  async function saveRename() {
    if (!renaming) {
      return;
    }
    const next = renaming.name.trim();
    if (!isValidCategoryName(next)) {
      setRenaming({ ...renaming, error: "errors.invalidCategoryName" });
      return;
    }
    const current = categories.data?.find((category) => category.id === renaming.id);
    // A name left as it was is closed without a request.
    if (current && current.name === next) {
      setRenaming(null);
      return;
    }
    try {
      await rename.mutateAsync({ id: renaming.id, name: next });
      setRenaming(null);
    } catch (error) {
      setRenaming((existing) => (existing ? { ...existing, error: getApiErrorKey(error) } : existing));
    }
  }

  async function confirmDelete() {
    if (!deleting) {
      return;
    }
    try {
      await remove.mutateAsync(deleting.id);
      toast.success(t("categories.deleted"));
    } catch (error) {
      toast.error(t(getApiErrorKey(error)));
    } finally {
      setDeleting(null);
    }
  }

  let body;
  if (categories.isPending) {
    body = <SectionSkeleton lines={4} />;
  } else if (categories.isError) {
    body = <SectionError error={categories.error} onRetry={() => categories.refetch()} />;
  } else if (categories.data.length === 0) {
    body = (
      <EmptyCategories
        busy={create.isPending}
        onPick={(key) => void createNamed(t(key), false)}
      />
    );
  } else {
    body = (
      <Paper bg="dark.6" radius={12} py={4}>
        {categories.data.map((category, index) => (
          <CategoryRow
            key={category.id}
            category={category}
            first={index === 0}
            spending={spending}
            group={byCategory.get(category.id)}
            renaming={renaming?.id === category.id ? renaming : null}
            onRenameChange={(value) => setRenaming((existing) => (existing ? { ...existing, name: value, error: null } : existing))}
            onStartRename={() => setRenaming({ id: category.id, name: category.name, error: null })}
            onSaveRename={() => void saveRename()}
            onCancelRename={() => setRenaming(null)}
            busy={rename.isPending && renaming?.id === category.id}
            onDelete={() => setDeleting(category)}
          />
        ))}
      </Paper>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={1} fz={{ base: 30, sm: 40 }} lh={1.1}>
          {t("categories.title")}
        </Title>
        <Text c="dimmed" mt="xs">
          {t("categories.subtitle")}
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" style={{ alignItems: "start" }}>
        <Stack gap="lg">
          <div>
            <Title order={2}>{t("categories.columnTitle")}</Title>
            <Text c="dimmed" mt="xs">
              {t("categories.columnSubtitle")}
            </Text>
          </div>

          <Paper bg="dark.6" radius={12} p={{ base: 16, sm: 20 }}>
            <form onSubmit={submitForm}>
              <Group align="flex-start" gap="sm" wrap="nowrap">
                <TextInput
                  flex={1}
                  label={t("categories.newLabel")}
                  placeholder={t("categories.newPlaceholder")}
                  value={name}
                  disabled={create.isPending}
                  error={createError ? t(createError) : undefined}
                  onChange={(event) => {
                    setName(event.currentTarget.value);
                    setCreateError(null);
                  }}
                  styles={{ input: { minHeight: 44 } }}
                />
                <PrimaryButton type="submit" loading={create.isPending} mt={26}>
                  {t("categories.create")}
                </PrimaryButton>
              </Group>
            </form>
          </Paper>

          {body}
        </Stack>

        <TagsColumn />
      </SimpleGrid>

      <Modal
        opened={deleting !== null}
        onClose={() => setDeleting(null)}
        title={deleting ? t("categories.delete.title", { name: deleting.name }) : ""}
        centered
      >
        <Stack gap="lg">
          <Text>{t("categories.delete.body")}</Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" radius="xl" mih={44} onClick={() => setDeleting(null)}>
              {t("categories.delete.cancel")}
            </Button>
            <Button color="red" radius="xl" mih={44} loading={remove.isPending} onClick={() => void confirmDelete()}>
              {t("categories.delete.confirm")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

interface CategoryRowProps {
  category: Category;
  first: boolean;
  spending: ReturnType<typeof useMovementTotals>;
  group: CategorySpending | undefined;
  renaming: Renaming | null;
  busy: boolean;
  onRenameChange: (name: string) => void;
  onStartRename: () => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onDelete: () => void;
}

/** One category: its name, what it cost this month, and the rename and delete actions. */
function CategoryRow({
  category,
  first,
  spending,
  group,
  renaming,
  busy,
  onRenameChange,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onDelete,
}: CategoryRowProps) {
  const { t } = useTranslation();

  return (
    <Group
      justify="space-between"
      align="center"
      wrap="nowrap"
      gap="md"
      px={{ base: 16, sm: 20 }}
      py={12}
      style={first ? undefined : { borderTop: "1px solid var(--mantine-color-dark-5)" }}
    >
      {renaming ? (
        <form
          style={{ flex: 1, minWidth: 0 }}
          onSubmit={(event) => {
            event.preventDefault();
            onSaveRename();
          }}
        >
          <Stack gap="xs">
            <TextInput
              aria-label={t("categories.renameLabel")}
              value={renaming.name}
              disabled={busy}
              autoFocus
              error={renaming.error ? t(renaming.error) : undefined}
              onChange={(event) => onRenameChange(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  onCancelRename();
                }
              }}
              styles={{ input: { minHeight: 44 } }}
            />
            <Group gap="sm">
              <PrimaryButton type="submit" size="sm" loading={busy}>
                {t("categories.save")}
              </PrimaryButton>
              <Button variant="subtle" mih={44} disabled={busy} onClick={onCancelRename}>
                {t("categories.cancel")}
              </Button>
            </Group>
          </Stack>
        </form>
      ) : (
        <Link
          to="/movements"
          search={{ category_id: String(category.id) }}
          className="truncate"
          style={{ minWidth: 0, flex: 1, fontWeight: 500 }}
        >
          {category.name}
        </Link>
      )}

      {!renaming && (
        <Group gap="sm" wrap="nowrap" align="center" style={{ flexShrink: 0 }}>
          <SpendingCell spending={spending} group={group} />
          <ActionIcon
            variant="default"
            radius="xl"
            size={44}
            aria-label={t("categories.rename", { name: category.name })}
            onClick={onStartRename}
          >
            <IconPencil size={18} aria-hidden />
          </ActionIcon>
          <ActionIcon
            variant="default"
            radius="xl"
            size={44}
            aria-label={t("categories.delete.action", { name: category.name })}
            onClick={onDelete}
          >
            <IconTrash size={18} aria-hidden />
          </ActionIcon>
        </Group>
      )}
    </Group>
  );
}

/**
 * This month's spending in the category. A category with no spending shows zero. A category whose rows are all unpriced
 * shows "No price", and the rows that have no price are counted under it.
 */
function SpendingCell({ spending, group }: { spending: ReturnType<typeof useMovementTotals>; group: CategorySpending | undefined }) {
  const { t } = useTranslation();

  if (spending.isPending) {
    return <Skeleton height={16} width={70} radius="sm" />;
  }
  if (spending.isError) {
    return <Text size="sm" c="dimmed">—</Text>;
  }
  return (
    <Stack gap={2} align="flex-end">
      <Text fz="sm" fw={500} style={{ whiteSpace: "nowrap" }}>
        {group && group.usd === null ? (
          t("dashboard.recent.noPrice")
        ) : (
          <Sensitive>{formatUsd(group ? group.usd : "0")}</Sensitive>
        )}
      </Text>
      {group && group.unpricedCount > 0 && (
        <Text fz="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
          {t("categories.notPriced", { count: group.unpricedCount })}
        </Text>
      )}
    </Stack>
  );
}

/** The empty state: a prompt to create a first category, with the usual ones to pick from. */
function EmptyCategories({ busy, onPick }: { busy: boolean; onPick: (key: string) => void }) {
  const { t } = useTranslation();

  return (
    <Paper bg="dark.6" radius={12} p={{ base: 20, sm: 28 }}>
      <Stack gap="md" align="flex-start">
        <div>
          <Title order={2} fz={22} lh={1.2}>
            {t("categories.empty.title")}
          </Title>
          <Text c="dimmed" mt="xs">
            {t("categories.empty.body")}
          </Text>
        </div>
        <Text size="sm" fw={500}>
          {t("categories.empty.suggestions")}
        </Text>
        <Group gap="sm">
          {SUGGESTIONS.map((key) => (
            <Button key={key} variant="default" radius="xl" mih={44} disabled={busy} onClick={() => onPick(key)}>
              {t(key)}
            </Button>
          ))}
        </Group>
      </Stack>
    </Paper>
  );
}
