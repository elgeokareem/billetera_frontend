import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Sensitive } from "../shared/components/Sensitive";
import { formatUsd } from "../shared/format";
import { compare } from "../shared/money";
import { TagPills } from "../tags/TagPills";
import { TagsField } from "../tags/TagsField";
import type { CategoryOption } from "./drawerCategories";
import { SplitBar, type BarPart } from "./SplitBar";
import {
  canSplit,
  draftRest,
  MAX_SPLITS,
  nextSplitKey,
  normaliseSplitAmount,
  SPLIT_COLORS,
  splitLimit,
  splitSum,
  type SplitDraft,
  type SplitDraftErrors,
} from "./splits";
import type { Movement } from "./types";

interface SplitSectionProps {
  movement: Movement;
  parts: SplitDraft[];
  onPartsChange: (parts: SplitDraft[]) => void;
  /** The name of the draft's rest category, or "No category". */
  restCategoryName: string;
  /** The categories a part can use: the loaded ones plus those created in this drawer, without "No category". */
  categoryOptions: readonly CategoryOption[];
  /** The row errors of the last save attempt. */
  errors: SplitDraftErrors;
  disabled?: boolean;
  /** The categories haven't loaded, so a part's select waits. */
  categoriesLoading?: boolean;
  knownTags: readonly string[];
  /** Incremented by a save attempt, so the first bad field gets focus. */
  focusNonce?: number;
  /** Pending-tag errors by part key, from the drawer's save. */
  tagErrors?: Readonly<Record<number, string>>;
  onClearTagError?: (key: number) => void;
}

/**
 * The drawer's split editor: the parts of a movement, each with its category, USD amount and tags, the bar and summary,
 * and the notes of an unpriced movement. The drawer owns the draft; every change goes back through onPartsChange.
 */
