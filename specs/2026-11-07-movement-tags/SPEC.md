---
title: Movement Tags
spec_type: tech
type: feature
status: draft
domain: Portfolio
issue: none
created: 2026-11-07
updated: 2026-11-10
sdd_version: 7.3.0
---

# Movement Tags

## Overview

This adds tags: zero or more free labels per movement, such as `trip-2026`, `shared` or `work`, for filtering and grouping.

- A movement keeps at most one category, and the category alone drives spending totals. So totals always add up to what was spent.
- Tags never split an amount and never change a category total.

Depends on [Movements and Categories](../2026-10-30-movements-categories/SPEC.md) and [Dashboard](../2026-10-30-dashboard/SPEC.md). It also depends on the backend change `../backend/specs/2026-11-10-movement-tags/SPEC.md` (planned, see [Backend dependency](#backend-dependency)). Nothing here can be built until the backend ships it and `pnpm api:generate` brings the new fields into `src/modules/shared/api-schema.d.ts`.

## Definitions

- **Tag:** a lower-case name attached to a movement. A movement has 0 to 10 tags, all different.
- **Tag name:** a typed name is normalised in this order:
  1. Trimmed (`String.prototype.trim`).
  2. Lower-cased with `toTagCase`.
  3. Checked. It must be 1 to 32 code points (`[...name].length`, not `.length`), with no control character (`/\p{Cc}/u`) and no comma, since a comma separates the items of a list filter.

  Spaces inside a name are allowed. The frontend checks these rules before sending, and the backend enforces them. The backend's answer is the source of truth: the API only ever returns lower-case names.
- **`toTagCase`:** the backend lower-cases with Go `strings.ToLower`, which is the Unicode simple lowercase of each code point. JS `toLowerCase` uses the full mapping, which differs only for `İ` (U+0130 becomes `i` plus a combining dot). So the helper is:

  ```ts
  Array.from(text, (c) => (c === "İ" ? "i" : c.toLowerCase())).join("")
  ```

  Mapping one code point at a time also avoids the final-sigma rule.
- **Known tags:** the user's tags that at least one movement uses, from `GET /tags`. They feed the autocomplete. A tag no movement uses any more isn't listed.

## Decisions

- **Created on the fly, no tag list to manage.** The user types a tag where they edit a movement, with autocomplete from the known tags. A new name becomes a tag when the movement is saved. There's no Tags page and no create step. Renaming, merging and deleting tags are a follow-up (see Out of Scope).
- **Tags are lower-case names, not IDs, in the API.** The movement carries `tags: string[]`, and `PATCH` takes the whole list. This avoids a create-then-attach round trip, and the URL filter reads as text (`tag=trip-2026`). Typing `Trip-2026` gives `trip-2026` (user decision, 2026-11-10).
- **Any or all.** The tag filter matches movements with any of the tags by default. A checkbox switches it to all of them (`tag_match=all`). This works like the coin filter's "Include the other side of a Convert" checkbox (`asset_match`).
- **Tags don't affect totals.** The Dashboard spending card, the label queue count and the Categories view are unchanged. A tag filter on Movements narrows the list and the totals the frontend requests with it. It never re-groups amounts, and a movement with several matching tags counts once.
- **Look.** Tags show as Mantine `Pill`s in a neutral color (`dark.4` background), so they never look like the accent-colored category or the "Needs a label" state. Editing uses Mantine `TagsInput`, which the asset filter already uses.

## Requirements

### Data layer

- `Movement` gains `tags`, from the regenerated schema. `MovementPatch` gains `tags`.
- `MovementsQuery` gains `tag` and `tag_match` from the regenerated schema.
- `src/modules/tags/` holds:
  - `api.ts`: `GET /tags`.
  - `hooks.ts`: `useTags`, with query key `["tags"]`.
  - A name module next to `isValidCategoryName`:
    - `toTagCase(text)`, as in Definitions.
    - `normaliseTagName(text)`: trims, applies `toTagCase`, then checks the rules. It returns the name or `undefined`.
    - `normaliseTags(items)`: normalises each item, drops the invalid ones, drops repeats (exact, after normalising), and keeps at most 10.
- `useUpdateMovement` also invalidates `["tags"]` once a save settles, since a save can add a tag or leave one unused.
- New error texts go in `KNOWN_ERRORS` of `api-errors.ts`: `invalid tag` (`errors.invalidTag`) and `too many tags` (`errors.tooManyTags`). That makes 19 texts. The backend's `routes/openapi_spec_test.go` copies the list, and the backend change updates it to 19.
- `invalid tag_match` isn't mapped. Like `invalid asset_match`, it can't happen, because the URL parser only lets valid values through.

### Movements view (`/movements`)

**List**

- **Desktop table:** the tags show as pills under the reason, inside the reason cell. The table keeps its columns and its 760px minimum width.
  - At most 3 pills show, then a `+N` pill.
  - The reason cell shows "—" only when there's no reason and no tag.
- **Pills in the table are buttons** (pending Open Question 1). Clicking one adds that tag to the `tag` filter. The row's click handler already ignores buttons, so the click doesn't open the drawer. The button's label reads "Filter by tag trip-2026".
- **Below 768px (cards):** the pills show on their own line under the reason, wrapping, with the same 3 plus `+N` limit. They're plain pills, not buttons, since the whole card is a button. A tap opens the drawer.
- A movement with no tags shows no pill and no placeholder.

**Filter**

| Filter | Param | Notes |
|--------|-------|-------|
| Tag | `tag` | Multi-value. A `TagsInput` with the known tags as suggestions. Matches movements with any of the tags, or all of them with `tag_match=all` |
| Match all tags | `tag_match` | A checkbox under the tag input, "Match all tags". It writes `tag_match=all`, or nothing for the default `any`. It's disabled when there's no tag |

- `search.ts` reads `tag` as a comma list with the existing `readList`:
  - Its `normalise` argument is `(item) => normaliseTagName(item) ?? ""`, as `asset` passes `toUpperCase`. Its `keep` argument is `(item) => item !== ""`, which drops invalid items.
  - `readList` normalises before `unique`, and `unique` keeps at most 20. Names are already lower-cased at that point, so the existing case-sensitive `unique` drops repeats correctly, and `tag` needs no dedupe of its own.
  - `withList(search, "tag", ...)` normalises its items the same way.
- `tag_match` follows the `asset_match` rule (review-fixes R11):
  - `MovementsSearch.tag_match?: "all"`.
  - `parseMovementsSearch` keeps `tag_match` only when it's `all` and `tag` survived parsing.
  - `withList(search, "tag", [])` and `withoutKey(search, "tag")` also remove `tag_match`.
  - `FILTER_KEYS` gains `tag` and `tag_match`.
- `toMovementsQuery` passes `tag` and `tag_match` on, so the export and the totals get them too.
- A typed name that isn't a known tag is still a valid filter. It simply matches nothing, and with `all` it makes the whole filter match nothing.
- `chips.ts`:
  - One chip per tag, "Tag: trip-2026", built with the existing `labelled` helper. Each is removable on its own, like a category chip. Removing the last tag chip also drops `tag_match`.
  - A chip "All tags" when `tag_match=all`, removable. Removing it goes back to `any`, as the `asset_match` chip does.
- The "Needs a label" preset keeps replacing every filter, `tag` and `tag_match` included.
- The filter goes in the existing `SimpleGrid` as its own `FilterGroup`, after Category. The input and the checkbox go in the same group, as in the coin filter.

**Editing (drawer)**

- Below Category, a `TagsInput` labelled "Tags". It has the known tags as suggestions, splits on `,` and Enter, and has the description "Up to 10 tags".
- On each change, the list goes through `normaliseTags`, so a typed `Trip-2026` shows as `trip-2026`.
  - A name that's too long, or has a forbidden character, isn't added. The input shows "Tags are 1 to 32 characters, without commas".
  - An 11th tag isn't added, and the input says so.
- `patchFor` compares the normalised list with the movement's tags, ignoring order.
  - When they differ, the body has the whole new list under `tags`. Removing them all sends `"tags": []`.
  - Unchanged tags aren't sent, so a category-only change has no `tags` key.
- The save, its error alert and the rest of the drawer behave as today.
- There's no inline tag editing in the table. Category stays the only inline control.

### Dashboard label cards

- Under the reason field, an optional `TagsInput` labelled "Tags (optional)", with the same suggestions and rules as the drawer.
- Typed tags live in `LabelQueue`, like the typed reason, so they survive a failed save.
- Picking a category sends the tags in the same `PATCH`, but only when the list differs from the movement's. Creating a category from the card works the same way.
- Undo clears the category only. Tags stay, like a saved reason.
- Recent movements on the Dashboard don't show tags.

### States

- **Tags loading:** the inputs work, with no suggestions. Filter chips show the tag names from the URL, which need no lookup.
- **Tags failed to load:** the inputs still work, with no suggestions and no error shown. The movements list isn't affected.
- **No known tags:** the inputs show the placeholder "Add a tag, such as trip-2026", and there are no suggestions.
- **Empty list with a tag filter:** the existing "Nothing matches" state, with Clear all.
- **Save fails:** the drawer's alert, or the card's, with the translated error. The typed tags stay.

### Translations (EN and ES)

These keys are new:

- `movements.filters.tag`
- `movements.filters.tagPlaceholder`
- `movements.filters.tagMatch` ("Match all tags")
- `movements.chips.tagMatch` ("All tags")
- `movements.tags.filterBy`
- `movements.tags.more` (`+{{count}}`)
- `movements.drawer.tags`
- `movements.drawer.tagsHelp`
- `movements.drawer.tagsPlaceholder`
- `movements.drawer.tagInvalid`
- `movements.drawer.tagsLimit`
- `dashboard.card.tagsLabel`
- `errors.invalidTag`
- `errors.tooManyTags`

`locales.test.ts` already checks that both files have the same keys. Tag names themselves are the user's text and are never translated.

### Mobile

- The drawer is already full width below 768px. The `TagsInput` is full width, with a 44px minimum height like the other inputs. So is the "Match all tags" checkbox's touch target.
- Card pills wrap, and never push the amount column off screen.
- On the label card, the tags input is full width under the reason.

## Backend dependency

The contract is in `../backend/specs/2026-11-10-movement-tags/SPEC.md` (planned, decisions made on 2026-11-10). In short:

**Model**

- A user's tags are lower-case names, unique per user. A movement links to 0 to 10 of them. There's no cap per user.
- A tag no movement uses stays stored but isn't listed by `GET /tags` and matches nothing. Cleanup is future work.
- Syncs never change tags, just as they never change a reason or a category. Deleting a category doesn't touch tags.

**Movement response**

- `GET /movements`, `GET /movements/:id` and the `PATCH` response carry `"tags": ["shared", "trip-2026"]`, right after `category_id`.
- `tags` is always present: `[]` when there are none, never `null`. The names are lower case and sorted.

**`PATCH /movements/:id`**

- `{"tags": ["Trip-2026", "shared"]}` replaces the movement's tags, and they're saved and returned as `["shared", "trip-2026"]`. `{"tags": []}` clears them. A key left out keeps its value.
- `tags` can come with `reason` and `category_id` in one request, and it counts as the "at least one" key.
- Each name is trimmed and lower-cased (Go `strings.ToLower`). It must be 1 to 32 code points, with no control character and no comma, or the answer is 400 `invalid tag`. `null`, or anything other than an array of strings, is also 400 `invalid tag`.
- Repeats count once. More than 10 distinct names is 400 `too many tags`.
- Errors come in this order: `invalid reason`, `invalid category_id`, `invalid tag`, `too many tags`.

**Filters**

- `tag` on `GET /movements`, `GET /movements/totals` and `GET /movements/export`: a comma list of up to 20 names, each trimmed and lower-cased.
  - 400 `invalid tag` for an invalid item, an empty item, an empty value, a repeated parameter (`tag=a&tag=b`), or more than 20 items.
  - Repeated items (`tag=a,A`) are allowed and count once.
- `tag_match`: `any` (default) or `all`, like `asset_match`. Anything else, an empty value or a repeated parameter is 400 `invalid tag_match`. Without `tag`, it changes nothing.
- Both are ANDed with the other filters. A movement is listed and counted once in totals, however many of its tags match.
- The export CSV gets a `tags` column as the last one, after `fee_usd_value`. The names are joined by `", "`, with the same leading-character escape as other cells.

**`GET /tags`**

- Returns `{"tags": [{"name": "trip-2026", "movement_count": 12}]}`. These are the tags at least one movement uses, sorted by name. `movement_count` counts movements of every status. Items have no `id`. There's no paging.
- Needs a login. It answers 401, 403 and 500 (`could not list tags`) like the other routes. The `operationId` is `tags.list`.

**Counts on the backend side:** 24 routes, 21 authenticated routes, and 19 frontend error texts in `routes/openapi_spec_test.go`.

**Not needed now:** `group_by=tag` on totals, routes to rename, merge or delete tags, a `none` value for `tag`, and cleanup of unused tags.

## Acceptance Criteria

- **Given** a movement with tags, **when** the Movements view loads, **then** the table shows its first 3 tags as pills under the reason, plus `+N` for the rest, and a card shows them on their own line.
- **Given** the table, **when** the user clicks a tag pill, **then** that tag is added to the `tag` filter, the URL has `tag=<name>`, and the drawer doesn't open.
- **Given** `?tag=trip-2026,shared` in the URL, **when** the page loads, **then**:
  - two chips show, "Tag: trip-2026" and "Tag: shared";
  - the request has `tag=trip-2026,shared`;
  - removing one chip keeps the other.
- **Given** `?tag=Trip-2026,TRIP-2026` in the URL, **when** the page loads, **then** the search holds `tag=trip-2026` and one chip shows.
- **Given** a tag filter, **when** the user checks "Match all tags", **then** the URL and the request have `tag_match=all`, and an "All tags" chip shows. Removing that chip removes `tag_match`. Removing the last tag chip removes both `tag` and `tag_match`.
- **Given** `?tag_match=all` without `tag`, or `?tag=a&tag_match=any`, **when** the page loads, **then** the search has no `tag_match`, and the checkbox is unchecked. Without `tag`, the checkbox is also disabled.
- **Given** a tag filter with `tag_match=all`, **when** Export is clicked, **then** the export request has the same `tag` and `tag_match`.
- **Given** a hand-typed URL with an invalid tag, such as one longer than 32 code points, **when** the page loads, **then** that item is dropped and the valid ones stay.
- **Given** the user types `Trip-2026` in the drawer and saves, **then** the input shows `trip-2026` and the request sends `"tags": ["trip-2026"]`.
- **Given** a name with 32 emoji, **then** it's accepted (32 code points), and one with 33 isn't.
- **Given** a movement with tags, **when** only its category changes in the drawer or in the table, **then** the request doesn't contain `tags`.
- **Given** a movement with tags `a` and `b`, **when** the user removes `b` and saves, **then** the request sends `"tags": ["a"]`. Removing both sends `"tags": []`.
- **Given** a movement with 10 tags, **when** the user adds another, **then** it isn't added, and the input says the limit is 10.
- **Given** a label card with tags typed, **when** the user picks a category, **then** one `PATCH` sends the category and the tags, and Undo clears only the category.
- **Given** a label card save that fails, **then** the card comes back with the error and the typed tags.
- **Given** `GET /tags` fails, **then** the tag inputs still work without suggestions, and the movements list shows normally.
- **Given** a movement gets a new tag, **when** the save settles, **then** the tag appears in the suggestions without a reload.
- **Given** movements with tags, **then** the Dashboard spending card, the label count and the Categories view show the same totals as without tags.
- **Given** the 400 `invalid tag` or `too many tags` errors, **then** the user sees a translated message, in EN and ES.
- **Given** a screen narrower than 768px, **then** the drawer's tags input is full width and at least 44px tall, and card pills wrap without hiding the amount.

## Out of Scope

- Totals grouped by tag (`group_by=tag`). A possible follow-up, for example a "Trip 2026" breakdown by category on a tag's page.
- A tag management view: rename, merge, delete, colors. Also cleanup of unused tags. With tags created on the fly, a typo is fixed by retagging the movements, and the unused tag disappears from the suggestions.
- Inline tag editing in the table, bulk tagging, a "no tags" filter, and tags on the Dashboard's recent movements.

## Decisions Made (2026-11-10, by the user)

| Question | Decision |
|----------|----------|
| Limits | 32 code points per name, 10 tags per movement, 20 filter items |
| Spelling | Store and show lower case. Trim and lower-case on write and in the filter (`toTagCase`) |
| Matching several tags | Both: any (default) or all, with `tag_match`, like `asset_match` |
| Unused tags | Not listed, and they match nothing. Rows stay on the backend. Cleanup is future work |
| Per-user cap | None |
| `movement_count` | All statuses |

## Open Questions

1. **Tag pills in the table:** should clicking one filter by it (the proposal), or open the drawer like the rest of the row?
