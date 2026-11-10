---
title: Create a Category from the Movement Drawer
spec_type: tech
type: feature
status: draft
domain: Portfolio
issue: none
created: 2026-11-09
updated: 2026-11-09
sdd_version: 7.3.0
---

# Create a Category from the Movement Drawer

## Problem

On `/movements`, clicking a row opens `MovementDrawer` (`src/modules/movements/MovementDrawer.tsx`). Its category `Select` offers "No category" and the existing categories only. To file a movement under a new category, the user has to leave for `/categories`, create it, come back and reopen the row. The Dashboard label cards (`src/modules/dashboard/LabelCard.tsx`) already let the user create a category in place. The drawer should do the same.

## Backend facts (`../backend/README.md`, "Categories")

- `POST /categories` with `{"name": "Food"}` returns `{"category": {...}}`. Already wrapped by `createCategory` in `src/modules/categories/api.ts` (it trims the name) and `useCreateCategory` in `src/modules/categories/hooks.ts` (its `onSuccess` invalidates `categoryKeys.all`, so `GET /categories` refetches).
- A name is trimmed and must be 1 to 64 characters with no control characters, or it's 400 `invalid name`. `isValidCategoryName` in `categories/api.ts` already mirrors this rule.
- Names are unique ignoring case: `food` is 409 `category already exists` when `Food` exists.
- `src/modules/shared/api-errors.ts` already maps `invalid name` to `errors.invalidCategoryName` and `category already exists` to `errors.categoryExists`. No network gives `errors.network`, anything else `errors.generic`.
- Moving a movement into a category is still `PATCH /movements/:id` with `{"category_id": <id>}`, sent by the drawer's existing Save (`useUpdateMovement`, body from `patchFor`).
- `scripts/fake-api.mjs` implements `POST /categories` with the same 400 and 409 answers, so this can be tried locally.

## Scope

- In: the movement drawer only. Both layouts (table from 768px, cards below) open the same drawer, so both get it.
- Out: the inline category `Select` in each `MovementsTable` row. It saves on change, it sits in a 190px table cell and its clicks are stopped from opening the row; adding a create flow there is a separate change (see Open questions). `MovementCards` has no select. `LabelCard` and `LabelQueue` don't change at all. Hidden balances (`Sensitive`) play no part: category names are never masked.

## Behaviour

| # | Rule |
|---|------|
| B1 | Under the drawer's category `Select` there is a `New category` button (`dashboard.card.newCategory`). It's a `Button variant="default" radius="xl" mih={44}`, aligned left, so the drawer keeps one primary button (Save). |
| B2 | Clicking it hides the button and shows, in its place: a `TextInput` labelled `dashboard.card.newCategoryLabel`, placeholder `dashboard.card.newCategoryPlaceholder`, `maxLength={64}`, focused on open; then, in a `Group gap="sm"`, a `Create` button (`dashboard.card.createCategory`, `Button variant="light" radius="xl" mih={44}`, not `PrimaryButton`, so Save stays the only primary) and a `Cancel` button (`dashboard.card.cancel`, `Button variant="subtle" mih={44}`). Cancel closes the field, clears the name and its error, and shows the button again. |
| B3 | Create, or Enter in the name field, checks the name first: an invalid name (`isValidCategoryName` false) shows `errors.invalidCategoryName` under the field; a trimmed name equal, ignoring case, to an existing category's name shows `errors.categoryExists` as an error toast, not under the field, and the field keeps the typed name. Neither sends a request. |
| B4 | A valid name sends `POST /categories` through `useCreateCategory`. While it's in flight: the name field and Cancel are disabled, Create shows its loader, and the category `Select`, the reason and Save are disabled. |
| B5 | On success: the field closes and its name clears; the new category becomes the drawer's draft category (the `Select` shows it at once, even before `GET /categories` has refetched); the typed reason is untouched. Nothing is saved on the movement yet: Save becomes enabled (the draft differs), and the `Select` shows the description `movements.drawer.createdHint` while the selected category is one created in this drawer. |
| B6 | The movement takes the new category only when the user presses Save, through the existing save path (same toast, same close, same error `Alert`). Closing the drawer without saving leaves the category created and the movement unchanged. |
| B7 | On failure: the field stays open with the typed name and the error shows as `t(getApiErrorKey(error))`: a 409 duplicate (`errors.categoryExists`) as an error toast, every other error (400 `errors.invalidCategoryName`, no network `errors.network`, else `errors.generic`) under the field. Typing in the field clears the inline error. |
| B8 | When categories haven't loaded or failed to load (`categories` prop is `undefined`), the `New category` button is disabled, like the `Select` already is. The page already shows `CategoriesUnavailable` with a retry above the list; once a retry succeeds, the drawer gets the list and the button is enabled. |
| B9 | While a movement save is in flight (`update.isPending`), the `New category` button and the open field's controls are disabled. |
| B10 | Opening another movement resets the field and the created list, because `DrawerForm` is keyed by `movement.id` (as today). A category created earlier stays in the list through the refetched `GET /categories`. |
| B11 | After a success, the categories query refetches (existing `useCreateCategory` behaviour), so the table's inline selects, the filters and the chips know the new category too. |

