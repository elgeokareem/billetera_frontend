---
title: Movement Splits
spec_type: tech
type: feature
status: draft
domain: Portfolio
issue: none
created: 2026-11-13
updated: 2026-11-13
sdd_version: 7.3.0
---

# Movement Splits

## Problem

A movement has one category, so a $100 purchase that was $20 of groceries, $30 of transport and $50 of food lands entirely in one of them, and the Categories page and the dashboard spending are wrong. The backend change `../backend/specs/2026-11-13-movement-splits/SPEC.md` lets a movement be split into **parts**: each has a category, a USD amount and optional tags. The parts add up to at most the movement's USD value; the **rest** stays in the movement's own category. This change lets the user split a movement in the drawer, and shows split movements in the list.

## Backend dependency

Needs the backend change built through its Phase 5, then `pnpm api:generate`. Exact rules are in the backend SPEC. In short:

- Every movement has `splits: {category_id: number | null, usd_amount: string, tags: string[]}[]` (`[]` when none, position order; `category_id` null only after the category was deleted), `split_status: "none" | "applied" | "exceeds" | "unpriced"` and `split_rest_usd: string | null` (the rest, `"0"` when fully split, null for `none` and `unpriced`).
- `PATCH /movements/:id` takes `splits`, the whole set: `[{category_id, usd_amount, tags?}]`, 0 to 20 items, `usd_amount` a **string** with up to 2 decimals above 0, tags as the movement's (10 max). `[]` removes them. Unknown item keys are ignored.
- Only a priced movement with a value above 0 can get parts (422 `movement is not priced`). The parts' sum must be at most the value rounded to cents, half away from zero (422 `splits exceed movement value`). A part's unknown category is 404 `category not found`.
- If the value changes later, parts are kept: `exceeds` (they no longer fit; totals count them in order until the value runs out) or `unpriced` (no price now; the whole movement counts in its own category).
- A rest under half a cent joins the last part, so parts that add up to the value shown in cents leave a rest of `"0"`.
- Totals with `group_by=category`, and the `category_id` and `tag` filters, work per **portion** (a part, or the rest). The dashboard's spending and the Categories page get each part in its own category with no frontend math change. With `group_by=category` a split movement counts once in each category row it reaches. A part inherits the movement's tags.
- A fully split movement with no own category no longer matches `category_id=none`, so it leaves the label queue; one with an uncategorized rest above 0 stays in it.
- The CSV gains `split_status`, `split_rest_usd` and `splits` (JSON) at the end. Nothing to do here.
- Two new texts are for the frontend's error map: `movement is not priced`, `splits exceed movement value`.

It also comes after the frontend `2026-11-13-card-spend-detection` change, which edits the same drawer, list, fake API, error map and locales.

## Current state

- `MovementDrawer.tsx` (`DrawerForm`): reason, category `Select` (with "No category"), `NewCategoryField`, `TagsField`, Save. Its state is a `MovementDraft` (`patch.ts`: `draftOf`, `patchFor`, which sends only changed keys). A tag typed without Enter is folded in on save (`withPendingTag`). After card-spend, it also has a detection section above the form.
- `MovementsTable.tsx`: the category cell is an inline `Select` that PATCHes `category_id`. `MovementCards.tsx`: a `filing` line with the category name. `dashboard/movementText.ts` `movementFiling` gives Recent movements its line. `needsLabel` (`spending.ts`) is spending with `category_id === null`.
- Money is a decimal string. `shared/money.ts` (big.js) does exact math; `shared/format.ts` `formatUsd` formats. Every amount is wrapped in `Sensitive` (Hide Balances).
- `spendingBreakdown` sums asset rows per category, `movementCount` adds `count` across asset rows (used for the label-queue headline, on a query without `group_by`).

## Scope

In: drawer split editor, split display in the table, cards, Recent movements and the label card, `needsLabel`, the error map, translations, fake API. Out: see Out of scope.

## Behaviour

### B1: Who can split

- The editor is shown for every movement (any kind, direction and status), as the backend allows.
- **Priced, value above 0:** fully editable.
- **No USD value** (`usd_value === null`) or a value of 0: the section shows the dimmed note "Splitting needs a USD value, and this movement has none yet." (or, for 0, "This movement has no value to split."). No "Split this movement" or "Add a part" button. If it already has parts (`split_status: "unpriced"`), they're listed read-only (category, amount, tags) with "These parts count again once the movement has a price." and a **Remove the split** button that empties the draft's parts (saved as `splits: []` with Save).

### B2: Drawer, "Split this movement"

The section sits right under the category `Select` and the New category field, above the movement's Tags.

