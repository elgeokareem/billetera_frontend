---
title: "Implementation Plan: Category Exclusion"
change: category-exclusion-1
type: feature
spec: ./SPEC.md
issue: none
created: 2026-11-15
sdd_version: 7.3.0
---

# Implementation Plan: Category Exclusion

**Spec:** [SPEC.md](./SPEC.md). Behaviour, acceptance criteria and tests are there.

Rules:
- Never commit. Never open, read, `cat`, `grep` or print `.env` or any `.env.*` file. Tell every subagent this.
- Starts after the backend's [Category Exclusion](../../../backend/specs/2026-11-15-category-exclusion/PLAN.md) Phase 3 (all three parameters and the category field are in `../backend/docs/openapi/openapi.json`).
- Don't touch `specs/INDEX.md` or `specs/ROADMAP.md`.
- No new dependency. Money stays a decimal string.
- Locale files are shared with other work in progress: add keys only.
- Resolve SPEC Q1 and Q2 first, or build the stated defaults.
- Each phase ends with `pnpm verify` passing and `git status --short` reported. Record results and drift under Implementation State.

## Phase 1: API types and the Exclude filter

**Outcome:** SPEC B1 to B4. AC1 to AC4.

| File | Change |
|------|--------|
| `src/modules/shared/api-schema.d.ts` | `pnpm api:generate` (generated) |
| `src/modules/movements/search.ts`, `search.test.ts` | B1, B2 |
| `src/modules/movements/chips.ts`, `FilterChips.test.ts` | B4 |
| `src/modules/movements/MovementFilters.tsx` | B3, option hiding |
| `src/locales/en.json`, `src/locales/es.json` | `movements.filters.exclude*`, `movements.chips.excluded` |

**Checks:** `pnpm verify`. Manual with `pnpm dev` at 375px and 1280px: AC1 to AC4; network tab shows the parameter on `/movements`, both `/movements/totals` and the export. **Size:** about 250 lines, 7 files plus generated.

## Phase 2: Counts as spending toggle

**Outcome:** SPEC B5 to B7. AC5 (Categories page part), AC8.

| File | Change |
|------|--------|
| `src/modules/categories/api.ts`, `hooks.ts` | `updateCategory`, `useUpdateCategory` (rename uses it) |
| `src/modules/categories/CategoriesPage.tsx` | Switch, dimmed "Not counted", `spendingAllCategories` query |
| `src/modules/dashboard/queries.ts` | `spendingAllCategories` only (counted_only comes in Phase 3) |
| `src/modules/dashboard/queries.test.ts` (new) | `spendingAllCategories` has no `counted_only` |
| `src/locales/en.json`, `src/locales/es.json` | `categories.countsAsSpending`, `categories.notCounted` |

**Checks:** `pnpm verify`. Manual: toggle on and off, reload keeps it; rename still works; force a failure (offline) for AC8. **Size:** about 200 lines, 7 files.

## Phase 3: Spending card and chart leave flagged categories out

**Outcome:** SPEC B8 to B10. AC5 (Dashboard part), AC6, AC7, AC9.

| File | Change |
|------|--------|
| `src/modules/categories/counting.ts`, `counting.test.ts` (new) | `notCountingNames` and the caption text helper |
| `src/modules/dashboard/queries.ts`, `queries.test.ts` | `counted_only` on `spending`, `unconfirmedSpending` |
| `src/modules/dashboard/SpendingCard.tsx` | Caption |
| `src/modules/movements/chart.ts`, `chart.test.ts` | `chartTotalsQuery` |
| `src/modules/movements/MovementsChart.tsx` | Use `chartTotalsQuery`; caption |
| `src/locales/en.json`, `src/locales/es.json` | `common.notCounting*` |

**Checks:** `pnpm verify`. Manual: AC5 to AC7 and AC9 with a flagged "Copy trading" that has a split movement; Hide Balances on still masks amounts and not names; the Dashboard looks unchanged with no flagged category. **Size:** about 250 lines, 10 files.

## Implementation State

**Status: built.** Phases 1 to 3 are implemented. `pnpm verify` passes on the finished tree: `api:check`, ESLint,
39 test files / 553 tests (node, TZ America/Santiago), `tsc -b` and `vite build`.

### Phase 1: API types and the Exclude filter

- `src/modules/shared/api-schema.d.ts`: regenerated with `pnpm api:generate` from the backend's OpenAPI file.
- `src/modules/movements/search.ts`, `search.test.ts`: `exclude_category_id` in `MovementsSearch`, `parseMovementsSearch`,
  `toMovementsQuery`, `FILTER_KEYS`; overlap dropped on parse; `withList` removes a picked item from the other category
  list; `withoutKey` covers the new key.
- `src/modules/movements/chips.ts`, `FilterChips.test.ts`: one exclusion chip per item, after the category chips, with
  `none` and the unknown-name fallback; removing one keeps the rest.
- `src/modules/movements/MovementFilters.tsx`: second searchable/clearable MultiSelect under the include one, with the
  visible label and aria-label "Exclude categories"; each MultiSelect hides the options picked in the other.
- `src/locales/en.json`, `src/locales/es.json`: `movements.filters.excludeCategory`,
  `movements.filters.excludeCategoryPlaceholder`, `movements.chips.excluded`.

