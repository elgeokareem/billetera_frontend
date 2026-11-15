---
title: Category Exclusion
spec_type: tech
type: feature
status: draft
domain: Portfolio
issue: none
created: 2026-11-15
updated: 2026-11-15
sdd_version: 7.3.0
---

# Category Exclusion

## Problem

The user files copy-trading money under a category "Copy trading". The Spending card leaves out the detector's `copy_trading` **kind** (`SPENDING_KINDS` in `src/modules/movements/spending.ts`), but not a user **category**, and the Movements chart, list, totals and export count every movement that matches the filters. There's no way to leave a category out, and no way to say once that a category isn't spending.

Backend contract: [`../backend/specs/2026-11-15-category-exclusion/SPEC.md`](../../../backend/specs/2026-11-15-category-exclusion/SPEC.md) (`exclude_category_id`, `counted_only`, `counts_as_spending`). Read its FR2 for the portion rules; this spec doesn't repeat them. In short: totals drop only the excluded portions ($100 with a $30 "Copy trading" part counts $70), the list shows a movement while any portion is kept, and `counted_only=true` is ignored when `category_id` is set.

Depends on the backend change being built, `make openapi` run there, then `pnpm api:generate` here.

## Behaviour

### Feature 1: Exclude categories filter

**B1. URL.** `MovementsSearch` gains `exclude_category_id` (comma list, same item rule as `category_id`: IDs or `none`, max 20). `parseMovementsSearch` reads it with `readCategory`, then drops every item that's also in `category_id` (include wins in a hand-typed URL), so the API never gets the overlap 400. `toMovementsQuery` passes it, so the list, the chart (both totals queries) and the export all apply it with no other change. It joins `FILTER_KEYS` (so `hasFilters` counts it) and the `withList` key union.

**B2. No overlap from the UI.** `withList(search, "category_id", items)` removes those items from `exclude_category_id`, and `withList(search, "exclude_category_id", items)` removes them from `category_id`. Each MultiSelect also hides the options picked in the other.

**B3. Control.** In `MovementFilters.tsx`, inside the Category `FilterGroup`, under the include `MultiSelect` and before the "Needs a label" button: a second `MultiSelect`, label and `aria-label` "Exclude categories", placeholder "None", same `categoryData` (with "No category"), `searchable`, `clearable`, `hidePickedOptions`. The "Needs a label" preset replaces the whole search, as today, so it clears exclusions.

**B4. Chips.** `filterChips` (`chips.ts`) adds one chip per excluded item, after the category chips: "Excluded: Copy trading" (`movements.chips.labelled` with `movements.filters.excludeCategory`), `none` as "No category", unknown name as `…`. Removing it leaves the other exclusions. The filter badge in `MovementsPage` counts chips, so it includes exclusions with no extra code.

### Feature 2: "Counts as spending" flag

**B5. Category type and API.** `Category` (generated) gains `counts_as_spending`. `categories/api.ts` replaces `renameCategory` with `updateCategory(id, body: { name?: string; counts_as_spending?: boolean })` (the rename caller passes `{ name }`). `createCategory` is unchanged, so new categories count.

**B6. Toggle.** In `CategoriesPage.tsx`'s `CategoryRow`, under the category name link: a Mantine `Switch` (size `sm`, hit area at least 44px tall), label "Counts as spending", `checked={category.counts_as_spending}`. Not shown while the row is renaming. A new `useUpdateCategory` hook (replacing `useRenameCategory`, same file) patches `{ counts_as_spending }`; on settle it invalidates `categoryKeys.all` and `movementKeys.all` (the totals change). While pending the switch is disabled; on error a toast with `getApiErrorKey` and the switch shows the server value.

**B7. Row amount.** The Categories page currently reads per-category amounts from `dashboardQueries(...).spending`. That query gains `counted_only` (B8), which would show a flagged category as $0. So the page uses a new `dashboardQueries(...).spendingAllCategories` (the spending query without `counted_only`). A flagged category's amount is dimmed, with "Not counted" under it (`categories.notCounted`).

**B8. Dashboard Spending card.** `dashboardQueries` adds `counted_only: "true"` to `spending` and `unconfirmedSpending`. `labelCards`/`labelCount` don't need it (they filter `category_id=none`). Under the summary line, when at least one category is flagged, a dimmed caption "Not counting: Copy trading" (B10). The card still waits only for its own queries; the caption appears once `useCategories` has data.

**B9. Movements chart.** Both totals queries of `MovementsChart` send `counted_only: "true"` always. The list and the export don't (Q1). Rules that follow from the backend:
- No `category_id` in the URL: flagged categories are out of bars, summary and count.
- `category_id` set (for example the user picks "Copy trading"): `counted_only` is ignored server-side, so the chart shows exactly the named categories, flagged or not. That's how the user sees a flagged category.
- `exclude_category_id`: the union of both, server-side.
Extract the query building into a pure `chartTotalsQuery(search, range, period, tz)` in `chart.ts` so it's testable.

