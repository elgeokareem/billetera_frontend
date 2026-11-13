---
title: Categories and Tags Page
spec_type: tech
type: feature
status: draft
domain: Portfolio
issue: none
created: 2026-11-13
updated: 2026-11-13
sdd_version: 7.3.0
---

# Categories and Tags Page

## Problem

Tags ([Movement Tags](../2026-11-07-movement-tags/SPEC.md)) can only be made by typing them on a movement, and can't be renamed, recolored or deleted. All tags look the same (gray pills). The user wants to manage tags next to categories, and wants each tag to have its own color: random at creation, editable later.

This change turns the Categories page (`/categories`) into **Categories and tags**: categories on the left, tags on the right. The tags column mirrors the categories column (create, rename, delete) and adds a movement count, a link to the tag's movements, and a color picker. Tags are drawn in their color everywhere they appear.

## Backend dependency

This needs `../backend/specs/2026-11-13-tag-management/SPEC.md` to be built, then `pnpm api:generate`. What it gives (see that SPEC for the exact rules):

- `GET /tags` → `{"tags": [{"id": 7, "name": "trip-2026", "color": "teal", "movement_count": 12}]}`. Every tag of the user, **including ones with `movement_count` 0**, sorted by name.
- `POST /tags` `{"name": "...", "color"?: "..."}` → 201 `{"tag": {...}}`. Without `color`, the backend picks a random one. A movement save that names a new tag also gives it a random color.
- `PATCH /tags/:id` `{"name"?: "...", "color"?: "..."}` → 200 `{"tag": {...}}`. Renaming changes the name on every movement at once.
- `DELETE /tags/:id` → 204. The tag is removed from every movement that had it. No count is returned; the confirmation uses `movement_count` from `GET /tags`.
- Errors: 400 `invalid tag` (name rule, already mapped to `errors.invalidTag`), 409 `tag already exists`, 404 `tag not found`. `invalid body` and `invalid color` can't happen with the bodies this app sends, and fall to `errors.generic`.
- `color` is one of 12 Mantine theme color names: `red, pink, grape, violet, indigo, blue, cyan, teal, green, lime, yellow, orange`. The generated type is that union.
- Movement responses keep `tags: string[]`. The frontend finds each tag's color by name in the cached `GET /tags` (backend D8).
- Names are trimmed and lower-cased; `normaliseTagName` in `src/modules/tags/names.ts` already applies the backend's rule.

## Current state

- `src/routes/_app/categories.tsx` renders `CategoriesPage` (`src/modules/categories/CategoriesPage.tsx`): title, subtitle, a create form, the category list (name links to `/movements?category_id=`, this month's spending, rename inline, delete with a `Modal`), and an empty state with suggestions. Duplicates are shown inline under the field (`errors.categoryExists` from the 409).
- `src/modules/movements/NewCategoryField.tsx` checks a duplicate before sending (`newCategoryNameError`, lower-case compare) and shows `errors.categoryExists` as a **toast**, keeping the typed name in the field. Other errors stay under the field.
- `src/modules/tags/`: `api.ts` (`fetchTags`), `hooks.ts` (`tagKeys`, `useTags`), `names.ts` (`toTagCase`, `normaliseTagName`, …), `types.ts` (`Tag`, "a tag has no ID"), `TagPills.tsx` (gray Mantine `Pill`s, used by `MovementsTable` and `MovementCards`), `TagsField.tsx` (Mantine `TagsInput`, used by `MovementDrawer` and `LabelCard`).
- `useUpdateMovement` already invalidates `tagKeys.all` after a movement save.
- `src/modules/movements/search.ts`: `/movements?tag=<name>` is a valid search (`parseMovementsSearch` normalises it).
- Nav: `AppLayout.tsx` uses `nav.categories`. The page `<Title>` uses `categories.title`. The app has no `document.title`.
- `RootLayout` forces the dark color scheme. Mantine is 9.7.4: `TagsInput` has `renderPill`; `Pill` has no `color` prop; `Badge` has `color` and `variant`.
- Spanish (`es.json`) already calls tags **"tags"** ("Tags", "Filtrar por el tag", "Añade un tag"). "Etiqueta" is already used for the *label* concept (a category on a spending movement: "Sin etiqueta", "necesita una etiqueta").

## Scope

- In: the page at `/categories` (layout, tags column), tag colors on every tag pill (table, cards, drawer and label-card inputs, tags column), the data layer for tag create/update/delete, the fake API, translations.
- Out: the URL stays `/categories`. Filter chips for tags stay as they are (gray, plain text); coloring them is optional future polish. No merge. No colors on categories. No bulk delete of unused tags.

## Behaviour

### Page

| # | Rule |
|---|------|
| P1 | Title (`<Title order={1}>`) "Categories and tags" / "Categorías y tags" (`categories.title`). Subtitle (`categories.subtitle`) explains both: categories say what a movement was for and drive spending; tags are extra labels for finding movements. |
| P2 | Nav label (`nav.categories`) "Categories and tags" / "Categorías y tags". |
| P3 | From Mantine's `md` breakpoint (992px) up, two columns of equal width (`SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg"`), categories left, tags right, aligned to the top. Below `md`, one column, categories first. (`md`, not `sm`: from `sm` the 220px navbar is shown, and two columns would be too narrow for a category row's spending and two 44px buttons.) |
| P4 | Each column has a heading (`<Title order={2}>`, "Categories" / "Tags") and a one-line description. The categories description is the old page subtitle. Then its create form, then its list. The two columns load, fail and retry independently. |
| P5 | The categories column behaves exactly as today (create, rename, delete, spending, empty state, inline errors). Only its placement and heading change. |

