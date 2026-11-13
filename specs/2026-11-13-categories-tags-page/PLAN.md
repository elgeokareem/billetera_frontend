---
title: "Implementation Plan: Categories and Tags Page"
change: categories-tags-page-1
type: feature
spec: ./SPEC.md
issue: none
created: 2026-11-13
updated: 2026-11-13
sdd_version: 7.3.0
---

# Implementation Plan: Categories and Tags Page

**Spec:** [SPEC.md](./SPEC.md). Behaviour (P, T, C rules), the design, translations, acceptance criteria and unit tests are there. This plan gives the order, the files and the checks.

Rules for every phase:
- Never commit. Never open, read, `cat`, `grep` or print `.env` or any `.env.*` file. Tell every subagent this.
- Money stays a decimal string; this change touches no amounts.
- Don't touch `specs/INDEX.md` or `specs/ROADMAP.md` (the orchestrator does).
- No new dependency. Mantine 9.7.4 already has `Badge`, `ColorSwatch`, `Popover`, `TagsInput.renderPill`.
- Each phase ends with `pnpm lint && pnpm test && pnpm build`, all passing, and `git status --short` in the report. If something outside the phase's file list seems to need a change, stop and say so.
- Record files, results and drift from the SPEC under Implementation State.

## Dependency

**Blocked on the backend** `../backend/specs/2026-11-13-tag-management/` through its Phase 3 (all three routes and the `color`/`id` fields in `docs/openapi/openapi.json`). Phase 1 starts with `pnpm api:generate`; if the generated `tags.TagResponse` has no `id` and `color`, or `operations` has no `tags.create`, `tags.update`, `tags.delete`, stop. Phase 2 (fake API) doesn't need the backend and may run first.

## Phases

### Phase 1: Generated types and data layer

**Outcome:** typed API calls, hooks, color helpers and the name check exist and are unit-tested. No UI change.

| File | Change |
|------|--------|
| `src/modules/shared/api-schema.d.ts` | `pnpm api:generate` (first run needs network for `pnpm dlx`) |
| `src/modules/shared/api-errors.ts` | the two texts (SPEC Design) |
| `src/modules/shared/helpers.test.ts` | their two cases |
| `src/modules/tags/types.ts` | `TagColor`, comment |
| `src/modules/tags/colors.ts` + `colors.test.ts` | new (SPEC Design) |
| `src/modules/tags/manage.ts` + `manage.test.ts` | new |
| `src/modules/tags/api.ts` | `createTag`, `updateTag`, `deleteTag`, comment |
| `src/modules/tags/hooks.ts` | `useTagColors`, `useCreateTag`, `useRenameTag`, `useRecolorTag` (optimistic), `useDeleteTag` |
| `src/locales/en.json`, `es.json` | `errors.tagExists`, `errors.tagNotFound` only |

Check the `movements/hooks.ts` ↔ `tags/hooks.ts` import cycle with `pnpm build` and `pnpm lint`; if flagged, move `tagKeys` to `src/modules/tags/keys.ts` and re-export it from `hooks.ts`.

**Size:** about 300 changed lines (excluding the generated file), 12 files.

### Phase 2: Fake API

**Outcome:** `pnpm fake-api` answers like the backend change, so Phases 3–5 can be checked by hand.