### Why "select in the draft, save with Save" and not "apply immediately"

The drawer is a form today: reason and category are both drafts and nothing reaches the movement until Save. Applying the new category straight away would make one path of the category field save on its own while picking an existing category doesn't, and it would send the reason the user may still be typing, or not. Creating the category itself is a different resource (`POST /categories`) and can't be deferred sensibly, so it happens at once; only the movement's change waits for Save. B5's hint makes the extra step visible. (`LabelCard` applies at once because its whole design is one-tap labelling; the drawer's isn't.)

### Why a button and inline field, not a "creatable" Select

Mantine 9.7.4's `Select` has no creatable option; the "create" pattern needs a hand-built `Combobox` (search state, a synthetic "+ Create ..." option, keyboard handling). That's more code and more to get wrong for the same result. The button-plus-field mirrors `LabelCard`, which users already know.

## Design

### Nested form

`DrawerForm` renders a `<form onSubmit={save}>`. The new-category piece is inside it, so it must **not** be a `<form>` (nested forms are invalid HTML, and a submit would save the movement). Therefore:
- the Create button is `type="button"` with `onClick`;
- the Cancel button is `type="button"`;
- the `New category` button is `type="button"`;
- the name `TextInput` has `onKeyDown`: when `event.key === "Enter"` and `!event.nativeEvent.isComposing`, call `event.preventDefault()` and run Create. Without this, Enter would submit the drawer's form.

### New pure module: `src/modules/movements/drawerCategories.ts`

```ts
import { isValidCategoryName } from "../categories/api";
import type { Category } from "../categories/types";
import { NO_CATEGORY } from "./patch";

export interface CategoryOption {
  value: string;
  label: string;
}

/**
 * The drawer's Select data: "No category" first, then the loaded categories in their order, then any category created in
 * this drawer that the loaded list doesn't have yet (the refetch may not have landed, or may have failed).
 */
export function drawerCategoryOptions(
  categories: readonly Category[],
  created: readonly Category[],
  noCategoryLabel: string,
): CategoryOption[];

/**
 * The translation key of the error for a new category name, or null when it may be sent. Checks the backend's name rule,
 * then a case-insensitive clash with a loaded category (compared trimmed, with toLowerCase).
 */
export function newCategoryNameError(name: string, categories: readonly Category[]): string | null;
```

The case-insensitive check is a convenience; the backend's 409 stays the authority (B7). Both the client-side clash and the 409 show `errors.categoryExists` as an error toast, never under the field.

### New component: `src/modules/movements/NewCategoryField.tsx`

```ts
interface NewCategoryFieldProps {
  /** The loaded categories, or undefined while they load or after they failed. */
  categories: readonly Category[] | undefined;
  /** True while the drawer saves the movement. */
  disabled: boolean;
  /** True while POST /categories is in flight. */
  creating: boolean;
  /** Sends POST /categories. Resolves with the new category, rejects with the axios error. */
  onCreate: (name: string) => Promise<Category>;
  /** Called after a successful create. */
  onCreated: (category: Category) => void;
}
export function NewCategoryField(props: NewCategoryFieldProps): JSX.Element;
```

Local state: `open: boolean`, `name: string`, `error: string | null` (a translation key). It renders B1 when closed and B2 when open. The mutation hook lives in `DrawerForm` (not in the field) so that `DrawerForm` can disable the `Select`, the reason and Save while it's pending (B4).

### `MovementDrawer.tsx` changes (inside `DrawerForm` only)

