---
title: "Implementation Plan: Hide Balances"
change: hide-balances-1
type: feature
spec: ./SPEC.md
issue: none
created: 2026-11-07
sdd_version: 7.3.0
---

# Implementation Plan: Hide Balances

**Spec:** [SPEC.md](./SPEC.md)

Same phase rules as [App Foundation](../2026-10-30-app-foundation/PLAN.md):
- Never commit. Never read or print `.env` files.
- Before reporting a phase done, run `pnpm lint`, `pnpm test` and `pnpm build`.
- Confirm `pnpm-lock.yaml` and `src/routeTree.gen.ts` hold only changes the phase meant to make. Running the dev server can rewrite both. No phase adds a dependency, so `pnpm-lock.yaml` must not change.
- Don't touch `specs/INDEX.md` or `specs/ROADMAP.md`. The main session updates them.

**Start after the [Landing Page](../2026-11-07-landing-page/PLAN.md) implementation is finished.** It is editing `src/locales/{en,es}.json`, `src/app.css` and `src/modules/shared/session.ts` now. Phase 1 here edits the locales too. Don't change `session.ts` or the landing module.

**Build this change before [Dashboard Balance Chart](../2026-11-07-dashboard-balance-chart/PLAN.md).** That chart reuses `BalanceChart`, which Phase 2 makes honour the hidden state.

Browser checks run against the fake API: `pnpm fake-api`, then `VITE_BACKEND_ENDPOINT=http://localhost:8099 pnpm dev`. Login is `test@example.com` / `password`; a key of `readonly` connects it. Keep browser scripts in the scratchpad, outside the repo.

## Phase 1: Param, helpers and toggle