Only `scripts/fake-api.mjs`:
- Header comment: tags have an `id` and a `color`; `GET /tags` lists every tag with counts (0 included); the new routes.
- `TAG_COLORS` (the 12, backend order); `randomTagColor()` (`Math.random`).
- Account state: `tags: [{ id, name, color, createdAt }]`, `nextTagId` (start at 1001, like the backend seed's sequence). `emptyAccount()` starts with none.
- Seed: after the movements are built, register every tag name the movements use, in name order, with `color = TAG_COLORS[id % 12]` (deterministic, like the backend backfill), plus one unused tag `old-trip` so the 0-count case shows.
- Movement `PATCH` with `tags`: register names not yet known, with `randomTagColor()`; known names keep their color.
- `GET /tags`: from the registry, with counts over the account's movements, sorted by name then id; items `{ id, name, color, movement_count }`.
- `POST /tags`, `PATCH /tags/:id`, `DELETE /tags/:id` with the backend SPEC's validation order and texts (`invalid body`, `invalid tag`, `invalid color`, `tag already exists`, `tag not found`; 201/200/204). Rename rewrites the name in every movement's `tags` (re-sorted); delete removes it from every movement.
- `FAIL_ROUTES` + the three routes; `patternOf` maps `/tags/<x>` to `/tags/:id`; the dispatcher calls the new handlers (next to `listTags`).

Check by curl (log in first, keep the cookie, send `Origin: http://localhost:5173` on unsafe methods if the fake checks it): create, duplicate 409, invalid 400s, rename, recolor, delete 204, delete again 404, `GET /tags` counts.

**Size:** about 200 changed lines, 1 file.

### Phase 3: Colored tags everywhere

**Outcome:** SPEC C1–C4. The page is unchanged.

| File | Change |
|------|--------|
| `src/modules/tags/TagBadge.tsx` | new, C2 |
| `src/modules/tags/TagPills.tsx` | C3 |
| `src/modules/tags/TagsField.tsx` | C4 (`renderPill`) |

**Size:** about 80 changed lines, 3 files.

### Phase 4: Page layout and the read-only tags column

**Outcome:** SPEC P1–P5, T1, T2, T4 (without the rename/delete buttons and the color button yet), C5.

| File | Change |
|------|--------|
| `src/modules/categories/CategoriesPage.tsx` | page shell: title, subtitle, `SimpleGrid`, categories under their column heading; categories logic unchanged |
| `src/modules/tags/TagsColumn.tsx` | new: heading, description, loading, error, empty, list rows (badge link + count) |
| `src/locales/en.json`, `es.json` | `nav.categories`, `categories.title`, `categories.subtitle`, `categories.columnTitle`, `categories.columnSubtitle`, `tags.title`, `tags.subtitle`, `tags.movementCount_*`, `tags.showMovements`, `tags.empty.*` |

**Size:** about 250 changed lines, 4 files.

### Phase 5: Create, rename, delete and color in the tags column

**Outcome:** SPEC T3, T5–T8.

| File | Change |
|------|--------|
| `src/modules/tags/TagsColumn.tsx` | create form, inline rename, delete modal, wiring of the hooks and the toasts |
| `src/modules/tags/TagColorPicker.tsx` | new, T7 |
| `src/locales/en.json`, `es.json` | the remaining `tags.*` keys (SPEC table) |

**Size:** about 350 changed lines, 4 files.

### Phase 6: Manual check and review

With the fake API (`pnpm fake-api`, then `VITE_BACKEND_ENDPOINT=http://localhost:8099 pnpm dev`, log in as `test@example.com` / `password`):

1. `/categories` at 1280px and 800px (AC1). Nav and title in en and es (AC13).
2. Tags column lists the seed tags with colors and counts, and `old-trip` with 0 (AC2). Click a tag (AC3).
3. `{"account": "empty"}` via `POST /__fake/state`: empty state (AC4).
4. Create, duplicate, invalid (AC5, AC6). Rename, same-name rename, conflicting rename (AC7). Delete with and without movements (AC8).
5. Change a color; then `{"failRoute": "PATCH /tags/:id", "failStatus": 503}` and change again: rollback and toast (AC9). Reset `failRoute`.
6. Movements table and cards: colored pills, "+N", pill click filters (AC10). Drawer and Dashboard label card: colored chips, new tag gray until saved, × and Backspace (AC11).
7. `{"failRoute": "GET /tags", "failStatus": 503}`: tags column error, categories fine, pills gray (AC12).
8. Delete a tag through curl, then rename it in the page: 404 message (AC14).

Then against the real backend once it's deployed (ROADMAP step 6 rules). A reviewer reads the diff against the SPEC.

## Expected Files

### Create

- `src/modules/tags/colors.ts`, `colors.test.ts`, `manage.ts`, `manage.test.ts`, `TagBadge.tsx`, `TagColorPicker.tsx`, `TagsColumn.tsx`
- possibly `src/modules/tags/keys.ts` (only if the import cycle is flagged)

### Modify

- `src/modules/shared/api-schema.d.ts` (generated), `api-errors.ts`, `helpers.test.ts`
- `src/modules/tags/types.ts`, `api.ts`, `hooks.ts`, `TagPills.tsx`, `TagsField.tsx`
- `src/modules/categories/CategoriesPage.tsx`
- `src/locales/en.json`, `src/locales/es.json`
- `scripts/fake-api.mjs`

`src/routes/_app/categories.tsx` and `AppLayout.tsx` don't change (the nav reads its label from the translation).

## Risks

| Risk | Mitigation |
|------|------------|
| Badge upper-cases text | `tt="none"` (SPEC C2); check in Phase 3 |
| `renderPill` changes the input's remove/Backspace behaviour | Keep `withRemoveButton` and `onRemove` from the render input; check AC11 by hand |
| Optimistic color update clobbers a concurrent refetch | `cancelQueries(tagKeys.all)` in `onMutate`, invalidate on settle |
| Delete count is stale | Accepted (SPEC T6) |
| Spanish word for "tag" changes later (SPEC Q1) | All new strings are in the two locale files only |

## Implementation State

Implemented (2026-11-13), uncommitted. No manual browser check was run (skipped on request); the fake API was checked by curl.

**Decisions for the SPEC's open questions:** Q1 keeps "tag" in Spanish ("Categorías y tags"); Q2 leaves the categories column's duplicate-name feedback inline; Q3 leaves the Movements tag filter chips gray; Q4 shows unused tags with count 0.

**Phase 1 — types and data layer:** `src/modules/tags/types.ts` (`TagColor`, comment), `colors.ts` + `colors.test.ts` (new), `manage.ts` + `manage.test.ts` (new), `api.ts` (`createTag`, `updateTag`, `deleteTag`), `hooks.ts` (`useTagColors`, `useCreateTag`, `useRenameTag`, `useRecolorTag`, `useDeleteTag`), `src/modules/shared/api-errors.ts`, `src/modules/shared/helpers.test.ts`, `src/locales/en.json` and `es.json` (`errors.tagExists`, `errors.tagNotFound`). `api-schema.d.ts` was already current and wasn't edited. `tagKeys` stayed in `hooks.ts`: lint and build didn't flag the `movements/hooks.ts` ↔ `tags/hooks.ts` cycle, so no `keys.ts` was needed.

**Phase 2 — fake API:** `scripts/fake-api.mjs`: tag registry with IDs from 1001, the 12 palette colors, deterministic seed colors plus the unused `old-trip`, implicit tag creation on movement PATCH, count-bearing `GET /tags`, `POST /tags`, `PATCH /tags/:id`, `DELETE /tags/:id` with the backend's validation order and texts, the three fail routes and the `/tags/:id` pattern. Checked with curl: list seed tags and their counts (including `old-trip` 0), create with normalisation, duplicate 409, invalid name 400, invalid color 400, rename and recolor, implicit creation through a movement PATCH, delete 204, delete again 404, bad ID 404.

**Phase 3 — colored tags everywhere:** `src/modules/tags/TagBadge.tsx` (new), `TagPills.tsx` (colored badges, neutral +N, click still filters), `TagsField.tsx` (`renderPill` with `Pill` styled by `tagColorStyle`, remove and Backspace kept). A tag missing from the cache, or before the save, draws gray.

**Phase 4 — page layout and read-only tags column:** `src/modules/categories/CategoriesPage.tsx` (title/subtitle, `SimpleGrid` from `md`, categories under their own heading; categories logic unchanged), `src/modules/tags/TagsColumn.tsx` (new: heading, loading, error with retry, empty state, badge link and count), `src/locales/en.json` and `es.json` (nav, page and column strings, tag title/subtitle/count/link, empty state).

**Phase 5 — create, rename, delete and color:** `src/modules/tags/TagsColumn.tsx` (create form, inline rename, delete modal with the count, color wiring and toasts), `src/modules/tags/TagColorPicker.tsx` (new: 44px button, 20px swatch, 4×3 popover with the current color checked), `src/locales/en.json` and `es.json` (remaining `tags.*` and `tags.color.names.*` strings).

**Deviations:** none from the plan's behaviour. Notes: `TagColorPicker` draws its swatches with `var(--mantine-color-<c>-6)` so they follow the theme palette (the badges still use the palette name, as C2 says); the fake API's PATCH handler is named `updateTagRoute` to keep it apart from the data-layer name.

**Checks:** `pnpm lint && pnpm test && pnpm build` passed after every phase. The final run has 31 test files and 375 tests, `tsc -b` passes and `vite build` emits only the pre-existing chunk-size warning. `git status` shows the changes above, the new `specs/2026-11-13-categories-tags-page/` files, the orchestrator's `specs/ROADMAP.md` and `src/modules/shared/api-schema.d.ts` edits, and `specs/INDEX.md` with this row set to built. Nothing was committed.