**B10. "Not counting" caption.** A pure `notCountingNames(categories, search)` (in `src/modules/categories/counting.ts`) returns the names of flagged categories that the request is actually leaving out because of the flag: empty when `search.category_id` is set; otherwise flagged categories minus those already in `search.exclude_category_id` (their chip already speaks), in the categories' list order. The Spending card calls it with `{}`. Shown as one dimmed line, `size="xs"`: "Not counting: Copy trading" / "Not counting: A, B and 2 more" (first two names, then a count). In the chart it sits under the title, next to the existing "Last 12 months" caption. Not shown while categories are loading or failed. Names aren't masked by Hide Balances (they aren't amounts).

### States

- Categories loading or failed: the exclude MultiSelect offers only "No category" (as the include one does); chips show `…`; captions hidden. Queries don't wait for categories.
- Switch save failing: toast, switch at server value, nothing else changes.
- Totals request failing: existing `SectionError`s.
- Every amount stays a decimal string through `money.ts`; nothing here parses money.

## i18n (en, es)

| Key | en | es |
|---|---|---|
| `movements.filters.excludeCategory` | Exclude categories | Excluir categorías |
| `movements.filters.excludeCategoryPlaceholder` | None | Ninguna |
| `movements.chips.excluded` | Excluded | Excluida |
| `categories.countsAsSpending` | Counts as spending | Cuenta como gasto |
| `categories.notCounted` | Not counted | No se cuenta |
| `common.notCounting` | Not counting: {{names}} | Sin contar: {{names}} |
| `common.notCountingMore_one` / `_other` | {{names}} and {{count}} more | {{names}} y {{count}} más |

The chip uses `labelled(t("movements.chips.excluded"), name)`. `common.*` is shared because the Dashboard card and the Movements chart both show the caption.

## Acceptance criteria

- **AC1.** Given the Movements filters open, when the user picks "Copy trading" under Exclude categories, then the URL has `exclude_category_id=<id>`, a chip "Excluded: Copy trading" shows, the badge count goes up by one, and the list, chart and export requests all carry the parameter.
- **AC2.** Given a $100 movement with a $30 "Copy trading" part and "Copy trading" excluded, then the movement stays in the list and the chart's money out counts $70 for it.
- **AC3.** Given "Copy trading" excluded, when the user opens the include MultiSelect, then "Copy trading" isn't offered; and picking an ID in one control removes it from the other.
- **AC4.** Given a hand-typed URL `?category_id=7&exclude_category_id=7,9`, then the page reads `category_id=7&exclude_category_id=9` and no request gets 400.
- **AC5.** Given Categories and tags, when the user turns off "Counts as spending" for "Copy trading", then the PATCH sends `{"counts_as_spending": false}`, the row's amount is dimmed with "Not counted", and the Dashboard Spending card no longer includes it and shows "Not counting: Copy trading".
- **AC6.** Given "Copy trading" flagged and no category filter, then the Movements chart leaves it out and shows "Not counting: Copy trading"; when the user filters by "Copy trading", then the chart shows it and the caption is gone.
- **AC7.** Given "Copy trading" flagged and also in Exclude categories, then the chart caption doesn't name it (the chip does).
- **AC8.** Given the switch PATCH fails, then a toast shows and the switch returns to the server value.
- **AC9.** Given es, then every new label, chip and caption is in Spanish.

## Resolved Questions

- **Q1 (resolved: only with `counted_only`).** Flagged categories are left out only where the request sends `counted_only=true`: the Dashboard Spending card and the Movements chart. The Movements list and the export still show them, so the user can find those movements. The backend serves the amounts either way and the client decides per request.
- **Q2 (resolved: never sent).** The same ID in `category_id` and `exclude_category_id` is a 400 (`invalid exclude_category_id`), for an ID and for `none` in both. The UI never sends it: `parseMovementsSearch` drops the overlap (include wins in a hand-typed URL), `withList` removes an item from the other list when it's picked, and each MultiSelect hides the options picked in the other.
- **Q3 (resolved: both directions).** The flag applies to money in and money out. With `counted_only=true`, a flagged category is left out of both directions; the Dashboard and the chart send it for their totals only, and never for the list or the export.
- **Q4 (resolved: real amount, dimmed).** On the Categories page a flagged category shows its real amount, dimmed and labelled "Not counted" (`categories.notCounted`). The page reads `spendingAllCategories`, the spending query without `counted_only`, so it never shows the $0 the Dashboard's query would.

## Unit tests (node, no DOM, TZ America/Santiago)

- `search.ts`: parse `exclude_category_id` (valid, invalid items dropped, 20 cap, overlap dropped, `none`); `toMovementsQuery` passes it; `hasFilters`; `withList` both directions remove overlap; `withoutKey`.
- `chips.ts`: one chip per excluded item, `none`, unknown name, `without` keeps the rest.
- `counting.ts`: no flagged → `[]`; `category_id` set → `[]`; minus excluded; order; the "and N more" formatting helper if it's pure.
- `chart.ts`: `chartTotalsQuery` always has `counted_only: "true"` and carries `exclude_category_id`.
- `dashboard/queries.ts`: `spending` and `unconfirmedSpending` have `counted_only`; `spendingAllCategories` doesn't.
- Locale parity test passes with the new keys.