Manual browser pass at 1280px and 375px: excluding Transport on /movements writes `exclude_category_id=6`, shows the
"Excluded: Transport" chip, and the chart summary drops from $3,372.90 / 46 completed to $3,117.90 / 44 while the list
drops from 48 to 46 movements. Requests checked: `/movements/totals?...&exclude_category_id=6&counted_only=true`,
`/movements?exclude_category_id=6&limit=50`, and `/movements/export?exclude_category_id=6` on Export CSV. The include
picker doesn't offer Transport, and the exclude picker doesn't offer an included Food. A hand-typed
`?category_id=7&exclude_category_id=7,9` renders as `category_id=7&exclude_category_id=9` with no 4xx.

### Phase 2: Counts as spending toggle

- `src/modules/categories/api.ts`, `hooks.ts`: `renameCategory` replaced by `updateCategory`; `useRenameCategory` replaced
  by `useUpdateCategory`, whose `onSettled` invalidates categories and all movements (the totals change). Rename sends
  `{name}`, the switch sends `{counts_as_spending}`.
- `src/modules/categories/CategoriesPage.tsx`: the Switch under the name link, hidden while renaming, a 44px hit area,
  disabled while its save is pending; the amount is dimmed with "Not counted" when flagged; the page reads
  `spendingAllCategories`.
- `src/modules/dashboard/queries.ts`: `spendingAllCategories`, the spending query without `counted_only`.
- `src/modules/dashboard/queries.test.ts`: new, checks `spendingAllCategories` has no `counted_only` and keeps the
  category grouping, filter and month.
- `src/locales/en.json`, `src/locales/es.json`: `categories.countsAsSpending`, `categories.notCounted`.

Manual browser pass: turning Transport off sends exactly `{"counts_as_spending":false}`, keeps the real $255.00 (dimmed)
with "Not counted" under it, persists after reload, and rename still works (`{"name":"Transport X"}`, flag kept). With
`PATCH /categories/:id` forced to 500, a toast appears and the switch returns to the server value.

### Phase 3: Spending card and chart leave flagged categories out

- `src/modules/categories/counting.ts`, `counting.test.ts` (new): `notCountingNames` (empty with `category_id`, minus
  explicit exclusions, list order) and `notCountingCaption` (one or two names, then "and N more").
- `src/modules/dashboard/queries.ts`, `queries.test.ts`: `counted_only: "true"` on `spending` and `unconfirmedSpending`;
  `labelCards`/`labelCount` unchanged.
- `src/modules/dashboard/SpendingCard.tsx`: the dimmed "Not counting" line under the summary, from the loaded categories.
- `src/modules/movements/chart.ts`, `chart.test.ts`: `chartTotalsQuery(search, range, period, tz)`, always with
  `counted_only: "true"` and carrying `exclude_category_id`.
- `src/modules/movements/MovementsChart.tsx`: uses `chartTotalsQuery`; shows the caption under the title next to the
  "Last 12 months" line. Both totals queries (summary and By category) get `counted_only=true`.
- `src/locales/en.json`, `src/locales/es.json`: `common.notCounting`, `common.notCountingMore_one/_other`.

Manual browser pass: with Transport flagged, the Dashboard Spending card reads "$1,512.90 across 8 groups" with
"Not counting: Transport" and no Transport row; the Movements chart reads "$3,117.90 · 44 completed movements" with the
same caption while the list still shows 48 movements. `?category_id=6` shows Transport ($255.00, 4 movements) with no
caption; `?exclude_category_id=6` shows only the chip, not the caption (AC7). With Rent and Travel also flagged, the
caption is "Not counting: Rent, Transport and 1 more". Hide Balances masks amounts but keeps the names. Spanish shows
"Sin contar: Transport", "Excluida: Transport", "Excluir categorías"/"Ninguna", "Cuenta como gasto" and "No se cuenta".
By category mode has `counted_only=true&group_by=category` and its legend leaves Transport out.

### Fake API

`scripts/fake-api.mjs` now stores `countsAsSpending` per category (true by default), answers it on GET/POST/PATCH,
accepts it on POST and PATCH with the backend's 400s (`invalid name`, `invalid counts_as_spending`), and implements
`exclude_category_id` and `counted_only` on the list, totals and export with the portion, fee/counter, overlap-400 and
flag-resolution rules of the backend spec. Seeded categories count. `node --check` passes.

### Deviations / notes

- The exclusion chip is `movements.chips.labelled` with **`movements.chips.excluded`** ("Excluded" / "Excluida"), which
  yields the AC1 text "Excluded: Copy trading". B4 names `movements.filters.excludeCategory` as the chip label, but that
  reads "Exclude categories: …"; the i18n table and AC1 agree on "Excluded", so both keys are used in their own place.
- The exclude MultiSelect has the visible `label` B3 asks for as well as its `aria-label`; the include control keeps its
  existing aria-label only.
- The Dashboard card still waits for its categories before drawing, as it already did (the group names come from them);
  the new caption only appears once `useCategories` succeeds, and is absent while loading or failed. Totals never wait
  for categories.
- `spendingAllCategories` is a second query key and a second request on the Categories page. That's the documented B7
  trade-off: one request shows the real amounts, while the Dashboard's request leaves the flagged categories out.
- `specs/INDEX.md` was changed to `built` as the task instructed, although the plan's general rule said not to touch it.
  `specs/ROADMAP.md` wasn't touched.
- No new dependency, no commit, no push, and no `.env` file was read.

