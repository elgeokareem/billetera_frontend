/** The longest tag name, in code points, the same as the API's. */
export const MAX_TAG_LENGTH = 32;
/** The most tags one movement has, the same as the API's. */
export const MAX_TAGS = 10;

/**
 * The backend's strings.ToLower, which is the Unicode simple lowercase of each code point. The only difference from
 * toLowerCase is İ (U+0130), which the full mapping turns into i plus a combining dot. Mapping one code point at a time
 * also avoids the final-sigma rule.
 */
export function toTagCase(text: string) {
  return Array.from(text, (char) => (char === "İ" ? "i" : char.toLowerCase())).join("");
}

/**
 * A tag name as the API stores it: trimmed, lower case, 1 to 32 code points, with no control character, no lone
 * surrogate and no comma. Undefined when it breaks a rule.
 */
export function normaliseTagName(text: string) {
  const name = toTagCase(text.trim());
  const length = [...name].length;
  if (length < 1 || length > MAX_TAG_LENGTH) {
    return undefined;
  }
  if (/[\p{Cc}\p{Cs},]/u.test(name)) {
    return undefined;
  }
  return name;
}

/** The valid names of a list, each once, in order, and at most 10. */
export function normaliseTags(items: readonly string[]) {
  const tags: string[] = [];
  for (const item of items) {
    const name = normaliseTagName(item);
    if (name !== undefined && !tags.includes(name)) {
      tags.push(name);
      if (tags.length === MAX_TAGS) {
        break;
      }
    }
  }
  return tags;
}

/** What a tags input's onChange gets back: the tags to keep, and the error to show, if any. */
export interface TagInputResult {
  tags: string[];
  error?: "invalid" | "limit";
}

/**
 * The tags an input keeps from the items it was given. An invalid name is dropped, a repeat counts once, and past the
 * 10th tag the rest are dropped. An invalid name is reported before the limit, since it's the one the user must fix.
 */
export function applyTagInput(items: readonly string[]): TagInputResult {
  let invalid = false;
  const valid: string[] = [];
  for (const item of items) {
    const name = normaliseTagName(item);
    if (name === undefined) {
      invalid = true;
    } else if (!valid.includes(name)) {
      valid.push(name);
    }
  }
  const tags = valid.slice(0, MAX_TAGS);
  if (invalid) {
    return { tags, error: "invalid" };
  }
  if (valid.length > MAX_TAGS) {
    return { tags, error: "limit" };
  }
  return { tags };
}

/** The tags after folding in the text still waiting in an input. Blank text changes nothing. */
export function withPendingTag(tags: readonly string[], text: string): TagInputResult {
  if (text.trim() === "") {
    return { tags: [...tags] };
  }
  return applyTagInput([...tags, text]);
}

/** The tags to draw, and the ones the "+N" pill stands for. */
export function visibleTags(tags: readonly string[], max = 3) {
  return { shown: tags.slice(0, max), hidden: tags.slice(max) };
}