*Built. Its URL parts (the `show_balances` param, retention on `/_app`, the URL helpers, the toggle's navigation) are superseded by Phase 4; its checks about retention no longer apply.*

Deliverables: the `show_balances` param on `/_app` with retention, the pure helpers with tests, `useBalancesHidden`, `Sensitive`, the toggle in the header and navbar, the `hasFilters` fix, and the two translation keys. Nothing is masked yet.

Files:
- `src/modules/shared/privacy.ts` (new): `SHOW_BALANCES_PARAM`, `BalancesSearch`, `parseBalancesSearch`, `balancesShown`, `withBalancesShown`, `MASK`, `maskText`.
- `src/modules/shared/privacy.test.ts` (new): the cases in the spec's Tests section.
- `src/modules/shared/usePrivacy.ts` (new): `useBalancesHidden`.
- `src/modules/shared/components/Sensitive.tsx` (new).
- `src/modules/shared/components/BalancesToggle.tsx` (new).
- `src/routes/_app.tsx`: `validateSearch` and `search.middlewares` with `retainSearchParams`.
- `src/modules/shared/components/AppLayout.tsx`: the toggle in the header (below `sm`) and the navbar brand row (from `sm`).
- `src/modules/movements/search.ts` and `search.test.ts`: `hasFilters` counts only filter keys.
- `src/locales/{en,es}.json`: `privacy.toggle`, `privacy.hidden`.

Checks:
- Unit tests pass, including the new ones. `locales.test.ts` passes with the new keys in both files.
- Browser: the toggle adds and removes `show_balances=true` with `replace`, and keeps the scroll position. With the param set, every nav item, the Dashboard's Holdings, Recent movements, "See older" and "Review all" links, a coin row, the coin page's movements link and back link, a Movements filter change, chip removal, search typing and "Clear all" all keep it. "Clear all" isn't shown when the only param is `show_balances`. The active nav item still highlights. The toggle is in the header at 375px, in the navbar at 1440px, and only one is in the accessibility tree.
- Browser: logging out and in, an expired session (the fake's session reset) returning through `redirect`, and `/` while logged in, behave as the spec's D9 says.
- If `retainSearchParams` doesn't keep the param on a navigation that passes a full `search` object, stop and report it with the route and call. Don't add the param by hand at call sites.

## Phase 2: Dashboard and charts

Deliverables: masking on every Dashboard section and in `BalanceChart`, as the spec's table lists.

Files:
- `src/modules/dashboard/BalanceCard.tsx`: total and USD change.
- `src/modules/dashboard/Sparkline.tsx`: value-axis labels.
- `src/modules/dashboard/SpendingCard.tsx`: per-category totals, the summary and its `aria-label`.
- `src/modules/dashboard/HoldingsCard.tsx`, `LabelCard.tsx`, `RecentMovements.tsx`: amounts and USD values.
- `src/modules/shared/components/BalanceChart.tsx`: reads `useBalancesHidden()`; ticks and the tooltip value use `maskText`; the axis width stays 84.

Checks:
- Browser, at 1440px and 375px, in English and Spanish, hidden and shown: every value in the table is masked when hidden and real when shown; percentages, counts, names and "No price" are untouched. Measure each Dashboard card's height in both states; they must match.
- Toggling sends no API request (watch the network log).
- The Assets history chart: masked ticks and tooltip, line drawn, gap shading and its "No price" label unchanged.
- Screen reader text: a masked value's accessible text is "Hidden" / "Oculto"; the spending bar's label carries "Hidden" in place of the total.
- The existing Dashboard and Assets browser suites still pass when run with `show_balances=true` added to their start URLs. Note any assertion that had to change.

## Phase 3: Movements, Categories and Assets

Deliverables: masking on the rest of the app.

Files:
- `src/modules/movements/MovementParts.tsx`: amount and USD value, with the sign (table and cards share it).
- `src/modules/movements/MovementDrawer.tsx`: amount, USD value, counter amount, fee amount and fee USD value. `usd_price` and `unit_price` stay.
- `src/modules/categories/CategoriesPage.tsx`: per-category totals.
- `src/modules/assets/AssetSummary.tsx`, `CoinList.tsx`, `CoinDetail.tsx`: totals, wallet values, amounts, the wallet split, free, locked and frozen. Share of total stays.

Checks:
- Every acceptance criterion in the spec, in the browser, recorded pass or fail.
- A CSV export while hidden holds real values (open the file and compare one row with the shown table).
- Height check as in Phase 2 for a Movements table row, a movement card at 375px, a coin row and the coin detail panels.
- The Movements and Assets browser suites pass with `show_balances=true` added to their start URLs.

## Phase 4: Move state from URL to localStorage store

Revision of a built change. Phases 1 to 3 are in the working tree, uncommitted; the earlier Phase 4 (saved choice plus an entry rule in `/_app`'s `beforeLoad`) is cancelled and is being reverted by another task. This phase replaces the URL mechanism Phases 1 to 3 built with a Zustand store backed by `localStorage`, and keeps everything else (masking, `Sensitive`, aria, translations, heights, CSV). Spec: D14 to D22, [Superseded decisions](./SPEC.md#superseded-decisions), and the Requirements sections "Removed: the URL mechanism", "Storage helpers", "Store", "Reading the state" and "Toggle".

**Start after the revert of the cancelled Phase 4 is finished**, and check what it left in `privacy.ts`, `privacy.test.ts`, `BalancesToggle.tsx` and `_app.tsx` before editing. The storage helpers may or may not be there; the spec says to keep or re-add them. **Don't edit `src/modules/shared/chart.ts` or `src/modules/shared/components/BalanceChart.tsx`**: another task is changing the chart's axis logic. `BalanceChart` keeps calling `useBalancesHidden()`, whose signature doesn't change, so it needs no edit. If it turns out it does, stop and report.

Deliverables: the URL param removed everywhere; the storage helpers and `shownFromStorageEvent` in `privacy.ts`; the store with cross-tab sync; `useBalancesHidden` and the toggle reading the store; tests.

Files:
- `src/modules/shared/privacy.ts`: remove `SHOW_BALANCES_PARAM`, `BalancesSearch`, `parseBalancesSearch`, `balancesShown`, `withBalancesShown`, `balancesEntrySearch`. Keep `MASK`, `maskText`. Keep or add `BALANCES_STORAGE_KEY`, `BalancesStorage`, `loadBalancesShown`, `saveBalancesShown`; add `shownFromStorageEvent`. New header comment.
- `src/modules/shared/privacy.test.ts`: remove the URL suites; storage and event cases as the spec's Tests section lists.
- `src/modules/shared/balancesStore.ts` (new): `BalancesState`, `createBalancesStore`, `connectBalancesSync`, `balancesStore`, and the guarded one-time `connectBalancesSync(balancesStore, window)`. `createStore` from `zustand/vanilla`.
- `src/modules/shared/balancesStore.test.ts` (new): init, toggle, persistence across a new store, failing storage, `storage` and `pageshow` sync, unsubscribe.
- `src/modules/shared/usePrivacy.ts`: `useBalancesHidden` via `useStore(balancesStore, (s) => !s.shown)`; no router import.
- `src/modules/shared/components/BalancesToggle.tsx`: reads the store, click calls `toggle()`; no `useNavigate`; new doc comment.
- `src/routes/_app.tsx`: remove `validateSearch`, `search.middlewares`, `retainSearchParams`, `cause` and any entry rule; imports back to `createFileRoute`, `redirect` and what the session and key checks need.
- `src/modules/movements/search.ts`: comments on `FILTER_KEYS` and `hasFilters` only (D22). `search.test.ts`: reword the "parent route" describe block; keep its two assertions.
- `src/modules/dashboard/BalanceHistoryCard.tsx`: doc comment only (drop the `show_balances` sentence).

Not touched: `chart.ts`, `BalanceChart.tsx`, `Sensitive.tsx`, `SpendingCard.tsx`, `AppLayout.tsx`, every masked view from Phases 2 and 3, `session.ts`, `routes/index.tsx`, `login.tsx`, `register.tsx`, `connect.tsx`, `LoginPage.tsx`, `ConnectPage.tsx`, the locales, `main.tsx`. No dependency is added (Zustand is already one), so `pnpm-lock.yaml` must not change.

Before finishing, `grep -rn "show_balances\|SHOW_BALANCES_PARAM\|withBalancesShown\|balancesShown\|parseBalancesSearch\|balancesEntrySearch\|retainSearchParams" src` must return only the reworded test in `search.test.ts` (which uses `show_balances` as an example stale key), and nothing in `src/routeTree.gen.ts`.

Checks:
- `pnpm lint`, `pnpm test`, `pnpm build` pass. `src/routeTree.gen.ts` and `pnpm-lock.yaml` unchanged (the route tree takes search types from the route files, not the generated file; if it does change, report the diff).
- Browser, against the fake API, at 1440px and 375px, recording pass or fail for each. Clear `localStorage` before each group, or set `billetera.showBalances` by script, as the case needs:
  - Default: nothing saved, log in, `/dashboard` is masked, toggle `aria-pressed="false"`.
  - Toggle: show, then hide. Each time the values change at once, `billetera.showBalances` is `"true"` then `"false"`, `location.href` and `history.length` are the same before and after, the scroll position stays, and the network log shows no request. Card heights match in both states.
  - Navigation while shown: nav items, Holdings and Recent movements links, "See older", "Review all", a coin row, the coin page's links, a Movements filter change, chip removal, search typing, "Clear all", a Dashboard range chip. Values stay shown and no URL has `show_balances`.
  - Persistence: shown, then reload, a new tab on `/dashboard`, and a bookmark-style direct open of `/movements?q=rent`: all shown. Hidden, then the same: all hidden.
  - Logout keeps it: saved `"true"`, log out, `billetera.showBalances` is still `"true"`, log in, values shown.
  - History: show on Dashboard, go to Movements, hide, press Back: Dashboard is hidden; press Forward: Movements is hidden. Hide, then open `/dashboard?show_balances=true` and press Back and Forward around it: hidden throughout.
  - Stale param: with saved `"false"`, open `/dashboard?show_balances=true` and `/movements?show_balances=true`: hidden, no error, "Clear all" not shown on Movements. With saved `"true"`, open `/dashboard?show_balances=false`: shown.
  - Two tabs (two pages in one browser context): tab B toggles; tab A follows without reload and its URL doesn't change. `localStorage.clear()` in tab B hides tab A.
  - Storage blocked: an init script makes `window.localStorage` throw (for example `Object.defineProperty(window, "localStorage", { get() { throw new DOMException("blocked", "SecurityError") } })`). Open the app, toggle, navigate, reload. No crash, no uncaught error in the console, starts hidden, the toggle works within the session, hidden after the reload.
  - CSV export while hidden holds real values.
  - Screen reader text: the toggle is "Show balances" / "Mostrar saldos" with `aria-pressed`; a masked value reads "Hidden" / "Oculto". Only one toggle is in the accessibility tree at each width.
- Re-run the Dashboard, Movements and Assets browser suites. Any start URL that added `show_balances=true` now sets `billetera.showBalances` to `"true"` instead (init script or `localStorage.setItem` before load). Note each assertion that changed.

## Implementation State

Phases 1 to 3 implemented (uncommitted), with the URL mechanism that Phase 4 removes. The earlier Phase 4 (entry rule) is cancelled and being reverted. Phase 4 (move state from URL to localStorage store) not started.
