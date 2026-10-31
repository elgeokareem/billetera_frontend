---
title: "Implementation Plan: Movements and Categories"
change: movements-categories-1
type: feature
spec: ./SPEC.md
issue: none
created: 2026-10-30
sdd_version: 7.3.0
---

# Implementation Plan: Movements and Categories

**Spec:** [SPEC.md](./SPEC.md)

Same phase rules as [App Foundation](../2026-10-30-app-foundation/PLAN.md).

## Phase 1: List and filters

Deliverables: `/movements` with paging, responsive rows, URL filters, chips, empty states, the "Needs a label" preset, and the Dashboard's "Review all" link.

Files: `src/routes/_app/movements.tsx`, `src/modules/movements/{MovementsTable,MovementCards,MovementFilters}.tsx`, `src/modules/movements/hooks.ts`, `src/locales/*`.

Checks: the filter and paging criteria. Unit tests for turning search params into API params, including `%2B`.

## Phase 2: Editing and export

Deliverables: detail drawer, inline category, minimal PATCH bodies, CSV download.

Files: `src/modules/movements/{MovementDrawer,ExportButton}.tsx`, `src/modules/movements/api.ts`, `src/locales/*`.

Checks: the edit and export criteria.

## Phase 3: Categories

Deliverables: `/categories` with create, rename, delete, suggestions, and the link to filtered Movements.

Files: `src/routes/_app/categories.tsx`, `src/modules/categories/*`, `src/locales/*`.

Checks: the category criteria, on a test account.

## Implementation State

Phases 1, 2 and 3 are built, with the fake API extended in `scripts/fake-api.mjs`: a `long-history` account, and the backend's text for a refused export. Nothing is committed. The Assets view isn't started. `pnpm-lock.yaml` and `src/routeTree.gen.ts` are unchanged, and no dependency was added.

**Verified:**
- `pnpm lint` exits 0 with no output. `pnpm build` (`tsc -b && vite build`) exits 0. Its chunk-size advisory was already in the baseline. The JS is 1,016 kB minified, against 923 kB before this change, because the Mantine pieces of the view are new to the bundle.
- `pnpm test` passes 129 of 129 in 13 files. The new tests cover the search params (text kept as written, `%2B`, comma lists), the search-to-API conversion (times in Z, no raw `+`, the export's filters), the date presets, the filter chips, the PATCH body, the export file name, the feed's rows, and the locale key sets.
- Headless Chrome (puppeteer-core, scripts in the scratchpad, outside the repo) against the fake on 8099 and Vite on 5173, on the final code:
  - Phase 1, list and filters: 51 of 51.
  - Phase 2, drawer, inline category and export: 31 of 31.
  - Phase 3, categories: 29 of 29.
  - Binance AC6 in the UI, remove the key, connect again, movements and categories still there: 8 of 8.
  - Dashboard suites, rerun after this change: read-only 114 of 114, labelling 46 of 46, extra 11 of 11.
  - Binance connection suite: 113 of 113.
- Acceptance criteria, all pass: filters and results survive a reload; Load more keeps the filters, sends the cursor, and shows no repeats (the rows match the API's total); an offset in a date goes out in Z time; a category-only change sends no `reason`; Export matches the filters and keeps the backend's file name (checked in the saved file); `food` when `Food` exists shows the translated error; deleting a category makes its spending need a label, and the Dashboard count goes from 2 to 4.
- Dashboard AC2: "See older" opens Movements with the label filters and no dates, and lists last month's unlabelled movements.
- Screenshots at 1440px and 375px, read by eye: the table and the cards, the filters closed and open, the drawer on desktop and on a phone, the empty states, the delete dialog, the categories list and rename, and Spanish.

**Not verified:**
- The real backend (roadmap step 6). The file name, the 422 text and the CSV come from the fake, which copies the backend's formats. The 100,000-row export cap wasn't reached.
- Browsers other than Chrome.
- Widths from 768px to about 1000px, where the table scrolls sideways. Only the absence of page overflow was checked there.
- Real Binance data. No real key was used.
- Data that changes under an open page: another tab, a sync from the cron, or a page left open across midnight. The dates are fixed when the page mounts, as on the Dashboard.

**Drift from the plan and spec:**
- `src/main.tsx` passes `parseSearch` and `stringifySearch` to the router (`src/modules/shared/search-params.ts`). TanStack's default reader turned `q=1.50` into 1.5 and `q=null` into null, so a search would silently change. This file wasn't in the plan's list.
- The search state uses the API's own names, and a list is comma text (`kind=p2p,pay`). The address bar shows the commas and colons unescaped, and a `+` as `%2B`. Arrays in the state weren't needed.
- "Last 90 days" is the last 90 calendar days, today included: from the start of the day 89 days back, to the start of tomorrow. The spec doesn't define it.
- The "Needs a label" preset has a button in the filter panel, under the category filter. It replaces the other filters, as a link does. The spec defines the preset, and the Dashboard links use it.
- The inline category select shows "Needs a label" as its placeholder, in the accent colour (a class in `src/app.css`), not as text. Rows with no category show "No category".
- The table's selects don't keep their dropdowns mounted (`keepMounted: false`). Mantine keeps them mounted and hidden by default, which put 185 hidden options on the page. The table and the cards are memoised, so typing in the search box doesn't re-render every row, which was making the 300ms debounce unreliable in development.
- The drawer shows every field the API has, with the reason and the category at the top, and Save under them. A closed drawer drops unsaved text.
- A category with no spending this month shows $0.00. One whose rows are all unpriced shows "No price", with the count of unpriced movements under it.
- Renaming a category to its own name sends no request. Creating from the form refuses an invalid name before any request. The create input has no `maxLength`, so the 1 to 64 rule is the one `isValidCategoryName` applies.
- Files outside the plan's list: `src/modules/movements/{MovementParts,MovementDrawer,ExportButton,patch,labels,chips}.ts(x)` and their tests, `src/modules/categories/CategoriesPage.tsx`, `src/modules/shared/{search-params,download}.ts` and their tests, the body of `src/routes/_app/categories.tsx`, and the placeholder rule in `src/app.css`. `movements/hooks.ts`, `movements/api.ts` and `movements/search.ts` were extended beyond the Dashboard's needs.
- The fake: the `long-history` account is test data. Its 110 extra movements are needed to page at 50 a page, which the 36-movement seed never does. The 422 of a refused export carries the backend's text.
- A Dashboard check asserted the old Movements placeholder text. It now asserts that the list shows the unlabelled spending, which is what "See older" links to. This is a test update, not a regression.
- The Dashboard PLAN's Implementation State is out of date: it says the Movements view isn't started, and that the "See older" list isn't verified. That file belongs to the Dashboard change and wasn't edited here.

**Open questions:**
- Should a drawer close after a save, as it does now, or stay open with a "saved" note?
- Between 768px and about 1000px, should the table keep scrolling sideways, or drop the reason column?
- Should "Last 90 days" end at now, instead of including today?
- Should deleting a category say how many movements it affects? The spec doesn't ask for it.
- Should "Export CSV" be hidden on an account with no movements, since it would download only a header row?
