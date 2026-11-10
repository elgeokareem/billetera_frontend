---
title: Movement Tags
spec_type: tech
type: feature
status: draft
domain: Portfolio
issue: none
created: 2026-11-07
updated: 2026-11-09
sdd_version: 7.3.0
---

# Movement Tags

## Overview

Adds tags: zero or more free labels per movement, such as `trip-2026`, `shared` or `work`, for filtering and grouping. A movement keeps at most one category, and the category alone drives spending totals, so totals always add up to what was spent. Tags never split an amount and never change a category total.

Depends on [Movements and Categories](../2026-10-30-movements-categories/SPEC.md) and [Dashboard](../2026-10-30-dashboard/SPEC.md), and on backend work that doesn't exist yet (see [Backend dependency](#backend-dependency)). Nothing here can be built until the backend ships it and `pnpm api:generate` brings the new fields into `src/modules/shared/api-schema.d.ts`.

## Definitions

- **Tag:** a name attached to a movement. A movement has 0 to 10 tags, unique ignoring case.
- **Tag name:** trimmed, 1 to 32 characters, no control characters and no comma (a comma separates the items of a list filter). Spaces inside a name are allowed. The frontend checks these rules before sending, and the backend enforces them.
- **Known tags:** the user's tags that at least one movement uses, from `GET /tags`. They feed the autocomplete. A tag no movement uses any more is gone.
- **Spelling:** a name matches a known tag ignoring case. When it does, the known tag's spelling is used, so typing `Trip-2026` when `trip-2026` exists gives `trip-2026`.

## Decisions

- **Created on the fly, no tag list to manage.** The user types a tag where they edit a movement, with autocomplete from the known tags, and a new name becomes a tag when the movement is saved. There's no Tags page and no create step. Renaming, merging and deleting tags are a follow-up (see Out of Scope).
- **Tags are names, not IDs, in the API.** The movement carries `tags: string[]`, and `PATCH` takes the whole list. This avoids a create-then-attach round trip, and the URL filter reads as text (`tag=trip-2026`).
- **Tags don't affect totals.** The Dashboard spending card, the label queue count and the Categories view are unchanged. A tag filter on Movements narrows the list, and the totals the frontend requests with it, but never re-groups amounts.
- **Look.** Tags show as Mantine `Pill`s in a neutral color (`dark.4` background), so they never look like the accent-colored category or the "Needs a label" state. Editing uses Mantine `TagsInput`, already used by the asset filter.

## Requirements

### Data layer

- `Movement` gains `tags`, from the regenerated schema. `MovementPatch` gains `tags`.
- `src/modules/tags/` holds `api.ts` (`GET /tags`), `hooks.ts` (`useTags`, query key `["tags"]`), and a name helper next to `isValidCategoryName`: `isValidTagName`, plus `normaliseTags(items, known)`, which trims, drops invalid names, drops repeats ignoring case (the first one wins), applies the known spelling, and keeps at most 10.
- `useUpdateMovement` also invalidates `["tags"]` once a save settles, since a save can add a tag or leave one unused.
- New error texts go in `KNOWN_ERRORS` of `api-errors.ts`: `invalid tag` and `too many tags` (see Backend dependency). The backend's `routes/openapi_spec_test.go` lists those texts, so the backend change adds them there.

### Movements view (`/movements`)

**List**

- Desktop table: the tags show as pills under the reason, in the reason cell, so the table keeps its columns and its 760px minimum width. At most 3 pills, then a `+N` pill. The reason cell shows "—" only when there's no reason and no tag.
- In the table, a pill is a button: clicking it adds that tag to the `tag` filter. The row's click handler already ignores buttons, so it doesn't open the drawer. Its label reads "Filter by tag trip-2026".
- Below 768px, cards: the pills show on their own line under the reason, wrapping, with the same 3 plus `+N` limit. They're plain pills, not buttons, since the whole card is a button. A tap opens the drawer.
- A movement with no tags shows no pill and no placeholder.

**Filter**

| Filter | Param | Notes |
|--------|-------|-------|
| Tag | `tag` | Multi-value. A `TagsInput` with the known tags as suggestions. Matches movements with any of the tags |

- `search.ts` reads `tag` as a comma list: each item must be a valid tag name, at most 20 items, repeats ignoring case dropped. Case is kept as written. `toMovementsQuery` passes it on, so the export gets it too. The existing `readList` and `unique` in `search.ts` drop repeats case-sensitively (a `Set` of the raw strings), so `tag` needs its own dedupe, keyed on `item.toLocaleLowerCase()` with the first spelling kept. The same applies to `withList` when the tag filter changes, and to chip removal.
- Typed text that's not a known tag is still a valid filter, and simply matches nothing.
- `chips.ts` adds one chip per tag, "Tag: trip-2026", built with the existing `labelled` helper, removable on its own like a category chip.
- The "Needs a label" preset keeps replacing every filter, `tag` included.
- The filter goes in the existing `SimpleGrid` as its own `FilterGroup`, after Category.

