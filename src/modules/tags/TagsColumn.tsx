import { ActionIcon, Button, Group, Modal, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { SectionError, SectionSkeleton } from "../dashboard/SectionStates";
import { getApiErrorKey } from "../shared/api-errors";
import { PrimaryButton } from "../shared/components/Buttons";
import { useCreateTag, useDeleteTag, useRecolorTag, useRenameTag, useTags } from "./hooks";
import { newTagNameError } from "./manage";
import { normaliseTagName } from "./names";
import { TagBadge } from "./TagBadge";
import { TagColorPicker } from "./TagColorPicker";
import type { Tag, TagColor } from "./types";

/** A tag being renamed, with the name as typed and the last error. */
interface Renaming {
  id: number;
  name: string;
  error: string | null;
}

/**
 * The tags half of the Categories page: create, rename, delete and recolor tags, with their movement count. A tag's name
 * opens the Movements view filtered by it. Loading, failure and the empty state stay inside the column, so categories
 * keep working.
 */
export function TagsColumn() {
  const { t } = useTranslation();
  const tags = useTags();
  const create = useCreateTag();
  const rename = useRenameTag();
  const recolor = useRecolorTag();
  const remove = useDeleteTag();

  const [name, setName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<Renaming | null>(null);
  const [deleting, setDeleting] = useState<Tag | null>(null);

  /** A duplicate shows as a toast, so the field and the typed name stay to edit; every other problem stays under the field. */
  function reportCreateError(key: string) {
    if (key === "errors.tagExists") {
      toast.error(t(key));
      setCreateError(null);
      return;
    }
    setCreateError(key);
  }

  async function createNamed(value: string) {
    if (create.isPending) {
      return;
    }
    const problem = newTagNameError(value, tags.data ?? []);
    if (problem !== null) {
      reportCreateError(problem);
      return;
    }
    setCreateError(null);
    try {
      await create.mutateAsync(value);
      setName("");
    } catch (error) {
      reportCreateError(getApiErrorKey(error));
    }
  }

  function submitForm(event: FormEvent) {
    event.preventDefault();
    void createNamed(name);
  }

  /** A duplicate stays a toast with the field open; every other failure, including a 404, stays under the field. */
  function reportRenameError(key: string) {
    if (key === "errors.tagExists") {
      toast.error(t(key));
      setRenaming((existing) => (existing ? { ...existing, error: null } : existing));
      return;
    }
    setRenaming((existing) => (existing ? { ...existing, error: key } : existing));
  }

  async function saveRename() {
    if (!renaming || rename.isPending) {
      return;
    }
    const problem = newTagNameError(renaming.name, tags.data ?? [], renaming.id);
    if (problem !== null) {
      reportRenameError(problem);
      return;
    }
    const current = tags.data?.find((tag) => tag.id === renaming.id);
    // A name left as it was is closed without a request.
    if (current && normaliseTagName(renaming.name) === current.name) {
      setRenaming(null);
      return;
    }
    try {
      await rename.mutateAsync({ id: renaming.id, name: renaming.name });
      setRenaming(null);
    } catch (error) {
      reportRenameError(getApiErrorKey(error));
    }
  }

  async function confirmDelete() {
    if (!deleting) {
      return;
    }
    try {
      await remove.mutateAsync(deleting.id);
      toast.success(t("tags.deleted"));
    } catch (error) {
      toast.error(t(getApiErrorKey(error)));
    } finally {
      setDeleting(null);
    }
  }

  async function pickColor(tag: Tag, color: TagColor) {
    if (color === tag.color) {
      return;
    }
    try {
      await recolor.mutateAsync({ id: tag.id, color });
    } catch {
      toast.error(t("tags.color.failed"));
    }
  }

  let body;
  if (tags.isPending) {
    body = <SectionSkeleton lines={4} />;
  } else if (tags.isError) {
    body = <SectionError error={tags.error} onRetry={() => tags.refetch()} />;
  } else if (tags.data.length === 0) {
    body = <EmptyTags />;
  } else {
    body = (
      <Paper bg="dark.6" radius={12} py={4}>
        {tags.data.map((tag, index) => (
          <TagRow
            key={tag.id}
            tag={tag}
            first={index === 0}
            renaming={renaming?.id === tag.id ? renaming : null}
            busy={rename.isPending && renaming?.id === tag.id}
            recoloring={recolor.isPending}
            onRenameChange={(value) =>
              setRenaming((existing) => (existing ? { ...existing, name: value, error: null } : existing))
            }
            onStartRename={() => setRenaming({ id: tag.id, name: tag.name, error: null })}
            onSaveRename={() => void saveRename()}
            onCancelRename={() => setRenaming(null)}
            onDelete={() => setDeleting(tag)}
            onPickColor={(color) => void pickColor(tag, color)}
          />
        ))}
      </Paper>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>{t("tags.title")}</Title>
        <Text c="dimmed" mt="xs">
          {t("tags.subtitle")}
        </Text>
      </div>

      <Paper bg="dark.6" radius={12} p={{ base: 16, sm: 20 }}>
        <form onSubmit={submitForm}>
          <Group align="flex-start" gap="sm" wrap="nowrap">
            <TextInput
              flex={1}
              label={t("tags.newLabel")}
              placeholder={t("tags.newPlaceholder")}
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
              {t("tags.create")}
            </PrimaryButton>
          </Group>
        </form>
      </Paper>

      {body}

      <Modal
        opened={deleting !== null}
        onClose={() => setDeleting(null)}
        title={deleting ? t("tags.delete.title", { name: deleting.name }) : ""}
        centered
      >
        <Stack gap="lg">
          <Stack gap="xs">
            <Text>
              {deleting && deleting.movement_count > 0
                ? t("tags.delete.body", { count: deleting.movement_count })
                : t("tags.delete.bodyNone")}
            </Text>
            <Text>{t("tags.delete.keep")}</Text>
          </Stack>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" radius="xl" mih={44} onClick={() => setDeleting(null)}>
              {t("tags.delete.cancel")}
            </Button>
            <Button color="red" radius="xl" mih={44} loading={remove.isPending} onClick={() => void confirmDelete()}>
              {t("tags.delete.confirm")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

interface TagRowProps {
  tag: Tag;
  first: boolean;
  renaming: Renaming | null;
  busy: boolean;
  recoloring: boolean;
  onRenameChange: (name: string) => void;
  onStartRename: () => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onDelete: () => void;
  onPickColor: (color: TagColor) => void;
}

/** One tag: its color button, its name as a badge that links to its movements, its count, and the rename and delete actions. */
function TagRow({
  tag,
  first,
  renaming,
  busy,
  recoloring,
  onRenameChange,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onDelete,
  onPickColor,
}: TagRowProps) {
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
              aria-label={t("tags.renameLabel")}
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
                {t("tags.save")}
              </PrimaryButton>
              <Button variant="subtle" mih={44} disabled={busy} onClick={onCancelRename}>
                {t("tags.cancel")}
              </Button>
            </Group>
          </Stack>
        </form>
      ) : (
        <>
          <Group gap="sm" wrap="nowrap" align="center" style={{ minWidth: 0, flex: 1 }}>
            <TagColorPicker name={tag.name} color={tag.color} onPick={onPickColor} disabled={recoloring} />
            <Link
              to="/movements"
              search={{ tag: tag.name }}
              aria-label={t("tags.showMovements", { name: tag.name })}
              className="truncate"
              style={{ display: "flex", minWidth: 0, textDecoration: "none" }}
            >
              <TagBadge name={tag.name} color={tag.color} size="lg" />
            </Link>
            <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
              {t("tags.movementCount", { count: tag.movement_count })}
            </Text>
          </Group>

          <Group gap="sm" wrap="nowrap" align="center" style={{ flexShrink: 0 }}>
            <ActionIcon
              variant="default"
              radius="xl"
              size={44}
              aria-label={t("tags.rename", { name: tag.name })}
              onClick={onStartRename}
            >
              <IconPencil size={18} aria-hidden />
            </ActionIcon>
            <ActionIcon
              variant="default"
              radius="xl"
              size={44}
              aria-label={t("tags.delete.action", { name: tag.name })}
              onClick={onDelete}
            >
              <IconTrash size={18} aria-hidden />
            </ActionIcon>
          </Group>
        </>
      )}
    </Group>
  );
}

/** The empty state: no suggestions, just the explanation of what a tag is and where else to create one. */
function EmptyTags() {
  const { t } = useTranslation();

  return (
    <Paper bg="dark.6" radius={12} p={{ base: 20, sm: 28 }}>
      <Stack gap="md" align="flex-start">
        <div>
          <Title order={3} fz={22} lh={1.2}>
            {t("tags.empty.title")}
          </Title>
          <Text c="dimmed" mt="xs">
            {t("tags.empty.body")}
          </Text>
        </div>
      </Stack>
    </Paper>
  );
}
