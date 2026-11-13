import { TagsInput } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { applyTagInput, normaliseTagName, type TagInputResult } from "./names";

interface TagsFieldProps {
  value: string[];
  onChange: (tags: string[]) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  suggestions: readonly string[];
  label: string;
  description: string;
  placeholder: string;
  disabled?: boolean;
  /** A translation key for an error the parent found, such as a pending name it couldn't add. */
  error?: string;
}

/**
 * The tags input of the drawer and the label card. Every change goes through the name rules, so an invalid name or an
 * 11th tag never reaches the parent, and the input says why. The search text is controlled, since a save folds the
 * pending text into the tags.
 */
export function TagsField({
  value,
  onChange,
  searchValue,
  onSearchChange,
  suggestions,
  label,
  description,
  placeholder,
  disabled,
  error,
}: TagsFieldProps) {
  const { t } = useTranslation();
  const [localError, setLocalError] = useState<"invalid" | "limit">();
  const message =
    error ??
    (localError
      ? t(localError === "invalid" ? "movements.drawer.tagInvalid" : "movements.drawer.tagsLimit")
      : undefined);

  // The names a change dropped, so the input can keep them as search text instead of losing them when Mantine clears
  // it. A repeat isn't an error, so it isn't kept.
  function droppedText(items: readonly string[], result: TagInputResult) {
    if (result.error === "invalid") {
      return items.filter((item) => normaliseTagName(item) === undefined);
    }
    if (result.error === "limit") {
      const kept = new Set(result.tags);
      const seen = new Set<string>();
      const overflow: string[] = [];
      for (const item of items) {
        const name = normaliseTagName(item);
        if (name === undefined || seen.has(name)) {
          continue;
        }
        seen.add(name);
        if (!kept.has(name)) {
          overflow.push(item);
        }
      }
      return overflow;
    }
    return [];
  }

  function change(items: string[]) {
    const result = applyTagInput(items);
    setLocalError(result.error);
    onChange(result.tags);
    if (result.error) {
      const pending = droppedText(items, result);
      if (pending.length > 0) {
        // The original handler, not the one below: that one clears the error on every keystroke.
        onSearchChange(pending.join(","));
      }
    }
  }

  return (
    <TagsInput
      label={label}
      description={description}
      placeholder={placeholder}
      data={[...suggestions]}
      value={value}
      searchValue={searchValue}
      onSearchChange={(text) => {
        setLocalError(undefined);
        onSearchChange(text);
      }}
      onChange={change}
      isDuplicate={(item, current) => current.includes(normaliseTagName(item) ?? item)}
      disabled={disabled}
      error={message}
      styles={{ input: { minHeight: 44 } }}
    />
  );
}
