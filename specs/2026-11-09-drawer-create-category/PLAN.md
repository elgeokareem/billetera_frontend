---
title: "Implementation Plan: Create a Category from the Movement Drawer"
change: drawer-create-category-1
type: feature
spec: ./SPEC.md
issue: none
created: 2026-11-09
updated: 2026-11-09
sdd_version: 7.3.0
---

# Implementation Plan: Create a Category from the Movement Drawer

**Spec:** [SPEC.md](./SPEC.md). Behaviour B1-B11, the design, the acceptance criteria and the test list are there. This plan gives the order, the files and the checks.

Rules:
- Never commit. Never open, read, `cat`, `grep` or print `.env` or any `.env.*` file.
- Change only the six files listed below. Don't touch `src/modules/dashboard/LabelCard.tsx`, `src/modules/dashboard/LabelQueue.tsx`, `src/modules/categories/*`, `src/modules/shared/*`, `MovementsTable.tsx`, `MovementsPage.tsx`, or anything under `src/modules/register/` (it has unrelated uncommitted work). No new dependency.
- Don't touch `specs/INDEX.md` or `specs/ROADMAP.md`.
- If something else seems to need a change, stop and say so in the report.

One phase, about 250 changed lines, 6 files:

| File | Change |
|------|--------|
| `src/modules/movements/drawerCategories.ts` | new, pure functions |
| `src/modules/movements/drawerCategories.test.ts` | new, vitest |
| `src/modules/movements/NewCategoryField.tsx` | new component |
| `src/modules/movements/MovementDrawer.tsx` | wire it into `DrawerForm` |
| `src/locales/en.json` | add `movements.drawer.createdHint` |
| `src/locales/es.json` | add `movements.drawer.createdHint` |

## Step 1. Pure module and its tests

Create `src/modules/movements/drawerCategories.ts` with the two functions whose signatures are in the SPEC ("New pure module").

- `drawerCategoryOptions(categories, created, noCategoryLabel)`:
  - start with `{ value: NO_CATEGORY, label: noCategoryLabel }` (import `NO_CATEGORY` from `./patch`);
  - then every loaded category as `{ value: String(category.id), label: category.name }`, in input order;
  - then every `created` category whose `id` is not among the loaded ids, same shape, in `created` order.
- `newCategoryNameError(name, categories)`:
  - `if (!isValidCategoryName(name)) return "errors.invalidCategoryName";` (import from `../categories/api`);
  - `const wanted = name.trim().toLowerCase();` and if any `category.name.toLowerCase() === wanted` return `"errors.categoryExists"`;
  - else `null`.

Create `src/modules/movements/drawerCategories.test.ts` with the nine cases of the SPEC's "Unit tests" section (`describe`/`it`/`expect` from `vitest`). Build `Category` objects with a small helper, e.g. `const cat = (id: number, name: string) => ({ id, name, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" }) as Category;` (check the real field names in `src/modules/shared/api-schema.d.ts`, `categories.CategoryResponse`, and use them).

Check: `pnpm test` passes.

## Step 2. Translation key

In `src/locales/en.json`, inside `movements.drawer`, add after `"saveFailed"`:
`"createdHint": "Category created. Save changes to file this movement under it."`

In `src/locales/es.json`, same place:
`"createdHint": "Categoría creada. Guarda los cambios para asignarla a este movimiento."`

Mind the comma on the previous line. `src/locales/locales.test.ts` checks both files have the same keys.

## Step 3. `NewCategoryField.tsx`

Create `src/modules/movements/NewCategoryField.tsx` exporting `NewCategoryField` with the props in the SPEC ("New component"). Imports: `Button, Group, Stack, TextInput` from `@mantine/core`, `useState` from `react`, `useTranslation` from `react-i18next`, `toast` from `react-toastify`, `getApiErrorKey` from `../shared/api-errors`, `Category` type, `newCategoryNameError` from `./drawerCategories`.

State: `open` (false), `name` (""), `error` (`string | null`, a translation key).

`function reportError(key: string)`: if `key === "errors.categoryExists"`, `toast.error(t(key))` and `setError(null)` (a duplicate is a toast, so the field keeps the typed name); otherwise `setError(key)`.

`async function submit()`:
1. `if (creating || disabled) return;`
2. `const problem = newCategoryNameError(name, categories ?? []);` if not null, `reportError(problem)` and return.
3. `setError(null)`; `try { const category = await onCreate(name); setOpen(false); setName(""); onCreated(category); } catch (err) { reportError(getApiErrorKey(err)); }` The field and the typed name stay open on every failure.

`function cancel()`: `setOpen(false); setName(""); setError(null);`

Render when closed (SPEC B1, B8, B9):
```tsx
<Group>
  <Button type="button" variant="default" radius="xl" mih={44}
    disabled={disabled || categories === undefined}
    onClick={() => setOpen(true)}>
    {t("dashboard.card.newCategory")}
  </Button>
</Group>
```

Render when open (SPEC B2, B4, B7), wrapped in `<Stack gap="sm">`, and **no `<form>` element** (it's inside the drawer's form):
- `TextInput` with `label={t("dashboard.card.newCategoryLabel")}`, `placeholder={t("dashboard.card.newCategoryPlaceholder")}`, `value={name}`, `maxLength={64}`, `autoFocus`, `disabled={creating || disabled}`, `error={error ? t(error) : undefined}`, `styles={{ input: { minHeight: 44 } }}`,
  `onChange`: read `event.currentTarget.value` into a const first, then `setName(value)` and `setError(null)`;
  `onKeyDown`: `if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(); }`.