**Editing (drawer)**

- Below Category, a `TagsInput` labelled "Tags", with the known tags as suggestions, `,` and Enter splitting, and a "Up to 10 tags" description.
- On each change, the list goes through `normaliseTags`. A name that's too long, or has a forbidden character, isn't added, and the input shows "Tags are 1 to 32 characters, without commas". The 11th tag isn't added and the input says so.
- `patchFor` compares the normalised list with the movement's tags, ignoring order: when they differ, the body has the whole new list under `tags`, and all removed means `"tags": []`. Unchanged tags aren't sent, so a category-only change has no `tags` key.
- The save, its error alert and the rest of the drawer behave as today.
- No inline tag editing in the table. Category stays the only inline control.

### Dashboard label cards

- Under the reason field, an optional `TagsInput` labelled "Tags (optional)", with the same suggestions and rules as the drawer.
- Typed tags live in `LabelQueue`, like the typed reason, so they survive a failed save.
- Picking a category sends the tags in the same `PATCH`, only when the list differs from the movement's. Creating a category from the card works the same way.
- Undo clears the category only. Tags, like a saved reason, stay.
- Recent movements on the Dashboard don't show tags.

### States

- **Tags loading:** the inputs work with no suggestions. Filter chips show the tag names from the URL, which need no lookup.
- **Tags failed to load:** the inputs still work, with no suggestions and no error shown. The movements list isn't affected.
- **No known tags:** the inputs show the placeholder "Add a tag, such as trip-2026", and suggestions are empty.
- **Empty list with a tag filter:** the existing "Nothing matches" state, with Clear all.
- **Save fails:** the drawer's alert, or the card's, with the translated error. The typed tags stay.

### Translations (EN and ES)

`movements.filters.tag`, `movements.filters.tagPlaceholder`, `movements.tags.filterBy`, `movements.tags.more` (`+{{count}}`), `movements.drawer.tags`, `movements.drawer.tagsHelp`, `movements.drawer.tagsPlaceholder`, `movements.drawer.tagInvalid`, `movements.drawer.tagsLimit`, `dashboard.card.tagsLabel`, `errors.invalidTag`, `errors.tooManyTags`. `locales.test.ts` already checks both files have the same keys. Tag names themselves are the user's text and are never translated.

### Mobile

- The drawer is already full width below 768px. The `TagsInput` is full width, with a 44px minimum height like the other inputs.
- Card pills wrap, and never push the amount column off screen.
- On the label card, the tags input is full width under the reason.

## Backend dependency

**Proposals, not the current contract.** Today `PATCH /movements/:id` takes only `reason` and `category_id`, and movements have only `category_id`. This section is written to be handed to the backend repo as the starting point of its own spec. Names and limits can change there, and this spec follows whatever ships.

**Model**

- A user's tags are unique ignoring case, like category names. A movement links to 0 to 10 of them.
- A tag no movement uses is deleted, or at least hidden from `GET /tags`.
- Syncs never change tags, as they never change a reason or a category.
- Deleting a category doesn't touch tags.

**Movement response**

- `GET /movements`, `GET /movements/:id` and the `PATCH` response carry `"tags": ["shared", "trip-2026"]`: always present, `[]` when none, sorted by name ignoring case.

**`PATCH /movements/:id`**

- `{"tags": ["trip-2026", "shared"]}` replaces the movement's tags, and `{"tags": []}` clears them. A key left out keeps its value. `tags` can come with `reason` and `category_id` in one request, and counts as the "at least one" key.
- Each name is trimmed, must be 1 to 32 characters with no control characters and no comma, or it's 400 `invalid tag`. More than 10 distinct names is 400 `too many tags`. Repeats ignoring case count once. `null` for `tags` is 400 `invalid tag`.
- A name that matches an existing tag ignoring case attaches that tag, keeping its stored spelling. A new name creates the tag.

**Filters**

- `tag` on `GET /movements`, `GET /movements/totals` and `GET /movements/export`: a comma list of up to 20 names, matched ignoring case. A movement matches when it has any of them. AND with the other filters, like every filter. A bad, empty or repeated value is 400 `invalid tag`, like the other filters.
- The export CSV gets a `tags` column, the names joined by `, `, with the same leading-character escape as other cells.

**`GET /tags`**