1. **No parts:** a dimmed line "Divide this movement among categories. What's left stays in its category." and a subtle button **Split this movement** (44 px) that adds one empty part row.
2. **With parts:** the category `Select` label becomes **Category of the rest**. Below it:
   - **Rows**, one per part: a category `Select` (the loaded categories plus those created in this drawer, no "No category" option, placeholder "Category"), a **USD** `TextInput` (`$` left section, `inputMode="decimal"`, 140 px on desktop), and a remove `ActionIcon` (trash, 44 px, `aria-label` "Remove part {{n}}"). Under them, a `TagsField` (label "Tags of this part", same rules and suggestions as the movement's). On a narrow screen the row stacks: category on one line, amount and remove on the next.
   - A part whose category was deleted shows its `Select` empty with the error "Pick a category".
   - **+ Add a part**, a subtle button (44 px). Disabled at 20 parts, with the hint "Up to 20 parts".
   - **Stacked bar:** a Mantine `Progress.Root` (12 px), one `Progress.Section` per part with a valid amount, in row order, colored by index from `SPLIT_COLORS` (`blue, teal, grape, orange, cyan, pink, lime, indigo, yellow, red`, cycling), then a `dark.3` section for the rest. Each section's width is its share of the value (`percentOf`, turned into a number only for the CSS width). Each section has a `Tooltip` with its line from the summary. Hidden while the value is null.
   - **Summary line**, under the bar: "Supermarket $20.00 · Transport $30.00 · Rest: Food $50.00". A part with no category reads "No category". The rest's name is the draft's rest category ("No category" when none). A rest of 0 reads "Rest: none". Every amount is in `Sensitive`.
   - **Over the limit**, live: the summary line is replaced by red text "The parts add up to {{sum}}, {{over}} more than this movement's {{value}}." The value shown is the limit (cents).
3. **Value changed** (`split_status: "exceeds"` on the saved movement): a yellow `Alert` at the top of the section, title "The parts add up to more than this movement is worth now", body "Its value changed after you split it. Until you fix the parts, they count in order until the value runs out." The editor works as above.

**Amount input:** spaces are dropped and a `,` counts as the decimal point (Spanish keyboards). Valid is `^\d{1,13}(\.\d{1,2})?$` after that, and above 0. The draft keeps the text as typed. The PATCH sends the normalised string.

**Rest shown in the drawer** is computed from the draft for display only, with big.js: value − sum of valid amounts, with a rest below 0.005 shown as 0 (the backend's sub-cent rule), and never below 0. After a save, the response's `split_rest_usd` is the truth.

### B3: Saving

- Save sends `splits` only when the parts changed: a different count, order, category, amount (compared as decimals, so `"20"` equals `"20.00"`) or tag set (ignoring order). It's the whole list, normalised: `[{category_id, usd_amount, tags}]`. Removing every row sends `splits: []`.
- A row with no category, no amount and no tags is ignored (not sent, no error). Removing the last row returns to "No parts".
- Before sending, each remaining row needs a category ("Pick a category") and a valid amount ("Enter an amount above $0 with up to 2 decimals"), and the sum must be at most the limit (the over-the-limit text above). Any of these blocks the save; errors show under their fields and focus moves to the first one.
- A part's tag typed without Enter is folded in on save, as for the movement's tags, with the same errors.
- Category and parts go in one PATCH, with reason and tags, so the save is all or nothing.
- On success: the usual "Movement saved." toast, the drawer closes, every movement list and total refetches (`useUpdateMovement` already does this, and it refetches tags).
- On failure, the existing red alert shows the mapped error, and the draft stays. `errors.movementNotPriced` and `errors.splitsExceedValue` say the movement changed and to reopen it.

### B4: Movements list

For `split_status` `applied` or `exceeds`, the category is shown as **segments**: the parts in order, then the rest when `split_rest_usd` is above 0 (named by the movement's category, or "No category"). Each segment is "{name} {usd}". At most two segments are shown, then "+{n}" for the others: "Supermarket $20.00 · Transport $30.00 · +1".

- **Table:** the category cell shows the segments instead of the inline `Select`, as an `UnstyledButton` that opens the drawer. `aria-label` "Split into {{count}}: {{names}}" (names only, so it never reads amounts aloud with balances hidden). With `exceeds`, a small yellow alert icon precedes the segments, with a `Tooltip` "The parts add up to more than its value".
- **Cards:** the `filing` text becomes the segments line (same rule, plain text, amounts in `Sensitive`).
- **`split_status: "unpriced"`:** the row looks as today (inline `Select`, filing), plus a dimmed "Split, waiting for a price" under it.
- Part tags aren't shown as pills in the list (they would crowd it); they're in the drawer.

### B5: Labelling

- `needsLabel(movement)` is spending with `category_id === null` **and** an uncategorized share: `split_rest_usd === null` or above 0. So a fully split movement never "needs a label", which matches the backend's `category_id=none` (B4 of the backend dependency).
- **Label card** (dashboard): a split movement with an uncategorized rest is in the queue. Its card shows a dimmed line "Split. Pick a category for the rest: {{rest}}" (`Sensitive`) under the amount. Picking a category sets `category_id`, which is the rest's category, as the backend has it.
- **Recent movements:** `movementFiling` returns the segments text (at most one segment, then "+n") for `applied` and `exceeds`.

### B6: Totals and pages

No code change in `spendingBreakdown`, `SpendingCard` or `CategoriesPage`: their numbers come from `group_by=category` rows, which the backend now builds from portions. Two comment updates in `spending.ts`:
- `SpendingBreakdown.count` adds counts across categories, so a split movement counts once per category it reaches. It's used only as a "none at all" check.
- `movementCount` is correct on queries without `group_by`, which is where it's used.

### B7: States

| Where | Loading | Empty | Error |
|-------|---------|-------|-------|
| Drawer split section | categories loading: part `Select`s disabled | "No parts" (B2.1); unpriced note (B1) | save error alert (B3); categories failed: part `Select`s disabled with the existing drawer behaviour |
| List segments | existing skeleton | n/a | existing `SectionError` |
| Label card rest line | n/a | n/a | n/a |

### B8: Privacy

Every amount shown here (summary, tooltips, over-the-limit text, segments, the label card rest, the read-only unpriced parts) is in `Sensitive`. The USD input itself isn't masked: masking an input being edited would make it unusable, and Hide Balances already leaves the reason and tags editable. Category names and counts aren't masked. `aria-label`s carry no amounts.

## Design

### Data layer

| File | Change |
|------|--------|
| `src/modules/shared/api-schema.d.ts` | `pnpm api:generate` |
| `src/modules/movements/types.ts` | `Split = Schemas["movements.SplitResponse"]`, `SplitStatus`, `SplitRequest = Schemas["movements.SplitRequest"]` |
| `src/modules/movements/splits.ts` (new) | Pure: `MAX_SPLITS = 20`, `SPLIT_COLORS`, `normaliseSplitAmount(text) → string \| undefined`, `splitLimit(usdValue) → string` (big.js `round(2, Big.roundHalfUp)`), `draftRest(usdValue, parts) → string` (sub-cent rule, floor 0), `splitDraftErrors(parts, limit) → {rows, total} ` with translation keys, `normalisedSplits(parts) → SplitRequest[]` (drops empty rows), `sameSplits(saved, normalised)`, `splitSegments(movement, nameOf) → {segments, more}` (B4), `canSplit(movement)` (B1) |
| `src/modules/movements/patch.ts` | `MovementDraft.splits: SplitDraft[]` (`{key, category, amount, tags, tagText}`; `category` `""` when none). `draftOf` fills it. `patchFor` adds `splits` when `!sameSplits` |
| `src/modules/movements/spending.ts` | `needsLabel` (B5), comments (B6) |
| `src/modules/dashboard/movementText.ts` | `movementFiling` segments (B5) |
| `src/modules/shared/api-errors.ts` | `"movement is not priced": "errors.movementNotPriced"`, `"splits exceed movement value": "errors.splitsExceedValue"` |

`useUpdateMovement` is reused unchanged.

### Components

- `movements/SplitSection.tsx` (new): B1 to B2. Props: `movement`, `parts`, `onPartsChange`, `restCategoryName`, `categoryOptions`, `errors`, `disabled`.
- `movements/SplitBar.tsx` (new): the stacked bar and the summary line, from `value`, the parts with names, the rest name.
- `movements/SplitSegments.tsx` (new): B4's segments for the table and cards.
- `MovementDrawer.tsx`: holds `draft.splits`, renders `SplitSection`, the "Category of the rest" label, the save checks (B3).
- `MovementsTable.tsx`, `MovementCards.tsx`: B4. `dashboard/LabelCard.tsx`: B5 rest line.

### Translations (en / es)

| Key | en | es |
|-----|----|----|
| `movements.split.title` | Split this movement | Dividir este movimiento |
| `movements.split.intro` | Divide this movement among categories. What's left stays in its category. | Reparte este movimiento entre categorías. Lo que sobre queda en su categoría. |
| `movements.split.start` | Split this movement | Dividir este movimiento |
| `movements.split.restCategory` | Category of the rest | Categoría del resto |
| `movements.split.category` | Category | Categoría |
| `movements.split.amount` | USD | USD |
| `movements.split.partTags` | Tags of this part | Etiquetas de esta parte |
| `movements.split.add` | Add a part | Agregar una parte |
| `movements.split.limit` | Up to 20 parts | Hasta 20 partes |
| `movements.split.remove` | Remove part {{n}} | Quitar la parte {{n}} |
| `movements.split.rest` | Rest: {{name}} {{amount}} | Resto: {{name}} {{amount}} |
| `movements.split.restNone` | Rest: none | Resto: nada |
| `movements.split.over` | The parts add up to {{sum}}, {{over}} more than this movement's {{value}}. | Las partes suman {{sum}}, {{over}} más que los {{value}} de este movimiento. |
| `movements.split.pickCategory` | Pick a category | Elige una categoría |
| `movements.split.badAmount` | Enter an amount above $0 with up to 2 decimals | Ingresa un monto mayor que $0 con hasta 2 decimales |
| `movements.split.unpriced` | Splitting needs a USD value, and this movement has none yet. | Para dividirlo hace falta un valor en USD, y este movimiento aún no lo tiene. |
| `movements.split.zero` | This movement has no value to split. | Este movimiento no tiene valor para dividir. |
| `movements.split.unpricedParts` | These parts count again once the movement has a price. | Estas partes vuelven a contar cuando el movimiento tenga precio. |
| `movements.split.removeAll` | Remove the split | Quitar la división |
| `movements.split.exceedsTitle` | The parts add up to more than this movement is worth now | Las partes suman más de lo que vale ahora este movimiento |
| `movements.split.exceedsBody` | Its value changed after you split it. Until you fix the parts, they count in order until the value runs out. | Su valor cambió después de dividirlo. Hasta que corrijas las partes, cuentan en orden hasta agotar el valor. |
| `movements.split.exceedsShort` | The parts add up to more than its value | Las partes suman más que su valor |
| `movements.split.segmentsLabel` | Split into {{count}}: {{names}} | Dividido en {{count}}: {{names}} |
| `movements.split.more` | +{{count}} | +{{count}} |
| `movements.split.waiting` | Split, waiting for a price | Dividido, esperando precio |
| `dashboard.card.splitRest` | Split. Pick a category for the rest: <amount/> | Dividido. Elige una categoría para el resto: <amount/> |
| `errors.movementNotPriced` | This movement has no USD value now, so it can't be split. Close it and open it again. | Este movimiento ya no tiene valor en USD, así que no se puede dividir. Ciérralo y ábrelo de nuevo. |
| `errors.splitsExceedValue` | This movement's value changed and the parts no longer fit. Close it and open it again. | El valor de este movimiento cambió y las partes ya no caben. Ciérralo y ábrelo de nuevo. |

### Fake API (`scripts/fake-api.mjs`)

- Header comment: parts, the three fields, the PATCH key, portions, the new account kind.
- Every movement has `splits`, `split_status`, `split_rest_usd`, computed with the backend's FR3 rule (clamp, sub-cent rest) using the existing decimal helpers (`parseDec`, `addDec`, `cmpDec`, …), never `Number` for money.
- `PATCH /movements/:id` `splits`: the backend's validation order and texts (400 `invalid split`, `too many splits`, `invalid tag`, `too many tags`; 404 `movement not found`, `category not found`; 422 `movement is not priced`, `splits exceed movement value`), all or nothing. Part tags register like movement tags.
- `GET /movements` and export: `category_id` and `tag` match portions. `GET /movements/totals`: the assets group over portions (amount, `usd_value`, `count` distinct per row); fees and counter as today.
- `DELETE /categories/:id` sets parts' `category_id` to null. `DELETE /tags/:id` removes it from parts. `GET /tags` counts parts.
- CSV: three columns appended.
- New account kind **`splits`**: `populated`, plus categories Supermarket and Transport, plus this month:
  - a $100 USDT P2P sale in Food split Supermarket 20 (tag `groceries`) and Transport 30 (`applied`, rest 50);
  - a $60 Pay transfer with no category fully split 35 + 25 (rest 0, not in the label queue);
  - a $45 withdrawal with no category split Supermarket 15 (rest 30 uncategorized, in the label queue);
  - a Pay transfer whose parts add up to 110 on a value of 100 (`exceeds`);
  - an unpriced withdrawal with one part (`unpriced`);
  - a $100.004 movement with one part of 100 (rest 0 by the sub-cent rule).

  Other accounts unchanged.

## Acceptance criteria

All with the fake API, `account: "splits"`, unless stated.

- **AC1:** Opening the $100 P2P sale shows "Category of the rest" = Food, two rows (Supermarket 20 with `groceries`, Transport 30), the bar with three sections, and "Supermarket $20.00 · Transport $30.00 · Rest: Food $50.00".
- **AC2:** On an unsplit priced movement, **Split this movement** adds a row. Picking Transport and typing `12,5` shows "Transport $12.50 · Rest: … ". Save sends one PATCH with `"splits":[{"category_id":<Transport>,"usd_amount":"12.5","tags":[]}]` and no other key.
- **AC3:** Typing amounts that exceed the value shows the red over-the-limit text and Save does nothing. Fixing them clears it.
- **AC4:** A row with an amount and no category shows "Pick a category" on Save. `0`, `1.234`, `abc` show the amount error. An empty row is ignored.
- **AC5:** Removing both rows of the $100 sale and saving sends `"splits":[]`, and the row in the list shows the inline category `Select` again.
- **AC6:** In the table, the $100 sale's category cell reads "Supermarket $20.00 · Transport $30.00 · +1", and clicking it opens the drawer. On a 390 px screen the card's filing line reads the same.
- **AC7:** The $60 fully split Pay transfer isn't in the dashboard label queue and has no "Needs a label". The $45 withdrawal is, and its card says "Split. Pick a category for the rest: $30.00". Picking Food there sends `{"category_id": <Food>}`.
- **AC8:** The dashboard spending and the Categories page show Supermarket and Transport with the parts' amounts, Food with only the rests, and the total equals the sum without splits.
- **AC9:** The `exceeds` movement shows the yellow alert in the drawer and the alert icon in the table.
- **AC10:** The unpriced movement shows the unpriced note, its part read-only, and "Remove the split"; there's no Add a part. In the list it shows "Split, waiting for a price".
- **AC11:** Filtering Movements by Supermarket lists the three movements with a Supermarket part. Filtering by tag `groceries` lists the $100 sale.
- **AC12:** Deleting Supermarket on the Categories page leaves the $100 sale with a "No category $20.00" segment; reopening the drawer shows that row with "Pick a category".
- **AC13:** With `failRoute: "PATCH /movements/:id"`, saving shows the red alert and keeps the draft.
- **AC14:** With balances hidden, the summary, tooltips, segments and label card rest are masked; aria labels have no amounts.
- **AC15:** In Spanish every new string is translated and `locales.test.ts` passes.
- **AC16:** Against the real backend (after its E2E), splitting one real movement changes the Categories page and the dashboard spending as in AC8.

## Unit tests (vitest)

- `splits.test.ts`: `normaliseSplitAmount` (`12,5`, ` 20 `, `20.`, `.5`, `0`, `1.234`, `1e2`, 14 digits); `splitLimit` (`100.004` → `100`, `100.005` → `100.01`); `draftRest` (sub-cent, floor 0, invalid rows ignored); `splitDraftErrors` (each case of B3); `normalisedSplits` drops empty rows; `sameSplits` (`"20"` vs `"20.00"`, tag order, position order matters, category change); `splitSegments` (two shown then `+n`, rest only when above 0, deleted category, `unpriced` → none); `canSplit`.
- `patch.test.ts`: `draftOf` with parts; `patchFor` sends `splits` only when changed, `[]` when all removed.
- `spending.test.ts`: `needsLabel` with rest above 0, rest `"0"`, `split_rest_usd` null.
- `movementText.test.ts`: filing for a split movement.
- `helpers.test.ts`: the two new error texts.

## Out of scope

- Splitting from the label card or the table (the drawer is the one editor).
- Creating a category from a part row (the drawer's New category field creates one; it then shows in the part `Select`s).
- Part tags as pills in the list.
- Coin-amount parts, fee or counter splits (backend Out of scope).

## Open questions

- **Q1 (user):** Hide Balances doesn't mask the USD inputs while editing parts (B8). Acceptable, or should the editor be disabled while balances are hidden?

## References

- Backend: `../backend/specs/2026-11-13-movement-splits/SPEC.md`
- [Movements and Categories](../2026-10-30-movements-categories/SPEC.md), [Movement Tags](../2026-11-07-movement-tags/SPEC.md), [Hide Balances](../2026-11-07-hide-balances/SPEC.md), [Drawer Create Category](../2026-11-09-drawer-create-category/SPEC.md), [Categories and Tags Page](../2026-11-13-categories-tags-page/SPEC.md), [Card Spend Detection](../2026-11-13-card-spend-detection/SPEC.md)