- `Group gap="sm"` with:
  - `<Button type="button" variant="light" radius="xl" mih={44} loading={creating} disabled={disabled} onClick={() => void submit()}>{t("dashboard.card.createCategory")}</Button>`
  - `<Button type="button" variant="subtle" mih={44} disabled={creating || disabled} onClick={cancel}>{t("dashboard.card.cancel")}</Button>`

Every button here must have `type="button"`; a default button would submit the drawer's form and save the movement.

## Step 4. Wire into `MovementDrawer.tsx`

Only inside `DrawerForm`; `MovementDrawer` and `Fact` stay as they are.

1. Imports: `useCreateCategory` from `../categories/hooks`, `drawerCategoryOptions` from `./drawerCategories`, `NewCategoryField` from `./NewCategoryField`.
2. After `const update = useUpdateMovement();` add `const create = useCreateCategory();` and after the draft state `const [created, setCreated] = useState<Category[]>([]);`.
3. Replace the inline `categoryData` array with `const categoryData = drawerCategoryOptions(categories ?? [], created, t("movements.noCategory"));`.
4. Add `const busy = update.isPending || create.isPending;` and `const createdSelected = created.some((category) => String(category.id) === draft.category);`.
5. `Textarea`: `disabled={busy}`.
6. `Select`: `disabled={busy || categories === undefined}` and add `description={createdSelected ? t("movements.drawer.createdHint") : undefined}`.
7. Right after the `Select`, inside the same `Stack gap="sm"`:
```tsx
<NewCategoryField
  categories={categories}
  disabled={update.isPending}
  creating={create.isPending}
  onCreate={(name) => create.mutateAsync(name)}
  onCreated={(category) => {
    setCreated((list) => [...list, category]);
    setDraft((current) => ({ ...current, category: String(category.id) }));
  }}
/>
```
8. Save button: `disabled={!changed || create.isPending}`.
9. In `save`, add at the top after `event.preventDefault();`: `if (create.isPending) return;` (Enter in the reason textarea doesn't submit, but a stray submit must not save the old category).

Leave the existing `useState`, `save`, error `Alert` and details untouched otherwise.

## Checks

Run, in order, and report the output of each:
1. `pnpm lint`
2. `pnpm test`
3. `pnpm build`

All three must pass. Then report `git status --short` and confirm only the six files above changed (plus the pre-existing uncommitted register files and specs, which you must not touch).

## Manual check (fake API)

1. Terminal 1: `pnpm fake-api`. Terminal 2: `VITE_BACKEND_ENDPOINT=http://localhost:8099 pnpm dev`. Open `http://localhost:5173`, log in as `test@example.com` / `password`, go to Movements.
2. Click a row. Click `New category`: the field is focused, Cancel works (AC1, AC2).
3. Type spaces only, press Enter: invalid-name error, no request in DevTools Network, drawer still open (AC3).
4. Type `food`: an "already exists" error toast shows, no request (AC4), and the field keeps `food` so it can be edited.
5. Type `Gifts`, press Enter: one `POST /categories`, no `PATCH`, the Select shows Gifts with the hint, Save enabled, reason unchanged (AC6). Press Save: one `PATCH /movements/:id` with `category_id`, toast, drawer closes, row shows Gifts (AC7).
6. Open another row, create `Gifts2`, close with the X: the row keeps its category; `Gifts2` is in the row selects and the category filter (AC8).
7. `curl -X POST localhost:8099/__fake/state -H 'content-type: application/json' -d '{"delayMs":1500}'`, create a category: controls disabled and loader shown (AC9). Set `{"delayMs":0}` after.
8. `curl -X POST localhost:8099/__fake/state -H 'content-type: application/json' -d '{"failRoute":"GET /categories","failStatus":503}'`, reload Movements: `CategoriesUnavailable` shows; open a row: `New category` disabled (AC10). Set `{"failRoute":null}` and click Try again: the button is enabled.
9. `{"failRoute":"POST /categories","failStatus":503}`: creating shows the generic error under the field, name kept (B7). Reset with `{"failRoute":null}`.
10. Switch the language to Español and repeat step 5's texts (AC12).
11. Narrow the window below 768px (cards layout), open a card: same flow works.
12. Dashboard: create a category from a label card; it still files the movement at once (AC13).

## Implementation State

Implemented (2026-11-09), uncommitted.

- Files: `src/modules/movements/drawerCategories.ts` and `drawerCategories.test.ts` (new), `src/modules/movements/NewCategoryField.tsx` (new), `src/modules/movements/MovementDrawer.tsx`, `src/locales/en.json`, `src/locales/es.json`. No other file changed; no dependency added.
- Deviations: none. The plan and the code agreed; the only reading is that the case-insensitive clash compares `name.trim().toLowerCase()` against each category's `name.toLowerCase()`, as the plan says.
- Checks: `pnpm lint` passed with no output (no errors); `pnpm test` passed, 27 files and 304 tests; `pnpm build` passed (`tsc -b` and `vite build`; only the pre-existing chunk-size warning).
- Manual checks (fake API, plan's list, 12 steps) were not run: the field focus and Cancel, the client-side invalid/clash errors, Enter creating without submitting the drawer form, the Save flow, the persisted category after closing without saving, the in-flight and failed-request states, Spanish, the cards layout and the Dashboard regression are left for the main session. The component and drawer have no React Testing Library tests in this repo, so those checks are still unverified.
- Follow-up (2026-11-09): a duplicate name, both the client-side clash and the backend's 409, now shows `errors.categoryExists` in a `toast.error` instead of under the field, and the field keeps the typed name for editing. Blank/too-long, network and generic errors stay inline. `newCategoryNameError`'s return values are unchanged, so `drawerCategories.test.ts` needs no update.