- `const create = useCreateCategory();`
- `const [created, setCreated] = useState<Category[]>([]);`
- `categoryData` becomes `drawerCategoryOptions(categories ?? [], created, t("movements.noCategory"))`.
- `const busy = update.isPending || create.isPending;` The `Textarea` and `Select` use `disabled={busy ...}`; Save uses `disabled={!changed || create.isPending}`.
- `Select` gets `description={created.some((c) => String(c.id) === draft.category) ? t("movements.drawer.createdHint") : undefined}`.
- `<NewCategoryField>` is rendered right after the `Select`, inside the same `Stack`, with `onCreated` doing `setCreated((list) => [...list, category])` and `setDraft((current) => ({ ...current, category: String(category.id) }))`.

### Translations

Reused, unchanged: `dashboard.card.newCategory`, `dashboard.card.newCategoryLabel`, `dashboard.card.newCategoryPlaceholder`, `dashboard.card.createCategory`, `dashboard.card.cancel`, `errors.invalidCategoryName`, `errors.categoryExists`, `errors.network`, `errors.generic`. `errors.categoryExists` shows in an error toast, both for the client-side clash and for the backend's 409; the other error keys stay under the field (B3, B7).

New key, in both files:

| Key | en | es |
|-----|----|----|
| `movements.drawer.createdHint` | Category created. Save changes to file this movement under it. | Categoría creada. Guarda los cambios para asignarla a este movimiento. |

## Acceptance criteria

- **AC1** Given the drawer is open and categories loaded, when the user clicks `New category`, then a name field (focused), `Create` and `Cancel` appear and the button is hidden.
- **AC2** Given the field is open, when the user clicks `Cancel`, then the field closes, the name is cleared and `New category` shows again.
- **AC3** Given the field holds "   " or 65 characters (paste), when the user presses Create or Enter, then `errors.invalidCategoryName` shows under the field and no request is sent.
- **AC4** Given a category "Food" exists, when the user creates "food", then an error toast with `errors.categoryExists` shows, no request is sent, and the field keeps "food".
- **AC5** Given a name the list doesn't have but the server does (409), when the user creates it, then an error toast with `errors.categoryExists` shows, the field stays open and the name stays.
- **AC6** Given a valid new name "Gifts", when the user presses Enter in the field, then `POST /categories` is sent once, the movement's drawer form is **not** submitted, the field closes, the `Select` shows "Gifts", the hint shows, Save is enabled and the typed reason is unchanged.
- **AC7** Given AC6, when the user presses Save, then `PATCH /movements/:id` is sent with `category_id` of Gifts (plus `reason` only if it changed), the "Movement saved." toast shows and the drawer closes; the row shows "Gifts".
- **AC8** Given AC6, when the user closes the drawer without saving, then the movement keeps its old category and "Gifts" exists in the category lists (filters, row selects, `/categories`).
- **AC9** Given `POST /categories` is in flight, then the name field, Cancel, the reason, the `Select` and Save are disabled and Create shows a loader.
- **AC10** Given categories failed to load, when the user opens a row, then `New category` is disabled (and the `Select` stays disabled, as today).
- **AC11** Given the network is down, when the user creates a valid name, then `errors.network` shows under the field.
- **AC12** Given the UI language is Spanish, then every new text above shows in Spanish.
- **AC13** `LabelCard` on the Dashboard behaves exactly as before.

## Unit tests (`src/modules/movements/drawerCategories.test.ts`, vitest)

`drawerCategoryOptions`:
1. Empty categories and created: returns only `{ value: "none", label }` (the `NO_CATEGORY` value).
2. Loaded categories map to `{ value: String(id), label: name }`, in input order, after "No category".
3. A created category not in the loaded list is appended at the end.
4. A created category already in the loaded list (same id) appears once.

`newCategoryNameError`:
5. `""`, `"   "` and a 65-character name give `"errors.invalidCategoryName"`.
6. A name with a control character (`"a\u0007b"`) gives `"errors.invalidCategoryName"`.
7. `" food "` with an existing `Food` gives `"errors.categoryExists"`.
8. `"Gifts"` with `Food` and `Rent` gives `null`.
9. A 64-character name with no clash gives `null`.

The component and the drawer are checked by hand (the repo has no React Testing Library).

## Open questions

1. AC4: when the typed name matches an existing category ignoring case, should the drawer just select that existing category instead of showing the `errors.categoryExists` toast? This spec shows the toast (matches the backend and `/categories`).
2. Should the inline category `Select` in `MovementsTable` rows also offer creating a category? This spec leaves it out (the request says "clicks a row").
3. Is reusing the `dashboard.card.*` keys in the drawer acceptable, or should the drawer get its own `movements.drawer.newCategory*` keys (same text) so the two screens can diverge later?