export function SplitSection({
  movement,
  parts,
  onPartsChange,
  restCategoryName,
  categoryOptions,
  errors,
  disabled = false,
  categoriesLoading = false,
  knownTags,
  focusNonce = 0,
  tagErrors,
  onClearTagError,
}: SplitSectionProps) {
  const { t } = useTranslation();
  const narrow = useMediaQuery("(max-width: 47.99em)", false, {
    getInitialValueInEffect: false,
  });
  const categoryRefs = useRef(new Map<number, HTMLInputElement | null>());
  const amountRefs = useRef(new Map<number, HTMLInputElement | null>());
  const lastFocus = useRef(0);

  // Focus the first bad field after a save attempt, as B3 asks. Only a new attempt moves the focus; typing doesn't.
  useEffect(() => {
    if (!focusNonce || focusNonce === lastFocus.current) {
      return;
    }
    lastFocus.current = focusNonce;
    for (const [index, part] of parts.entries()) {
      const row = errors.rows[index];
      if (row?.category) {
        categoryRefs.current.get(part.key)?.focus();
        return;
      }
      if (row?.amount) {
        amountRefs.current.get(part.key)?.focus();
        return;
      }
    }
  }, [focusNonce, errors, parts]);

  const editable = canSplit(movement);
  const value = movement.usd_value;
  const limit = value === null ? "0" : splitLimit(value);
  const rest = draftRest(value, parts);
  const over =
    value !== null && compare(splitSum(parts), limit) > 0
      ? { sum: splitSum(parts), limit }
      : undefined;

  function categoryName(category: string) {
    if (category === "") {
      return t("movements.noCategory");
    }
    return (
      categoryOptions.find((option) => option.value === category)?.label ??
      t("movements.categoryUnknown")
    );
  }

  function updatePart(key: number, changes: Partial<SplitDraft>) {
    onPartsChange(
      parts.map((part) => (part.key === key ? { ...part, ...changes } : part)),
    );
  }

  function removePart(key: number) {
    onPartsChange(parts.filter((part) => part.key !== key));
  }

  function addPart() {
    onPartsChange([
      ...parts,
      {
        key: nextSplitKey(parts),
        category: "",
        amount: "",
        tags: [],
        tagText: "",
      },
    ]);
  }

  // A part whose category was deleted asks for one as soon as the drawer opens, not only after a save.
  function categoryError(part: SplitDraft, index: number) {
    const error = errors.rows[index]?.category;
    if (error) {
      return t(error);
    }
    return part.category === "" && part.missingCategory
      ? t("movements.split.pickCategory")
      : undefined;
  }

  if (!editable) {
    return (
      <Stack gap="sm">
        <Text fw={600}>{t("movements.split.title")}</Text>
        <Text size="sm" c="dimmed">
          {value === null ? t("movements.split.unpriced") : t("movements.split.zero")}
        </Text>
        {parts.length > 0 && (
          <>
            <Stack gap="sm">
              {parts.map((part) => (
                <Stack key={part.key} gap={4}>
                  <Group justify="space-between" gap="md" wrap="nowrap">
                    <Text size="sm">{categoryName(part.category)}</Text>
                    <Text size="sm" fw={500} style={{ whiteSpace: "nowrap" }}>
                      <Sensitive>{formatUsd(normaliseSplitAmount(part.amount))}</Sensitive>
                    </Text>
                  </Group>
                  {part.tags.length > 0 && <TagPills tags={part.tags} />}
                </Stack>
              ))}
            </Stack>
            <Text size="sm" c="dimmed">
              {t("movements.split.unpricedParts")}
            </Text>
            <Group>
              <Button
                type="button"
                variant="subtle"
                color="red"
                radius="xl"
                mih={44}
                disabled={disabled}
                onClick={() => onPartsChange([])}
              >
                {t("movements.split.removeAll")}
              </Button>
            </Group>
          </>
        )}
      </Stack>
    );
  }

  const barParts: BarPart[] = parts.flatMap((part, index) => {
    const amount = normaliseSplitAmount(part.amount);
    if (amount === undefined) {
      return [];
    }
    return [
      {
        key: part.key,
        name: categoryName(part.category),
        amount,
        color: SPLIT_COLORS[index % SPLIT_COLORS.length],
      },
    ];
  });

  return (
    <Stack gap="sm">
      <Text fw={600}>{t("movements.split.title")}</Text>
      {movement.split_status === "exceeds" && (
        <Alert color="yellow" variant="light" title={t("movements.split.exceedsTitle")}>
          <Text size="sm">{t("movements.split.exceedsBody")}</Text>
        </Alert>
      )}
      {parts.length === 0 ? (
        <>
          <Text size="sm" c="dimmed">
            {t("movements.split.intro")}
          </Text>
          <Group>
            <Button
              type="button"
              variant="subtle"
              radius="xl"
              mih={44}
              disabled={disabled}
              onClick={addPart}
            >
              {t("movements.split.start")}
            </Button>
          </Group>
        </>
      ) : (
        <>
          <Stack gap="md">
            {parts.map((part, index) => (
              <Stack key={part.key} gap="xs">
                <Box
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                    flexWrap: narrow ? "wrap" : "nowrap",
                  }}
                >
                  <Select
                    ref={(node) => {
                      categoryRefs.current.set(part.key, node);
                    }}
                    aria-label={`${t("movements.split.category")} ${index + 1}`}
                    placeholder={t("movements.split.category")}
                    data={[...categoryOptions]}
                    value={part.category === "" ? null : part.category}
                    allowDeselect={false}
                    disabled={disabled || categoriesLoading}
                    error={categoryError(part, index)}
                    onChange={(next) =>
                      updatePart(part.key, {
                        category: next ?? "",
                        missingCategory: undefined,
                      })
                    }
                    style={{ flex: narrow ? "1 1 100%" : 1, minWidth: 0 }}
                    styles={{ input: { minHeight: 44 } }}
                  />
                  <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                    <TextInput
                      ref={(node) => {
                        amountRefs.current.set(part.key, node);
                      }}
                      aria-label={`${t("movements.split.amount")} ${index + 1}`}
                      placeholder="0.00"
                      leftSection="$"
                      inputMode="decimal"
                      value={part.amount}
                      disabled={disabled}
                      error={
                        errors.rows[index]?.amount
                          ? t(errors.rows[index].amount)
                          : undefined
                      }
                      onChange={(event) =>
                        updatePart(part.key, {
                          amount: event.currentTarget.value,
                        })
                      }
                      w={140}
                      styles={{ input: { minHeight: 44 } }}
                    />
                    <ActionIcon
                      type="button"
                      variant="subtle"
                      color="red"
                      radius="xl"
                      size={44}
                      aria-label={t("movements.split.remove", { n: index + 1 })}
                      disabled={disabled}
                      onClick={() => removePart(part.key)}
                    >
                      <IconTrash size={18} aria-hidden />
                    </ActionIcon>
                  </Group>
                </Box>
                <TagsField
                  label={t("movements.split.partTags")}
                  description={t("movements.drawer.tagsHelp")}
                  placeholder={t("movements.drawer.tagsPlaceholder")}
                  suggestions={knownTags}
                  value={part.tags}
                  searchValue={part.tagText}
                  onSearchChange={(text) => {
                    updatePart(part.key, { tagText: text });
                    onClearTagError?.(part.key);
                  }}
                  onChange={(tags) => {
                    updatePart(part.key, { tags });
                    onClearTagError?.(part.key);
                  }}
                  disabled={disabled}
                  error={
                    tagErrors?.[part.key] ? t(tagErrors[part.key]) : undefined
                  }
                />
              </Stack>
            ))}
          </Stack>
          <Group gap="sm" wrap="wrap">
            <Button
              type="button"
              variant="subtle"
              radius="xl"
              mih={44}
              disabled={disabled || parts.length >= MAX_SPLITS}
              onClick={addPart}
            >
              {t("movements.split.add")}
            </Button>
            {parts.length >= MAX_SPLITS && (
              <Text size="xs" c="dimmed">
                {t("movements.split.limit")}
              </Text>
            )}
          </Group>
          {value !== null && (
            <SplitBar
              value={value}
              parts={barParts}
              rest={rest}
              restName={restCategoryName}
              over={over}
            />
          )}
        </>
      )}
    </Stack>
  );
}