### Tags column

| # | Rule |
|---|------|
| T1 | **Loading:** `SectionSkeleton lines={4}`. **Error:** `SectionError` with retry (`useTags().refetch`). The categories column is unaffected. |
| T2 | **Empty** (`[]`): a `Paper` with title "No tags yet" and body "Create a tag here, or add tags to a movement from its details." No suggestions. The create form above stays usable. |
| T3 | **Create form:** a `Paper` with a `TextInput` ("New tag name", placeholder "For example, trip-2026") and a `PrimaryButton` "Create", as the categories form. On submit, `newTagNameError(name, tags)` (Design): `errors.invalidTag` shows under the field; `errors.tagExists` shows as `toast.error` and the field keeps the text (the `NewCategoryField` pattern). Otherwise `POST /tags` with `{name}` only (the backend picks the color). Success clears the field. A 409 from the server is handled like the local duplicate (toast, keep text); any other error shows under the field (`getApiErrorKey`). While pending, the field is disabled and the button shows its loader. |
| T4 | **List:** a `Paper` with one row per tag, in API order (by name), rows separated as the categories rows are. A row has: the color button (T7), the tag as a colored badge that is a link to `/movements?tag=<name>` (`<Link to="/movements" search={{ tag: tag.name }}>`), the count ("1 movement" / "12 movements", `tags.movementCount`, dimmed, not masked by Hide Balances since it isn't money), and rename and delete `ActionIcon`s (44px, `aria-label` "Rename {{name}}" / "Delete {{name}}"). A tag with count 0 still links (the list will be empty). Long names truncate. |
| T5 | **Rename:** inline, as categories: the row turns into a `TextInput` (autofocus, Escape cancels) with Save and Cancel. On save: `newTagNameError(name, tags, tag.id)`. A name whose normalised form equals the current name closes without a request. `errors.tagExists` (local or 409) is a toast, the field stays open with the text; other errors stay under the field. `PATCH /tags/:id {name}`. |
| T6 | **Delete:** a `Modal` titled "Delete {{name}}?". Body: when `movement_count` is 0, "No movement has this tag."; otherwise "{{count}} movement will lose this tag." / "{{count}} movements will lose this tag." (plural keys). Then "Their categories, reasons and other tags stay." Buttons: Cancel, and a red "Delete tag" with a loader. Success: toast "Tag deleted.". Failure: `toast.error(t(getApiErrorKey(error)))`. The modal closes either way. The count is the one the list shows; if another tab changed it since, the message may be off by that much (accepted). |
| T7 | **Color:** a 44px `UnstyledButton`/`ActionIcon` holding a `ColorSwatch` (20px) of the tag's color, `aria-label` "Change the color of {{name}}". It opens a `Popover` with the 12 palette colors as `ColorSwatch` buttons in a 4×3 grid (`aria-label` the translated color name, the current one shows a check icon, each with a 36px+ hit area). Choosing one closes the popover and sends `PATCH /tags/:id {color}` with an **optimistic update**: the cache changes at once, and on failure it rolls back and shows `toast.error` ("The color wasn't saved."). Choosing the current color does nothing. |
| T8 | After a create or a color change, only `tagKeys.all` is refetched (no movement changes). After a rename or a delete, `tagKeys.all` and `movementKeys.all` are invalidated (movement lists, totals and drawers show the new name, or lose the tag). |

### Tag colors everywhere

| # | Rule |
|---|------|
| C1 | A tag's color is looked up by name in `useTags()` data. A name not in the list (still loading, failed, or just typed in an input and not saved yet), or a color outside the palette, is drawn **gray**. |
| C2 | Display pills use Mantine `Badge` with `color={color}`, `variant="light"`, `radius="xl"`, `size="sm"` and `tt="none"` (Badge upper-cases by default; tags must show as stored). The **light variant** gives a tinted background with text in the same hue, and Mantine computes both for the active color scheme (`--mantine-color-<c>-light` and `--mantine-color-<c>-light-color`), so contrast is handled by Mantine in dark and light schemes alike. That is why colors are palette names and not free hex. |
| C3 | `TagPills` (Movements table and cards): each shown tag uses C2. The "+N" pill stays neutral (gray light). Clickable pills in the table keep their button, `aria-label` and `stopPropagation`. |
| C4 | `TagsField` (movement drawer, Dashboard label card): `TagsInput`'s `renderPill` draws each chosen tag as a Mantine `Pill` (keeping `withRemoveButton` and `onRemove`, so remove and Backspace behave as before), styled with `tagColorStyle(color)`: the same two CSS variables as the light Badge. `Pill` has no `color` prop, hence the style. A tag typed and not yet saved is gray (C1) until the save refetches the tags. Disabled inputs hide the remove button as today. |
| C5 | Tags column: the tag name badge uses C2. |

## Design

### Data layer (`src/modules/tags/`)

- `types.ts`: `Tag = Schemas["tags.TagResponse"]` (now with `id` and `color`); `TagColor = Tag["color"]`. Update the file comment (tags now have an ID).
- `colors.ts` (new):
  - `TAG_COLORS: readonly TagColor[]`, the 12 in the backend's order (`red, pink, grape, violet, indigo, blue, cyan, teal, green, lime, yellow, orange`).
  - `tagColor(value: string | undefined): TagColor | "gray"`: the value when it's in `TAG_COLORS`, else `"gray"`.
  - `tagColorStyle(color: string): CSSProperties`: `{ backgroundColor: "var(--mantine-color-<c>-light)", color: "var(--mantine-color-<c>-light-color)" }`.
  - `tagColorLookup(tags: readonly Tag[] | undefined): (name: string) => TagColor | "gray"`: a `Map` by name; missing → gray.
- `manage.ts` (new): `newTagNameError(name: string, tags: readonly Tag[], exceptId?: number): "errors.invalidTag" | "errors.tagExists" | null`. Normalises with `normaliseTagName`; undefined → `errors.invalidTag`; a tag other than `exceptId` with that exact name → `errors.tagExists`; else null.
- `api.ts`: `fetchTags` comment updated (every tag, including unused). `createTag(name)` → POST, returns `data.tag`. `updateTag(id, patch: { name?: string; color?: TagColor })` → PATCH, returns `data.tag`. `deleteTag(id)` → DELETE. Names are sent normalised (`normaliseTagName`), as the backend stores them.
- `hooks.ts`:
  - `useTagColors()`: `tagColorLookup(useTags().data)`, memoised on the data.
  - `useCreateTag()`: on success invalidate `tagKeys.all`.
  - `useRenameTag()`: `updateTag(id, { name })`; on settled invalidate `tagKeys.all` and `movementKeys.all`.
  - `useRecolorTag()`: `updateTag(id, { color })`, optimistic: `onMutate` cancels `tagKeys.all`, keeps the previous list, writes the new color into the cached list; `onError` restores it; `onSettled` invalidates `tagKeys.all`. The caller shows the error toast.
  - `useDeleteTag()`: on settled invalidate `tagKeys.all` and `movementKeys.all` (as `useDeleteCategory`).
  - Import `movementKeys` from `../movements/hooks`. That file already imports `tagKeys` from here; both are plain constants, and `categories/hooks.ts` ↔ `movements/hooks.ts` already do the same. If the build or lint flags the cycle, move `tagKeys` to `src/modules/tags/keys.ts`.
- `src/modules/shared/api-errors.ts`: `"tag already exists": "errors.tagExists"`, `"tag not found": "errors.tagNotFound"`. (The backend's `frontendErrorTexts` list grows to 21 to match.)

### Components

- `src/modules/tags/TagBadge.tsx` (new): `TagBadge({ name, color })` per C2. Used by `TagPills` and the tags column.
- `src/modules/tags/TagColorPicker.tsx` (new): the button + popover of T7. Props: `name`, `color`, `onPick(color)`, `disabled`.
- `src/modules/tags/TagsColumn.tsx` (new): T1–T8. Same structure as the categories code in `CategoriesPage.tsx` (state `name`, `createError`, `renaming`, `deleting`; a `TagRow` subcomponent; an `EmptyTags` subcomponent).
- `src/modules/categories/CategoriesPage.tsx`: the page shell (P1–P4). The existing categories JSX (form, body, modal) moves into a column `Stack` under its own heading in the same file; its logic doesn't change. The right column is `<TagsColumn />`.
- `src/modules/tags/TagPills.tsx`: C3 (`useTagColors`, `TagBadge`).
- `src/modules/tags/TagsField.tsx`: C4 (`useTagColors`, `renderPill`).

### Translations (en / es)

| Key | en | es |
|-----|----|----|
| `nav.categories` | Categories and tags | Categorías y tags |
| `categories.title` | Categories and tags | Categorías y tags |
| `categories.subtitle` | Categories say what a movement was for and add up your spending. Tags are extra labels to find movements later. | Las categorías dicen para qué fue un movimiento y suman tus gastos. Los tags son etiquetas extra para encontrar movimientos después. |
| `categories.columnTitle` | Categories | Categorías |
| `categories.columnSubtitle` | (old `categories.subtitle`) | (old `categories.subtitle`) |
| `tags.title` | Tags | Tags |
| `tags.subtitle` | Put several on any movement, up to 10. They never change your totals. | Pon varios en cualquier movimiento, hasta 10. Nunca cambian tus totales. |
| `tags.newLabel` / `newPlaceholder` / `create` | New tag name / For example, trip-2026 / Create | Nombre del nuevo tag / Por ejemplo, viaje-2026 / Crear |
| `tags.renameLabel` / `save` / `cancel` / `rename` | Tag name / Save / Cancel / Rename {{name}} | Nombre del tag / Guardar / Cancelar / Renombrar {{name}} |
| `tags.movementCount_one` / `_other` | {{count}} movement / {{count}} movements | {{count}} movimiento / {{count}} movimientos |
| `tags.showMovements` | Show movements tagged {{name}} | Ver movimientos con el tag {{name}} |
| `tags.deleted` | Tag deleted. | Tag eliminado. |
| `tags.empty.title` / `body` | No tags yet / Create a tag here, or add tags to a movement from its details. | Aún no hay tags / Crea un tag aquí, o añade tags a un movimiento desde su detalle. |
| `tags.delete.action` / `title` | Delete {{name}} / Delete {{name}}? | Eliminar {{name}} / ¿Eliminar {{name}}? |
| `tags.delete.bodyNone` | No movement has this tag. | Ningún movimiento tiene este tag. |
| `tags.delete.body_one` / `_other` | {{count}} movement will lose this tag. / {{count}} movements will lose this tag. | {{count}} movimiento perderá este tag. / {{count}} movimientos perderán este tag. |
| `tags.delete.keep` | Their categories, reasons and other tags stay. | Sus categorías, motivos y demás tags se conservan. |
| `tags.delete.confirm` / `cancel` | Delete tag / Cancel | Eliminar tag / Cancelar |
| `tags.color.change` | Change the color of {{name}} | Cambiar el color de {{name}} |
| `tags.color.failed` | The color wasn't saved. | No se guardó el color. |
| `tags.color.names.<c>` (12) | Red, Pink, Grape, Violet, Indigo, Blue, Cyan, Teal, Green, Lime, Yellow, Orange | Rojo, Rosa, Uva, Violeta, Índigo, Azul, Cian, Verde azulado, Verde, Lima, Amarillo, Naranja |
| `errors.tagExists` | A tag with that name already exists. | Ya existe un tag con ese nombre. |
| `errors.tagNotFound` | That tag no longer exists. | Ese tag ya no existe. |

The Spanish word for "tag" follows the existing `es.json` ("tag", masculine). See Q1.

## Acceptance criteria

- **AC1:** Given a 1280px window, when the user opens `/categories`, then the title and nav say "Categories and tags", categories are in the left column and tags in the right. At 800px, one column with categories first.
- **AC2:** Given tags `shared` (3 movements, teal) and `old-trip` (0, blue), the tags column lists both by name, each as a light badge in its color, with "3 movements" and "0 movements".
- **AC3:** When the user clicks `shared`, then `/movements?tag=shared` opens, filtered by it.
- **AC4:** Given no tags, the column shows the empty state mentioning the movement details, and the create form works.
- **AC5:** When the user creates `Trip 2026`, then one `POST /tags {"name": "trip 2026"}` is sent, the field clears, and `trip 2026` appears with a color and "0 movements". It's offered in the drawer's tag suggestions.
- **AC6:** Given `shared` exists, creating `SHARED` or ` shared ` sends nothing, shows the "already exists" toast, and keeps the text. Creating `a,b` shows the invalid-tag message under the field and sends nothing.
- **AC7:** When the user renames `shared` to `Family`, then one `PATCH /tags/:id {"name": "family"}`; the column shows `family`; the Movements table rows that had `shared` show `family` without a reload. Renaming to `Shared` (same normalised name) closes without a request. Renaming to an existing other tag's name shows the toast and keeps the field open.
- **AC8:** When the user deletes `shared` (3 movements), the modal says "3 movements will lose this tag."; on confirm one `DELETE`, a "Tag deleted." toast, the tag leaves the list, and those movements no longer show it. For `old-trip` the modal says "No movement has this tag."
- **AC9:** When the user picks orange for `shared`, the badge turns orange at once and one `PATCH {"color": "orange"}` is sent. If it fails, the badge goes back to its old color and "The color wasn't saved." shows.
- **AC10:** In the Movements table and cards, every tag pill shows its color (light variant); a tag missing from `GET /tags` shows gray; "+N" stays neutral; clicking a pill in the table still filters without opening the drawer.
- **AC11:** In the drawer and the Dashboard label card, chosen tags show as pills in their color; a newly typed tag is gray until saved; removing with the × and with Backspace works as before.
- **AC12:** If `GET /tags` fails, the tags column shows the error with retry, the categories column still works, and pills elsewhere fall back to gray.
- **AC13:** In Spanish, the title and nav read "Categorías y tags" and every new string is translated; `locales.test.ts` passes.
- **AC14:** With the backend's 404 (`tag not found`, e.g. deleted in another tab), rename shows "That tag no longer exists." under the field and delete shows it as a toast.

## Unit tests (vitest)

- `src/modules/tags/colors.test.ts`: `TAG_COLORS` has 12 distinct names in the backend order; `tagColor` passes palette names, maps `undefined`, `""`, `"gray"`, `"Red"`, `"#f00"` to gray; `tagColorStyle("teal")` returns the two variables; `tagColorLookup` finds by name, gray for unknown and for `undefined` data.
- `src/modules/tags/manage.test.ts`: `newTagNameError` for valid, blank, 33 code points, comma, control character, an exact duplicate, a duplicate after trim and lower-case, `İstanbul` against an existing `istanbul` (the `toTagCase` rule), and the `exceptId` case (own name allowed).
- `src/modules/shared/helpers.test.ts` (it already tests `getApiErrorKey`): `tag already exists` → `errors.tagExists`, `tag not found` → `errors.tagNotFound`.
- Components have no React Testing Library tests in this repo; the behaviour is checked by hand (PLAN).

## Open questions

- **Q1 (resolved 2026-11-13):** Spanish keeps "tag". `es.json` already says "tag" for this concept, and "etiqueta" remains the *label* concept ("Sin etiqueta", "necesita una etiqueta").
- **Q2 (resolved 2026-11-13):** the categories column keeps its current duplicate-name feedback under the field. Only the tags column uses the toast, as T3 and T5 describe.
- **Q3 (resolved 2026-11-13):** the tag filter chips on Movements stay gray; coloring them is future polish, out of scope.
- **Q4 (resolved 2026-11-13):** unused tags are shown with `movement_count` 0, in the column and in suggestions. The user deletes the ones they don't want.

## Implementation State

Built (2026-11-13), uncommitted. The phases, changed files, checks and deviations are recorded in [PLAN.md](./PLAN.md#implementation-state).

## References

- Backend: `../backend/specs/2026-11-13-tag-management/SPEC.md`, `../backend/README.md` ("Tags")
- [Movement Tags](../2026-11-07-movement-tags/SPEC.md), [Movements and Categories](../2026-10-30-movements-categories/SPEC.md), [Drawer Create Category](../2026-11-09-drawer-create-category/SPEC.md)