- Returns `{"tags": [{"name": "trip-2026", "movement_count": 12}]}`, the tags at least one of the user's movements uses, sorted by name ignoring case. No paging.
- Needs a login and gets the same 401, 403 and 500 entries as the other routes, an `@ID` such as `tags.list`, and a regenerated OpenAPI file.

**Counts and tests the backend change must update**

- `README.md` says `docs/openapi/openapi.json` "documents all 23 routes". `GET /tags` makes it 24.
- The frontend error texts go from 17 to 19 (`invalid tag`, `too many tags`). In `../backend/routes/openapi_spec_test.go`: the `frontendErrorTexts` list and its comment ("the 17 texts", around line 28), and `TestFrontendErrorTexts_InSource`, which checks `len(frontendErrorTexts) != 17` (around lines 674-679). The README line "update the 17 texts in `routes/openapi_spec_test.go`" changes too.
- The export: `csvHeader` in `../backend/modules/movements/export.go` gets `tags`, appended after the USD columns (new columns are only ever appended there). `TestCSVHeader_MatchesJSONFields` (`modules/movements/export_test.go`, around lines 180-197) requires every header to be a JSON field of `MovementResponse` and the counts to match, so `tags` must be added to both. `TestOpenAPI_ExportResponses` (`routes/openapi_spec_test.go`, around lines 634-667) checks the export's HTTP response headers (four today); a new CSV column doesn't change them, so it only changes if the export also gets a new HTTP header.

**Not needed now**

- `group_by=tag` on totals, tag rename, merge or delete routes, and a `none` value for `tag`. See Out of Scope.

## Acceptance Criteria

- **Given** a movement with tags, **when** the Movements view loads, **then** the table shows its first 3 tags as pills under the reason, plus `+N` for the rest, and a card shows them on their own line.
- **Given** the table, **when** the user clicks a tag pill, **then** that tag is added to the `tag` filter, the URL has `tag=<name>`, and the drawer doesn't open.
- **Given** `?tag=trip-2026,shared` in the URL, **when** the page loads, **then** two chips "Tag: trip-2026" and "Tag: shared" show, the request has `tag=trip-2026,shared`, and removing one chip keeps the other.
- **Given** a tag filter, **when** Export is clicked, **then** the export request has the same `tag` value.
- **Given** a hand-typed URL with an invalid tag, such as one longer than 32 characters, **when** the page loads, **then** that item is dropped and the valid ones stay.
- **Given** the known tag `trip-2026`, **when** the user types `Trip-2026` in the drawer and saves, **then** the request sends `"tags": ["trip-2026"]`.
- **Given** a movement with tags, **when** only its category changes in the drawer or in the table, **then** the request doesn't contain `tags`.
- **Given** a movement with tags `a` and `b`, **when** the user removes `b` and saves, **then** the request sends `"tags": ["a"]`, and removing both sends `"tags": []`.
- **Given** a movement with 10 tags, **when** the user adds another, **then** it isn't added and the input says the limit is 10.
- **Given** a label card with tags typed, **when** the user picks a category, **then** one `PATCH` sends the category and the tags, and Undo clears only the category.
- **Given** a label card save that fails, **then** the card comes back with the error and the typed tags.
- **Given** `GET /tags` fails, **then** the tag inputs still work without suggestions, and the movements list shows normally.
- **Given** a movement gets a new tag, **when** the save settles, **then** the tag appears in the suggestions without a reload.
- **Given** movements with tags, **then** the Dashboard spending card, the label count and the Categories view show the same totals as without tags.
- **Given** the 400 `invalid tag` or `too many tags` errors, **then** the user sees a translated message, in EN and ES.
- **Given** a screen narrower than 768px, **then** the drawer's tags input is full width and at least 44px tall, and card pills wrap without hiding the amount.

## Out of Scope

- Totals grouped by tag (`group_by=tag`): a possible follow-up, for example a "Trip 2026" breakdown by category on a tag's page.
- A tag management view: rename, merge, delete, colors. With tags created on the fly, a typo is fixed by retagging the movements, and the unused tag disappears.
- Inline tag editing in the table, bulk tagging, AND matching of several tags, a "no tags" filter, and tags on Dashboard recent movements.

## Open Questions

1. **Limits:** are 32 characters per name and 10 tags per movement right? Categories allow 64 characters.
2. **Spelling:** keep the first spelling a tag was typed with (the proposal), or store tags in lower case?
3. **Matching several tags:** any of them (the proposal, as every other list filter works), or all of them? An `tag_match=all` param could come later.
4. **Tag pills in the table:** should clicking one filter by it (the proposal), or open the drawer like the rest of the row?
5. **Unused tags:** delete a tag when its last movement drops it (the proposal), or keep it for autocomplete until a manage view exists?
