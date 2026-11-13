---
title: "Implementation Plan: Movement Tags"
change: movement-tags-1
type: feature
spec: ./SPEC.md
issue: none
created: 2026-11-13
updated: 2026-11-13
sdd_version: 7.3.0
---

# Implementation Plan: Movement Tags

**Spec:** [SPEC.md](./SPEC.md). The behaviour, the name rules, the texts (EN and ES), the acceptance criteria and the test list are there. This plan gives the order, the files and the checks. Don't repeat the SPEC in code comments; follow the module's existing comment style.

Rules for every phase:
- Never commit. Never open, read, `cat`, `grep` or print `.env` or any `.env.*` file.
- Change only the files the phase lists. If something else seems to need a change, stop and say so in the report.
- Don't edit `src/modules/shared/api-schema.d.ts` (generated, already regenerated and uncommitted) and don't run `pnpm api:generate`.
- Don't touch `specs/INDEX.md` or `specs/ROADMAP.md`.
- No new dependency. Mantine 9 (`TagsInput`, `Pill`, `UnstyledButton`, `Checkbox`), TanStack Query, `react-toastify` and `react-i18next` are already there.
- Money stays decimal strings. Nothing here does arithmetic on amounts.
- Tests are vitest, pure functions, run with the pinned `TZ=America/Santiago` from `vite.config.ts`. There's no React Testing Library, so components are checked by hand (Phase 7).
- Each phase ends with `pnpm lint && pnpm test && pnpm build`, all passing, and a report of `git status --short`.
- [Open Question 1](./SPEC.md#open-questions) only affects Phase 4's click handler. [Open Question 2](./SPEC.md#open-questions) only affects the Spanish texts. Use the SPEC's provisional texts until answered.

## Phases

| # | Phase | Files | Approx. lines |
|---|-------|-------|---------------|
| 1 | Build fix, name rules, `GET /tags`, error texts | 12 | 250 |
| 2 | Fake API | 1 | 220 |
| 3 | URL filter and chips | 8 | 300 |
| 4 | Pills in the table and cards | 8 | 180 |
| 5 | Drawer editing | 7 | 260 |
| 6 | Dashboard label cards | 6 | 200 |
| 7 | Manual check and Implementation State | 1 (this plan) | 30 |

Phases 3 to 6 depend on 1. Phase 2 is independent, but it must land before the manual checks of 3 to 6. Phase 6 reuses `TagsField`, made in Phase 5.

## Phase 1. Build fix, name rules, `GET /tags`, error texts

Goal: `pnpm build` is green again, and the tag rules exist and are tested.

| File | Change |
|------|--------|
| `src/modules/dashboard/movementText.test.ts` | Add `tags: []` to the `movement()` fixture |
| `src/modules/movements/hooks.test.ts` | Add `tags: []` to the `movement()` fixture |
| `src/modules/tags/names.ts` | New: `MAX_TAG_LENGTH`, `MAX_TAGS`, `toTagCase`, `normaliseTagName`, `normaliseTags`, `applyTagInput`, `withPendingTag` (SPEC "Data layer") |
| `src/modules/tags/names.test.ts` | New: the `names.test.ts` row of the SPEC's test table, minus `visibleTags` (Phase 4) |
| `src/modules/tags/types.ts` | New: `Tag` |
| `src/modules/tags/api.ts` | New: `fetchTags` |
| `src/modules/tags/hooks.ts` | New: `tagKeys`, `useTags` |
| `src/modules/movements/hooks.ts` | `useUpdateMovement`'s `onSettled` invalidates `movementKeys.all` and `tagKeys.all` (`Promise.all`, like `useDeleteCategory`) |
| `src/modules/shared/api-errors.ts` | Two `KNOWN_ERRORS` entries |
| `src/modules/shared/helpers.test.ts` | Two `getApiErrorKey` cases |
| `src/locales/en.json`, `src/locales/es.json` | `errors.invalidTag`, `errors.tooManyTags` |

Notes:
- `toTagCase` is the exact snippet in the SPEC. `normaliseTagName` checks `[...name].length` between 1 and 32, and none of `/\p{Cc}/u`, `/\p{Cs}/u`, `,`.
- `applyTagInput` reports `invalid` before `limit` when both happen.
- Keep `src/modules/tags/hooks.ts` free of imports from `movements/`, so `movements/hooks.ts` can import `tagKeys` without a cycle.

Checks: `pnpm lint && pnpm test && pnpm build`. The build must pass now; it fails before this phase.

## Phase 2. Fake API

Goal: `pnpm fake-api` answers the tag contract of `../backend/README.md`, so Phases 3 to 6 can be checked by hand.

| File | Change |
|------|--------|
| `scripts/fake-api.mjs` | Tags on movements, `GET /tags`, PATCH `tags`, `tag`/`tag_match` filters, CSV column, seed tags, header comment |

Steps:
1. A `normalizeTagName(text)` mirroring the backend's `NormalizeName` (trim, lower-case per code point with the `İ` rule, 1 to 32 code points, no `\p{Cc}`, no comma). It may share no code with `src/` (the script is dependency-free Node).
2. Movements get `tags: []` in `addMovement` (`spec.tags ?? []`, normalised and sorted). `movementJson` emits `tags` right after `category_id`, sorted.
3. `parsePatch`: `body.tags` counts as a key. Validate after `reason` and `category_id`: not an array, `null` or a non-string item is `invalid tag`; any item failing the rule is `invalid tag`; dedupe; more than 10 is `too many tags`. `patchMovement` sets the tags after the category check passes, so a 404 changes nothing.
4. `GET /tags`: the account's distinct tags across movements of any status, sorted by name, with `movement_count`. Add `"GET /tags"` to `FAIL_ROUTES` and to the route table, with the 401 handling the other authenticated routes have.
5. Filters: add `"tag"` and `"tag_match"` to `LIST_PARAMS`, `TOTALS_PARAMS` and `EXPORT_PARAMS`. In `parseMovementFilter`, `list(params, "tag", (item) => normalizeTagName(item) !== null)` gives `invalid tag`, and `tag_match` is read with `single` like `asset_match` (`any` or `all`, else `invalid tag_match`). `matchesFilter`: `any` needs one of the distinct names, `all` needs every one. The totals and export reuse `matchesFilter`, so a movement counts once.
6. `CSV_HEADER` appends `"tags"`, and the row appends the names joined by `", "` through the existing cell escaping.
7. Seed: in `addSeedMovements`, give a few populated movements tags, for example `trip-2026` on the Travel ones, `shared` on some Food ones, and one movement with 5 tags so `+2` shows. Keep every existing number in the header comment true (counts, labelled and unlabelled movements are unchanged).
8. Update the header comment: the new route, the tag rules, and the seed tags.

Checks:
- `node --check scripts/fake-api.mjs`, then `pnpm lint && pnpm test && pnpm build`.
- With `pnpm fake-api` running, report the output of:
  - `GET /tags` after login (cookie from `POST /auth/login`);
  - `PATCH /movements/<id>` with `{"tags":["Trip-2026","shared"]}` and Origin `http://localhost:5173` → `["shared","trip-2026"]`;
  - `{"tags":["a,b"]}` → 400 `invalid tag`; 11 names → 400 `too many tags`; `{"tags":null}` → 400 `invalid tag`;
  - `GET /movements?tag=trip-2026,shared&tag_match=all`, `?tag=` → 400 `invalid tag`, `?tag=a&tag_match=some` → 400 `invalid tag_match`;
  - `GET /movements/export?tag=trip-2026`: last header column is `tags`.

## Phase 3. URL filter and chips

Goal: `tag` and `tag_match` in the URL, the filter group, the chips, and the request.

| File | Change |
|------|--------|
| `src/modules/movements/search.ts` | `tag`, `tag_match` in `MovementsSearch`, `parseMovementsSearch`, `toMovementsQuery`, `FILTER_KEYS`; `tagNames`; `withList` accepts `"tag"` and drops `tag_match` when empty; `withoutKey("tag")` drops `tag_match` |
| `src/modules/movements/search.test.ts` | The `search.test.ts` row of the SPEC's test table |
| `src/modules/movements/chips.ts` | Tag chips and the "All tags" chip, after categories, before dates |
| `src/modules/movements/FilterChips.test.ts` | The `FilterChips.test.ts` row |
| `src/modules/movements/MovementFilters.tsx` | New prop `knownTags: readonly string[]`. A `FilterGroup` after Category with a `TagsInput` (`data={knownTags}`, `value={listItems(search.tag)}`, `onChange` → `withList(search, "tag", items)`, `clearable`) and the "Match all tags" `Checkbox` (`checked={search.tag_match === "all"}`, `disabled={!search.tag}`) |
| `src/modules/movements/MovementsPage.tsx` | `const tags = useTags();` and a memoised `knownTags = tags.data?.map((tag) => tag.name) ?? []`, passed to `MovementFilters`. No error UI for tags |
| `src/locales/en.json`, `src/locales/es.json` | `movements.filters.tag`, `tagPlaceholder`, `tagMatch`, `movements.chips.tagMatch` |

Notes:
- `withList` already calls `unique`; for `"tag"` call `tagNames(items)` first.
- Order the `put` calls in `parseMovementsSearch` so `tag_match` is read after `tag`, as `asset_match` is after `asset`.
- `NEEDS_LABEL_SEARCH` doesn't change; its test asserts it has no `tag`.

Checks: `pnpm lint && pnpm test && pnpm build`. Manual, with the fake API: AC "Given `?tag=trip-2026,shared`", "`?tag=Trip-2026,TRIP-2026`", "Match all tags", "`?tag_match=all` without `tag`", "Export", "Needs a label".

## Phase 4. Pills in the table and cards

Goal: tags show in the list; a table pill adds its tag to the filter (pending Open Question 1).

| File | Change |
|------|--------|
| `src/modules/tags/names.ts` | `visibleTags(tags, max = 3)` |
| `src/modules/tags/names.test.ts` | `visibleTags` cases |
| `src/modules/tags/TagPills.tsx` | New. Props `tags`, optional `onPick(name)`. `Group gap={4} wrap="wrap"`; each shown tag is a `Pill` (`bg="dark.4"`, `size="sm"`); with `onPick`, wrapped in `UnstyledButton` with `aria-label={t("movements.tags.filterBy", { name })}`; then the `+N` `Pill` with `title={hidden.join(", ")}` and `t("movements.tags.more", { count })`. Renders nothing for `[]` |
| `src/modules/movements/MovementsTable.tsx` | New prop `onTagPick: (name: string) => void`. The reason cell becomes a `Stack gap={4}`: the reason text when there is one, `TagPills` with `onPick={onTagPick}` when there are tags, "—" only when neither |
| `src/modules/movements/MovementCards.tsx` | `TagPills` without `onPick`, on its own line under the reason line, inside the `miw={0}` column |
| `src/modules/movements/MovementsPage.tsx` | `const pickTag = useCallback((name) => go(withList(search, "tag", [...listItems(search.tag), name])), [go, search])`, passed to `MovementsTable` |
| `src/locales/en.json`, `src/locales/es.json` | `movements.tags.filterBy`, `movements.tags.more` |

Notes:
- The row handler already ignores clicks inside a `button`, so `UnstyledButton` (a `<button>`) needs no `stopPropagation`.
- `MovementsTable` is memoised. `pickTag` changes when `search` changes, which already re-renders the list; that's fine.
- If Open Question 1 is answered "open the drawer", skip `onTagPick`, `pickTag` and `movements.tags.filterBy`, and render the table pills plain.

Checks: `pnpm lint && pnpm test && pnpm build`. Manual: the list ACs, the pill click AC, and the 375px cards check.

## Phase 5. Drawer editing

Goal: edit a movement's tags in the drawer.

| File | Change |
|------|--------|
| `src/modules/tags/TagsField.tsx` | New, the shared `TagsInput` wrapper of the SPEC ("Editing (drawer)"): `applyTagInput` on change, the local error message (`movements.drawer.tagInvalid` or `tagsLimit`), `isDuplicate`, controlled `searchValue`, `styles={{ input: { minHeight: 44 } }}`, no `maxTags`. It also accepts an `error` prop (a translation key) from the parent, for the pending-text error, shown when set |
| `src/modules/movements/patch.ts` | `MovementDraft.tags`, `draftOf` copies `movement.tags`, `patchFor` adds `tags` when the sets differ. Widen the `Pick` types to include `"tags"` |
| `src/modules/movements/patch.test.ts` | The `patch.test.ts` row |
| `src/modules/movements/MovementDrawer.tsx` | New prop `knownTags`, passed down to `DrawerForm`. State `tagText` and `tagError`. `TagsField` after `NewCategoryField`, `disabled={busy}`. Save enabled when `changed || tagText.trim() !== ""`. In `save`, run `withPendingTag(draft.tags, tagText)` first, as the SPEC says, and build the body from the result with `patchFor` |
| `src/modules/movements/MovementsPage.tsx` | Pass `knownTags` to `MovementDrawer` |
| `src/locales/en.json`, `src/locales/es.json` | `movements.drawer.tags`, `tagsHelp`, `tagsPlaceholder`, `tagInvalid`, `tagsLimit` |

Notes:
- `save` must use the body computed from the folded tags, not the render's `body`, since the pending text changes it.
- Enter in the `TagsInput` with text is handled by Mantine (it calls `preventDefault`), so it doesn't submit the form. Enter with no text submits, like the reason field.
- Update `DrawerForm`'s doc comment: the reason, category and tags can be changed.

Checks: `pnpm lint && pnpm test && pnpm build`. Manual: the drawer ACs (Enter, pending text on Save, 33 code points, 32 emoji, `İSTANBUL`, 10-tag limit by typing and by pasting, removing one, removing all, reordering, category-only change), and the suggestion appearing after a save.

## Phase 6. Dashboard label cards

Goal: tags on the label card, sent with the category.

| File | Change |
|------|--------|
| `src/modules/dashboard/labelPatch.ts` | New: `labelPatch(movement, categoryId, typedReason, typedTags)`, today's reason rule from `LabelQueue.categorize` plus tags when the set differs |
| `src/modules/dashboard/labelPatch.test.ts` | New, the `labelPatch.test.ts` row |
| `src/modules/dashboard/LabelQueue.tsx` | `useTags()`; state `tags` and `tagText` per movement; `categorize` runs `withPendingTag`, sets the card's error and returns on failure, else builds the body with `labelPatch`; a successful save clears `tags` and `tagText` with the reason; pass the new props to `LabelCard` |
| `src/modules/dashboard/LabelCard.tsx` | New props `tags`, `onTagsChange`, `tagText`, `onTagTextChange`, `tagError`, `knownTags`; a full-width `TagsField` under the reason, labelled `dashboard.card.tagsLabel` |
| `src/locales/en.json`, `src/locales/es.json` | `dashboard.card.tagsLabel`; change `dashboard.card.saveFailed` |

Notes:
- Undo stays `{ category_id: null }`.
- A tags error before sending (pending text) shows under the card's tags input, not in the card's failure alert, and the card stays.
- `useTags` failing must not change the queue's states; pass `[]` as suggestions.

Checks: `pnpm lint && pnpm test && pnpm build`. Manual: the label card ACs (tags with a category, pending text, failed save keeps tags, Undo).

## Phase 7. Manual check and Implementation State

Run against the fake API (`pnpm fake-api`, then `VITE_BACKEND_ENDPOINT=http://localhost:8099 pnpm dev`, log in as `test@example.com` / `password`), with DevTools Network open:

1. Every acceptance criterion of the SPEC not already checked in Phases 3 to 6.
2. `{"failRoute":"GET /tags","failStatus":503}`: the Movements list, the drawer and the label cards work, with no suggestions and no error.
3. `{"delayMs":1500}`: tags inputs work while `GET /tags` loads.
4. Español: every new text, and the provisional "tag" wording (Open Question 2).
5. 375px wide: drawer tags input full width and 44px tall, card pills wrap, amount visible.
6. Dashboard spending card, label count and Categories totals unchanged with tagged movements.

Optional, if the backend runs locally with a real session: tag one movement, filter by it with `any` and `all`, export, then clear its tags. Never write or read `.env`; pass env vars on the command line.

Then run `pnpm verify` if the network allows (`api:check` uses `pnpm dlx`), else `pnpm lint && pnpm test && pnpm build`. Add an "Implementation State" section to this plan: files changed, deviations, check results, which manual checks ran. Don't touch `specs/INDEX.md`; the orchestrating session updates it.

## Implementation State

Implemented on 2026-11-13, uncommitted. Phases 1 to 6 are done; Phase 7's manual browser check wasn't run. The SPEC's "Implementation State" section lists the files per phase, the deviations, the check results and the checks still open.
