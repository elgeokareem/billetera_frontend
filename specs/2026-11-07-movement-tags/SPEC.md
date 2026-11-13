---
title: Movement Tags
spec_type: tech
type: feature
status: draft
domain: Portfolio
issue: none
created: 2026-11-07
updated: 2026-11-13
sdd_version: 7.3.0
---

# Movement Tags

## Overview

This adds tags: zero or more free labels per movement, such as `trip-2026`, `shared` or `work`, for filtering and grouping.

- A movement keeps at most one category, and the category alone drives spending totals. So totals always add up to what was spent.
- Tags never split an amount and never change a category total.

Depends on [Movements and Categories](../2026-10-30-movements-categories/SPEC.md), [Dashboard](../2026-10-30-dashboard/SPEC.md), [Review Fixes](../2026-11-09-review-fixes/SPEC.md) (R11, the `asset_match` rule that `tag_match` copies) and [Drawer Create Category](../2026-11-09-drawer-create-category/SPEC.md) (the drawer layout this extends).

The backend part is built and committed: `../backend/specs/2026-11-10-movement-tags/SPEC.md`, summed up in `../backend/README.md` (sections "Movements" and "Tags"). `pnpm api:generate` has brought its types into `src/modules/shared/api-schema.d.ts` (uncommitted). The backend is the source of truth. [Reconciliation with the backend](#reconciliation-with-the-backend-2026-11-13) lists what changed in this SPEC to match it.

## Definitions

- **Tag:** a lower-case name attached to a movement. A movement has 0 to 10 tags, all different.
- **Tag name:** a typed name is normalised in this order, as the backend's `tags.NormalizeName` does:
  1. Trimmed (`String.prototype.trim`).
  2. Lower-cased with `toTagCase`.
  3. Checked. It must be 1 to 32 code points (`[...name].length`, not `.length`), with no control character (`/\p{Cc}/u`), no lone surrogate (`/\p{Cs}/u`), and no comma, since a comma separates the items of a list filter.

  Spaces inside a name are allowed. The frontend checks these rules before sending, and the backend enforces them. The backend's answer is the source of truth: the API only ever returns lower-case names.
- **`toTagCase`:** the backend lower-cases with Go `strings.ToLower`, which is the Unicode simple lowercase of each code point. JS `toLowerCase` uses the full mapping, which differs only for `İ` (U+0130 becomes `i` plus a combining dot). So the helper is:

  ```ts
  Array.from(text, (c) => (c === "İ" ? "i" : c.toLowerCase())).join("")
  ```

  Mapping one code point at a time also avoids the final-sigma rule.
- **Known tags:** the user's tags that at least one movement uses, from `GET /tags`, in the API's order (by name). They feed the autocomplete. A tag no movement uses any more isn't listed.
- **Pending tag text:** what's typed in a tags input and not yet turned into a tag (no Enter, comma or blur yet).

### Where the frontend and backend rules can differ

These are edge cases. Neither changes what the API stores, since the frontend always sends names it has already normalised.

- **Trim set.** JS `trim` removes U+FEFF, and Go `strings.TrimSpace` doesn't. Go removes U+0085, and JS doesn't (the frontend then refuses it as a control character). So the frontend can be slightly stricter, never looser.
- **Lone surrogates.** Go checks for valid UTF-8. A JS string can hold a lone surrogate, which `JSON.stringify` sends as `\udXXX` and Go decodes to U+FFFD. The `/\p{Cs}/u` rule refuses it before it's sent, so a name never comes back different from what the user saw.
- **Unicode version.** The browser and Go may know different Unicode versions, so a very new character could lower-case differently. The saved movement's `tags` from the PATCH response replace what's shown, so the screen always ends up with the backend's spelling.

## Decisions

- **Created on the fly, no tag list to manage.** The user types a tag where they edit a movement, with autocomplete from the known tags. A new name becomes a tag when the movement is saved. There's no Tags page and no create step. Renaming, merging and deleting tags are a follow-up (see Out of Scope).
- **Tags are lower-case names, not IDs, in the API.** The movement carries `tags: string[]`, and `PATCH` takes the whole list. The URL filter reads as text (`tag=trip-2026`). Typing `Trip-2026` gives `trip-2026` (user decision, 2026-11-10).
- **Any or all.** The tag filter matches movements with any of the tags by default. A checkbox switches it to all of them (`tag_match=all`). This works like the coin filter's "Include the other side of a Convert" checkbox (`asset_match`).
- **Tags don't affect totals.** The Dashboard spending card, the label queue count and the Categories view are unchanged. A tag filter on Movements narrows the list and the export. The Movements view requests no totals, so no total changes. A movement with several matching tags is listed once.
- **`movement_count` isn't shown.** `GET /tags` returns it, but the suggestions show only names, in the API's order. It stays in the type for a later "most used first" or a tags view.
- **Pending text counts.** A save folds the pending tag text into the tags first, so a name typed without Enter isn't lost, and Save isn't disabled while there's pending text.
- **Look.** Tags show as Mantine `Pill`s in a neutral color (`dark.4` background), so they never look like the accent-colored category or the "Needs a label" state. Editing uses Mantine `TagsInput`, which the asset filter already uses.

## Requirements

### Data layer

- `Movement` already has `tags: string[]` from the regenerated schema (required, never `null`). `MovementPatch` has `tags?: string[]`. `MovementsQuery` has `tag?: string` and `tag_match?: "any" | "all"`. No hand-written type changes are needed in `src/modules/movements/types.ts`.
- **The build is broken until the fixtures are fixed.** Because `tags` is required, the `Movement` fixtures in `src/modules/dashboard/movementText.test.ts` and `src/modules/movements/hooks.test.ts` fail `tsc -b`. Both get `tags: []`.
- New module `src/modules/tags/`:
  - `types.ts`: `Tag = Schemas["tags.TagResponse"]` (`name`, `movement_count`).
  - `api.ts`: `fetchTags()`, `GET /tags`, returning `data.tags`.
  - `hooks.ts`: `tagKeys = { all: ["tags"] as const }` and `useTags()`.
  - `names.ts`, the name rules (pure, tested):
    - `MAX_TAG_LENGTH = 32`, `MAX_TAGS = 10`.
    - `toTagCase(text)`, as in Definitions.
    - `normaliseTagName(text): string | undefined`: trims, applies `toTagCase`, then checks the rules.
    - `normaliseTags(items): string[]`: normalises each item, drops the invalid ones, drops repeats (exact, after normalising), keeps the first 10.
    - `applyTagInput(items): { tags: string[]; error?: "invalid" | "limit" }`: what an input's `onChange` does. `tags` is `normaliseTags(items)`. `error` is `"invalid"` when an item was dropped as invalid, else `"limit"` when more than 10 distinct valid names were given, else missing.
    - `withPendingTag(tags, text): { tags: string[]; error?: "invalid" | "limit" }`: blank text gives `tags` unchanged. Otherwise it's `applyTagInput([...tags, text])`.
- `useUpdateMovement` also invalidates `tagKeys.all` once a save settles, since a save can add a tag or leave one unused. A session end already clears the whole query cache, so `["tags"]` needs nothing more.
- New error texts go in `KNOWN_ERRORS` of `src/modules/shared/api-errors.ts`: `invalid tag` (`errors.invalidTag`) and `too many tags` (`errors.tooManyTags`). That makes 19 texts, matching `frontendErrorTexts` in the backend's `routes/openapi_spec_test.go`, which already lists both.
- `invalid tag_match` isn't mapped. Like `invalid asset_match`, it can't happen, because the URL parser only lets valid values through.

### Movements view (`/movements`)

**List**

- **Desktop table:** the tags show as pills under the reason, inside the reason cell. The table keeps its columns and its 760px minimum width.
  - At most 3 pills show, then a `+N` pill. The `+N` pill isn't a button, and its `title` lists the hidden names joined by `", "`. All tags show in the drawer.
  - The reason cell shows "—" only when there's no reason and no tag.
- **Pills in the table are buttons** (pending [Open Question 1](#open-questions)). Clicking one adds that tag to the `tag` filter, keeping the other filters and `tag_match`. The row's click handler already ignores buttons (`target.closest("button, ...")`), so the click doesn't open the drawer. The button's accessible name is "Filter by tag trip-2026". A tag already in the filter changes nothing. With 20 tags in the filter already, it changes nothing either.
- **Below 768px (cards):** the pills show on their own line under the reason, wrapping, with the same 3 plus `+N` limit. They're plain pills, not buttons, since the whole card is a button. A tap opens the drawer.
- A movement with no tags shows no pill and no placeholder.
- One shared component, `src/modules/tags/TagPills.tsx`, draws the pills for both. Pure helper `visibleTags(tags, max = 3): { shown: string[]; hidden: string[] }` in `src/modules/tags/names.ts` decides the split. Mantine `Pill` isn't polymorphic, so a clickable pill is a `Pill` inside an `UnstyledButton`.

**Filter**

| Filter | Param | Notes |
|--------|-------|-------|
| Tag | `tag` | Multi-value. A `TagsInput` with the known tags as suggestions. Matches movements with any of the tags, or all of them with `tag_match=all` |
| Match all tags | `tag_match` | A checkbox under the tag input, "Match all tags". It writes `tag_match=all`, or nothing for the default `any`. It's disabled when there's no tag |

- `search.ts` reads `tag` as a comma list with the existing `readList`:
  - Its `normalise` argument is `(item) => normaliseTagName(item) ?? ""`, as `asset` passes `toUpperCase`. Its `keep` argument is `(item) => item !== ""`, which drops invalid items.
  - `readList` normalises before `unique`, and `unique` keeps at most 20. Names are already lower-cased at that point, so the existing case-sensitive `unique` drops repeats correctly.
  - `tagNames(items)` (next to `assetSymbols`) normalises a list and drops invalid items, for the filter input's `onChange`.
  - `withList`'s key union gains `"tag"`. For `"tag"` it runs the items through `tagNames` before `unique`, so no caller can put an invalid or upper-case name in the URL.
- `tag_match` follows the `asset_match` rule (review-fixes R11):
  - `MovementsSearch.tag?: string` and `MovementsSearch.tag_match?: "all"`.
  - `parseMovementsSearch` keeps `tag_match` only when it's `all` and `tag` survived parsing. `tag_match=any` is dropped, since it's the default.
  - `withList(search, "tag", [])` and `withoutKey(search, "tag")` also remove `tag_match`.
  - `FILTER_KEYS` gains `tag` and `tag_match`.
- `toMovementsQuery` passes `tag` and `tag_match` on, so the list and the export get them.
- `queryString` already sends a list with raw commas and escapes the rest. A name with a space goes out as `+`, which the backend decodes as a space. A `+` in a name goes out as `%2B`.
- A typed name that isn't a known tag is still a valid filter. It simply matches nothing, and with `all` it makes the whole filter match nothing.
- The filter input drops invalid names and a 21st name silently, as the coin filter does with invalid symbols.
- `chips.ts`:
  - One chip per tag, "Tag: trip-2026", built with the existing `labelled` helper and `movements.filters.tag`. Each is removable on its own, like a category chip. Removing the last tag chip also drops `tag_match`.
  - A chip "All tags" when `tag_match=all`, removable. Removing it goes back to `any`, as the `asset_match` chip does.
  - Tag chips come after the category chips and before the dates chip.
- The "Needs a label" preset keeps replacing every filter, `tag` and `tag_match` included.
- The filter goes in the existing `SimpleGrid` as its own `FilterGroup`, right after Category. The input and the checkbox go in the same group, as in the coin filter.

**Editing (drawer)**

- Below the category controls (the `Select` and `NewCategoryField`), a `TagsInput` labelled "Tags". It has the known tags as suggestions, splits on `,` (Mantine's default) and Enter, accepts pending text on blur (Mantine's default), and has the description "Up to 10 tags".
- One shared component, `src/modules/tags/TagsField.tsx`, wraps the `TagsInput` for the drawer and the label card. It takes `value`, `onChange(tags)`, `searchValue`, `onSearchChange`, `suggestions`, `label`, `description`, `placeholder` and `disabled`.
  - Its `onChange` runs `applyTagInput`. It passes the result's `tags` up, and shows the result's error under the input until the next change: "Tags are 1 to 32 characters, without commas" for `invalid`, "A movement can have up to 10 tags" for `limit`.
  - It doesn't set Mantine's `maxTags`, because Mantine drops pasted extras without a callback. The 10-tag cap lives in `applyTagInput`, so typing and pasting behave the same.
  - It sets `isDuplicate={(value, current) => current.includes(normaliseTagName(value) ?? value)}`, so `Trip` next to `trip` counts as a repeat.
  - The search text is controlled by the parent, which needs it for the pending text.
- So a typed `Trip-2026` shows as `trip-2026`. A name that's too long, or has a forbidden character, isn't added. An 11th tag isn't added.
- `MovementDraft` gains `tags: string[]`. `draftOf` copies `movement.tags`.
- `patchFor` compares the draft's tags with the movement's, ignoring order.
  - When they differ, the body has the whole new list under `tags`. Removing them all sends `"tags": []`.
  - Unchanged tags aren't sent, so a category-only change has no `tags` key.
- **Save with pending text:** Save is enabled when the body isn't empty or the pending text isn't blank. On submit, the drawer runs `withPendingTag(draft.tags, pending)` first:
  - With an error, nothing is sent, and the input shows the error with the pending text kept.
  - Otherwise the draft takes the result's tags, the pending text is cleared, and `patchFor` builds the body from that. If the body is then empty, the drawer closes as it does today.
- The save, its error alert and the rest of the drawer behave as today. Saving is disabled while a category is being created, as today.
- There's no inline tag editing in the table. Category stays the only inline control.

### Dashboard label cards

- Under the reason field, an optional `TagsField` labelled "Tags (optional)", with the same suggestions and rules as the drawer, full width.
- Typed tags and pending text live in `LabelQueue`, like the typed reason (`tags: Record<number, string[]>`, `tagText: Record<number, string>`), so they survive a failed save. The card shows `tags[movement.id] ?? movement.tags`.
- Picking a category runs `withPendingTag` on the card's tags and pending text first. With an error, nothing is sent and the card shows the error. Otherwise one `PATCH` sends the category, the reason as today, and the tags, but the tags only when the list differs from the movement's (ignoring order). Creating a category from the card works the same way.
- The body is built by a pure helper, `labelPatch(movement, categoryId, typedReason, typedTags)` in `src/modules/dashboard/labelPatch.ts`, which moves today's inline logic from `categorize` and adds the tags.
- A successful save clears the card's typed tags and pending text, as it clears the reason.
- Undo clears the category only (`{"category_id": null}`). Tags stay, like a saved reason.
- The failure text becomes "The label wasn't saved. Your reason and tags are still here."
- Recent movements on the Dashboard don't show tags.

### States

- **Tags loading:** the inputs work, with no suggestions. Filter chips show the tag names from the URL, which need no lookup.
- **Tags failed to load:** the inputs still work, with no suggestions and no error shown. The movements list isn't affected. `useTags` keeps TanStack Query's default retry.
- **No known tags:** the inputs show their placeholder ("Add a tag, such as trip-2026" in the drawer and card, "For example, trip-2026" in the filter), and there are no suggestions.
- **Empty list with a tag filter:** the existing "Nothing matches" state, with Clear all.
- **Save fails:** the drawer's alert, or the card's, with the translated error. The typed tags and pending text stay.

### Translations (EN and ES)

`movements.filters.tag` is singular, like `asset` and `category`, because the chip reads "{{label}}: {{value}}". The Spanish texts use "tag" until [Open Question 2](#open-questions) is answered.

| Key | EN | ES (provisional) |
|-----|----|----|
| `movements.filters.tag` | Tag | Tag |
| `movements.filters.tagPlaceholder` | For example, trip-2026 | Por ejemplo, viaje-2026 |
| `movements.filters.tagMatch` | Match all tags | Con todos los tags |
| `movements.chips.tagMatch` | All tags | Todos los tags |
| `movements.tags.filterBy` | Filter by tag {{name}} | Filtrar por el tag {{name}} |
| `movements.tags.more` | +{{count}} | +{{count}} |
| `movements.drawer.tags` | Tags | Tags |
| `movements.drawer.tagsHelp` | Up to 10 tags | Hasta 10 tags |
| `movements.drawer.tagsPlaceholder` | Add a tag, such as trip-2026 | Añade un tag, como viaje-2026 |
| `movements.drawer.tagInvalid` | Tags are 1 to 32 characters, without commas | Los tags tienen de 1 a 32 caracteres, sin comas |
| `movements.drawer.tagsLimit` | A movement can have up to 10 tags | Un movimiento puede tener hasta 10 tags |
| `dashboard.card.tagsLabel` | Tags (optional) | Tags (opcional) |
| `dashboard.card.saveFailed` (changed) | The label wasn't saved. Your reason and tags are still here. | No se guardó la etiqueta. Tu motivo y tus tags siguen aquí. |
| `errors.invalidTag` | That tag isn't valid. Tags are 1 to 32 characters, without commas. | Ese tag no es válido. Los tags tienen de 1 a 32 caracteres, sin comas. |
| `errors.tooManyTags` | A movement can have up to 10 tags. | Un movimiento puede tener hasta 10 tags. |

`src/locales/locales.test.ts` already checks that both files have the same keys and no empty text. Tag names themselves are the user's text and are never translated.

### Mobile

- The drawer is already full width below 768px. The `TagsInput` is full width, with a 44px minimum height like the other inputs. So is the "Match all tags" checkbox's touch target.
- Card pills wrap, and never push the amount column off screen (the left column keeps `miw={0}`).
- On the label card, the tags input is full width under the reason.

## Backend contract (built)

From `../backend/README.md` and `../backend/specs/2026-11-10-movement-tags/SPEC.md`, as committed.

**Model**

- A user's tags are lower-case names, unique per user. A movement links to 0 to 10 of them. There's no cap per user.
- A tag no movement uses stays stored, isn't listed by `GET /tags`, and matches nothing. A later PATCH that names it reuses it. Cleanup is future work.
- Syncs never change tags, just as they never change a reason or a category. Deleting a category doesn't touch tags.

**Movement response**

- `GET /movements`, `GET /movements/:id` and the `PATCH` response carry `"tags": ["shared", "trip-2026"]`, right after `category_id`.
- `tags` is always present: `[]` when there are none, never `null`. The names are lower case and sorted.

**`PATCH /movements/:id`**

- `{"tags": ["Trip-2026", "shared"]}` replaces the movement's tags, and they're saved and returned as `["shared", "trip-2026"]`. `{"tags": []}` clears them. A key left out keeps its value.
- `tags` can come with `reason` and `category_id` in one request, and it counts as one of the keys. A body with none of the three is 400 `invalid body`.
- Each name goes through `NormalizeName`: `strings.TrimSpace`, `strings.ToLower`, valid UTF-8, 1 to 32 code points, no control character (`unicode.IsControl`), no comma. Otherwise 400 `invalid tag`. `null`, a non-array, or a non-string item is also 400 `invalid tag`.
- Repeats count once after normalising. More than 10 distinct names is 400 `too many tags`.
- The keys are checked in this order: `invalid reason`, `invalid category_id`, `invalid tag`, `too many tags`. The save is one transaction, and a missing or foreign movement is 404 `movement not found` before any tag is written.

**Filters**

- `tag` on `GET /movements`, `GET /movements/totals` and `GET /movements/export`: a comma list of up to 20 names, each trimmed and lower-cased.
  - 400 `invalid tag` for an invalid item, an empty item, an empty value, a repeated parameter (`tag=a&tag=b`), more than 20 items, or a broken escape.
  - Repeated items (`tag=a,A`) are allowed and count once.
- `tag_match`: `any` (default) or `all`, like `asset_match`. Anything else, an empty value, a repeated parameter or a broken escape is 400 `invalid tag_match`. Without `tag`, it's accepted and changes nothing.
- Both are ANDed with the other filters. A movement is listed and counted once in totals, however many of its tags match.
- The export CSV has a `tags` column as the last one, after `fee_usd_value`. The names are joined by `", "`, with the same leading-character escape as other cells. The frontend downloads the file as is.

**`GET /tags`** (`operationId` `tags.list`)

- Returns `{"tags": [{"name": "trip-2026", "movement_count": 12}]}`: the tags at least one movement has, sorted by name. `movement_count` counts movements of every status. Items have no `id`. There's no paging, and it's `[]` when there are none.
- Needs a login. It answers 401, 403 (`Origin not allowed`) and 500 (`could not list tags`) like the other routes.

**Counts on the backend side:** 24 routes, 21 authenticated routes, and 19 frontend error texts.

**Not built:** `group_by=tag` on totals, routes to rename, merge or delete tags, a `none` value for `tag`, cleanup of unused tags, and Unicode normalisation (NFC versus NFD) of names.

## Reconciliation with the backend (2026-11-13)

Checked against the committed backend (`modules/tags/names.go`, `modules/movements/filters.go`, `services.go`), its README and the regenerated `api-schema.d.ts`. The names, limits, error texts, error order and response shapes in the draft already matched. Changes to this SPEC:

1. **Status.** The backend is built, not planned. "Backend dependency" became "Backend contract (built)", with the details the implementation adds: a broken escape is also `invalid tag`/`invalid tag_match`, a missing movement is 404 before any tag write, and an unused tag is reused by a later PATCH.
2. **Build break.** The regenerated schema makes `Movement.tags` required, so two test fixtures fail `tsc -b` today. Fixing them is the first step of the plan.
3. **No hand-written types.** `Movement`, `MovementPatch` and `MovementsQuery` already carry the new fields through the generated schema. `src/modules/tags/types.ts` only names `tags.TagResponse`.
4. **Name module location.** `isValidCategoryName` lives in `categories/api.ts`. The tag rules go in their own file, `src/modules/tags/names.ts`, not next to it.
5. **Lone surrogates.** Added `/\p{Cs}/u` to the frontend rule, to match the backend's valid-UTF-8 check (see [Where the frontend and backend rules can differ](#where-the-frontend-and-backend-rules-can-differ)).
6. **Totals.** The draft said the tag filter narrows "the totals the frontend requests with it". The Movements view requests no totals, so it narrows the list and the export only.
7. **`movement_count`.** Returned by the backend, not shown (a decision above).
8. **Chip label key.** The draft's chip "Tag: trip-2026" needs a singular label, so `movements.filters.tag` is "Tag", like "Asset" and "Category".
9. **Shared helpers added:** `applyTagInput`, `withPendingTag`, `visibleTags`, `tagNames`, `labelPatch`, `TagsField` and `TagPills`, so the input rules and the bodies are pure and testable (the repo has no React Testing Library).
10. **Pending text.** New: a save folds pending tag text in, and Save stays enabled while there's pending text.
11. **`saveFailed` text.** The label card's failure text now mentions tags, since they're kept too.
12. **Spanish term.** The existing Spanish UI already uses "etiqueta" for a category label ("Sin etiqueta", "Etiquetado como …"), so "etiqueta" for a tag would clash. See Open Question 2.

## Acceptance Criteria

- **Given** the regenerated schema, **when** `pnpm build` runs, **then** it passes (the fixtures have `tags`).
- **Given** a movement with tags, **when** the Movements view loads, **then** the table shows its first 3 tags as pills under the reason, plus `+N` for the rest, and a card shows them on their own line.
- **Given** a movement with no reason and no tags, **then** the reason cell shows "—", and with tags only, it shows the pills and no "—".
- **Given** the table, **when** the user clicks a tag pill, **then** that tag is added to the `tag` filter, the URL has `tag=<name>`, the other filters stay, and the drawer doesn't open.
- **Given** `?tag=trip-2026,shared` in the URL, **when** the page loads, **then**:
  - two chips show, "Tag: trip-2026" and "Tag: shared";
  - the request has `tag=trip-2026,shared`;
  - removing one chip keeps the other.
- **Given** `?tag=Trip-2026,TRIP-2026` in the URL, **when** the page loads, **then** the search holds `tag=trip-2026` and one chip shows.
- **Given** `?tag=trip%202026`, **then** the search holds `tag: "trip 2026"`, and the request carries `tag=trip+2026`.
- **Given** a tag filter, **when** the user checks "Match all tags", **then** the URL and the request have `tag_match=all`, and an "All tags" chip shows. Removing that chip removes `tag_match`. Removing the last tag chip removes both `tag` and `tag_match`.
- **Given** `?tag_match=all` without `tag`, or `?tag=a&tag_match=any`, **when** the page loads, **then** the search has no `tag_match`, and the checkbox is unchecked. Without `tag`, the checkbox is also disabled.
- **Given** a tag filter with `tag_match=all`, **when** Export is clicked, **then** the export request has the same `tag` and `tag_match`.
- **Given** a hand-typed URL with an invalid tag, such as one longer than 32 code points or one with a control character, **when** the page loads, **then** that item is dropped and the valid ones stay.
- **Given** a URL with 25 distinct tags, **then** the search keeps the first 20.
- **Given** "Needs a label" is clicked with a tag filter, **then** `tag` and `tag_match` are gone.
- **Given** the user types `Trip-2026` in the drawer and presses Enter, **then** the input shows `trip-2026`, and Save sends `"tags": ["trip-2026"]`.
- **Given** the user types `trip` in the drawer without pressing Enter and clicks Save, **then** the request sends `"tags": [..., "trip"]`.
- **Given** pending text of 33 code points and Save clicked, **then** nothing is sent, and the input shows the invalid message with the text kept.
- **Given** a name with 32 emoji, **then** it's accepted (32 code points), and one with 33 isn't. `İSTANBUL` becomes `istanbul`, 8 code points.
- **Given** a movement with tags, **when** only its category changes in the drawer or in the table, **then** the request doesn't contain `tags`.
- **Given** a movement with tags `a` and `b`, **when** the user removes `b` and saves, **then** the request sends `"tags": ["a"]`. Removing both sends `"tags": []`. Reordering them sends nothing.
- **Given** a movement with 10 tags, **when** the user types or pastes another, **then** it isn't added, and the input says the limit is 10.
- **Given** a label card with tags typed, **when** the user picks a category, **then** one `PATCH` sends the category and the tags, and Undo sends only `{"category_id": null}`.
- **Given** a label card save that fails, **then** the card comes back with the error and the typed tags.
- **Given** `GET /tags` fails, **then** the tag inputs still work without suggestions, and the movements list shows normally.
- **Given** a movement gets a new tag, **when** the save settles, **then** the tag appears in the suggestions without a reload.
- **Given** movements with tags, **then** the Dashboard spending card, the label count and the Categories view show the same totals as without tags.
- **Given** the 400 `invalid tag` or `too many tags` errors, **then** the user sees a translated message, in EN and ES.
- **Given** a screen narrower than 768px, **then** the drawer's tags input is full width and at least 44px tall, and card pills wrap without hiding the amount.

## Testing Strategy

Vitest only, pure functions, with `TZ=America/Santiago` from `vite.config.ts`. The repo has no React Testing Library, so the components are checked by hand against the fake API.

| Test file | Covers |
|-----------|--------|
| `src/modules/tags/names.test.ts` (new) | `toTagCase` (`İ`, `Σ` alone and final, ASCII, `ÑANDÚ`); `normaliseTagName` (trim, lower case, empty, spaces only, 32 and 33 code points with emoji and `Ñ`, tab, newline, NUL, comma, lone surrogate, inner space); `normaliseTags` (repeat after lower-casing, invalid dropped, cap 10, order kept); `applyTagInput` (no error, `invalid`, `limit`, `invalid` wins over `limit`); `withPendingTag` (blank, valid, invalid, 11th, repeat of an existing tag); `visibleTags` (0, 3, 4, 10) |
| `src/modules/movements/search.test.ts` | `tag` parsing (lower case, dedupe, invalid dropped, cap 20, `+` and `%20`); `tag_match` kept only as `all` with `tag`; `withList`/`withoutKey` drop `tag_match`; `hasFilters`; `toMovementsQuery` and `queryString` carry both; `NEEDS_LABEL_SEARCH` has neither; round trip through `stringifySearch`/`parseSearch` |
| `src/modules/movements/FilterChips.test.ts` | One chip per tag, "All tags" chip, removing the last tag drops `tag_match`, removing "All tags" keeps `tag` |
| `src/modules/movements/patch.test.ts` | `draftOf` copies tags; `patchFor` sends tags only when changed, ignores order, sends `[]`, no `tags` key on a category-only change |
| `src/modules/dashboard/labelPatch.test.ts` (new) | Today's reason rules, plus tags sent only when different |
| `src/modules/shared/helpers.test.ts` | `getApiErrorKey` for `invalid tag` and `too many tags` |
| `src/locales/locales.test.ts` | Unchanged; it checks the new keys exist in both files |

## Out of Scope

- Totals grouped by tag (`group_by=tag`). A possible follow-up, for example a "Trip 2026" breakdown by category on a tag's page.
- A tag management view: rename, merge, delete, colors. Also cleanup of unused tags. With tags created on the fly, a typo is fixed by retagging the movements, and the unused tag disappears from the suggestions.
- Inline tag editing in the table, bulk tagging, a "no tags" filter, and tags on the Dashboard's recent movements.
- Showing `movement_count`.
- Unicode normalisation (NFC versus NFD). `é` typed in two ways gives two tags, as on the backend.

## Decisions Made (2026-11-10, by the user)

| Question | Decision |
|----------|----------|
| Limits | 32 code points per name, 10 tags per movement, 20 filter items |
| Spelling | Store and show lower case. Trim and lower-case on write and in the filter (`toTagCase`) |
| Matching several tags | Both: any (default) or all, with `tag_match`, like `asset_match`. A "Match all tags" checkbox and an "All tags" chip |
| Unused tags | Not listed, and they match nothing. Rows stay on the backend. No cleanup now |
| Per-user cap | None |
| `movement_count` | All statuses |

## Open Questions

Both were answered on 2026-11-13, before implementation:

1. **Tag pills in the table:** clicking one filters by that tag. The pill stops the click from reaching the row, so the drawer doesn't open. On the cards, below 768px, the pills stay plain and a tap opens the drawer. This keeps Phase 4's `onTagPick`, `pickTag` and `movements.tags.filterBy`.
2. **Spanish word for "tag":** keep "tag" in Spanish for now, with the provisional texts above. The category texts that already use "etiqueta" stay as they are; rewording them is a later change to `es.json` alone.

The planner's other decisions were accepted as written.

## Implementation State

Implemented on 2026-11-13, uncommitted. Phases 1 to 6 of [PLAN.md](./PLAN.md) are done. Phase 7's manual browser check was not run; the fake API's tag contract was checked with `curl` in Phase 2.

- **Phase 1:** build fixtures in `src/modules/dashboard/movementText.test.ts` and `src/modules/movements/hooks.test.ts`; new `src/modules/tags/{names,names.test,types,api,hooks}.ts`; `src/modules/movements/hooks.ts` invalidates `tagKeys.all`; `src/modules/shared/api-errors.ts`, `helpers.test.ts`, `src/locales/{en,es}.json` for the two tag errors.
- **Phase 2:** `scripts/fake-api.mjs` gets tags on movements and seed data, `GET /tags`, PATCH `tags`, the `tag`/`tag_match` filters, the CSV `tags` column and the header comment.
- **Phase 3:** `src/modules/movements/{search,search.test,chips,FilterChips.test,MovementFilters,MovementsPage}.tsx` and the filter/chip texts.
- **Phase 4:** `src/modules/tags/{TagPills.tsx,names.test.ts}` (the `visibleTags` cases), `src/modules/movements/{MovementsTable,MovementCards,MovementsPage}.tsx` and the pill texts.
- **Phase 5:** new `src/modules/tags/TagsField.tsx`; `src/modules/movements/{patch,patch.test,MovementDrawer,MovementsPage}.tsx` and the drawer texts.
- **Phase 6:** new `src/modules/dashboard/{labelPatch.ts,labelPatch.test.ts}`; `src/modules/dashboard/{LabelQueue,LabelCard}.tsx` and the card texts.
- **Deviations from the PLAN:**
  - `visibleTags` and its tests landed in Phase 1, next to the other name helpers, instead of Phase 4. No behaviour change.
  - `TagsField` keeps a name that Mantine's accept-on-blur would otherwise drop when it is invalid or over the 10-tag limit, and shows the error. Without this, clicking Save would blur the input, lose the 33-code-point text, and close the drawer instead of showing the error. The pending text is what the SPEC's save criteria require.
  - `pickTag` checks the 20-tag cap and an existing name before navigating, so "changes nothing" also means no redundant history entry.
  - The label card's tags field has a small top margin, and the "Match all tags" checkbox label is 44px tall, to match the card layout and the mobile touch-target rule.
- **Checks:** `pnpm lint`, `pnpm test` and `pnpm build` pass after every phase and at the end. The final run has 29 test files and 358 tests; the build keeps the pre-existing chunk-size warning. `pnpm api:check` wasn't run, since it uses `pnpm dlx` and the regenerated `api-schema.d.ts` was already provided.
- **Manual checks still open:** every Phase 7 browser check, including the fake API's failure and delay scenarios, Spanish, and the 375px layout.
