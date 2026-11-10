---
title: "Implementation Plan: Dashboard Balance Chart"
change: dashboard-balance-chart-1
type: feature
spec: ./SPEC.md
issue: none
created: 2026-11-07
sdd_version: 7.3.0
---

# Implementation Plan: Dashboard Balance Chart

**Spec:** [SPEC.md](./SPEC.md)

Same phase rules as [App Foundation](../2026-10-30-app-foundation/PLAN.md):
- Never commit. Never read or print `.env` files.
- Before reporting a phase done, run `pnpm lint`, `pnpm test` and `pnpm build`.
- Confirm `pnpm-lock.yaml` and `src/routeTree.gen.ts` hold only changes the phase meant to make. Running the dev server can rewrite both. No phase adds a dependency, so `pnpm-lock.yaml` must not change.
- Don't touch `specs/INDEX.md` or `specs/ROADMAP.md`. The main session updates them.

**Order:** start after [Hide Balances](../2026-11-07-hide-balances/PLAN.md) is built, at least through its Phase 2, which makes `BalanceChart` honour the hidden state. (Its later Phase 4 moves that state from the URL to a localStorage store.) The [Landing Page](../2026-11-07-landing-page/PLAN.md) work must also be finished, since Phase 2 here edits `src/app.css` and the locales.

Browser checks run against the fake API: `pnpm fake-api`, then `VITE_BACKEND_ENDPOINT=http://localhost:8099 pnpm dev`. Login is `test@example.com` / `password`; a key of `readonly` connects it. The fake already picks `raw` up to 2 days, as the backend does. If it lacks a scenario the checks need (a single snapshot, several snapshots in the last 24 hours, a failing `/snapshots`), extend `scripts/fake-api.mjs` and say so in the report. Keep browser scripts in the scratchpad, outside the repo.

## Phase 1: Move the chart pieces to shared

Deliverables: the refactor in the spec's "Shared chart pieces", with no change in behaviour. Assets passes `ASSET_RANGE_KEYS` to the moved `RangeChips`. `RANGE_DAYS` gains `24h`, `formatHourTick`, `openRangeQuery` and `parseRangeSearch` are added with tests, but nothing uses them yet.

Files:
- Move: `src/modules/assets/{chart,chart.test,chartFormat}.ts` to `src/modules/shared/`; `src/modules/assets/RangeChips.tsx` to `src/modules/shared/components/RangeChips.tsx`.
- New: `src/modules/shared/chartRange.ts` and `chartRange.test.ts`, with the range parts and tests from `src/modules/assets/queries.ts` and `queries.test.ts`.
- Edit: `src/modules/assets/{queries,queries.test,BalanceHistory,CoinDetail}.ts(x)` and any other Assets file that imports the moved code; `src/modules/shared/components/BalanceChart.tsx`; `src/modules/shared/helpers.test.ts` for `formatHourTick`.
- `src/locales/{en,es}.json`: `assets.range.*` to `chart.range.*` (plus `24h`), `assets.history.notEnough*` to `chart.notEnough*`.

Checks:
- `pnpm test` passes with the same tests as before plus the new ones; no moved test's assertion changes. `grep -r "assets/chart\|assets/RangeChips\|assets.range" src` finds nothing.
- The Assets browser suites (list, coin page, request rules) pass with no assertion changed, apart from translation key names if a script reads them.

## Phase 2: The Dashboard chart

Deliverables: the `range` param on `/dashboard`, `BalanceHistoryCard` with every state in the spec, the layout under the Balance card, and the translations.

Files:
- `src/routes/_app/dashboard.tsx`: `validateSearch`.
- `src/modules/dashboard/BalanceHistoryCard.tsx` (new).
- `src/modules/dashboard/DashboardPage.tsx`: the `.dash__history` section after `.dash__balance`.
- `src/app.css`: `.dash__history` in the min-width and order rules; the mobile order becomes queue 1, balance 2, history 3, recent 4, spending 5, holdings 6.
- `src/locales/{en,es}.json`: `dashboard.history.title`, `dashboard.history.chartLabel`.

Checks:
- Every acceptance criterion in the spec except the sparkline's removal, in the browser, recorded pass or fail. Check the request shapes in the network log: `from` and `tz`, no `to`, no `bucket`, no raw `+`.
- Screenshots at 1440px, 1024px and 375px, in English and Spanish, with balances hidden and shown, and in the loading, error, not-enough-history and no-snapshot states.
- The chart chunk is still a separate lazy chunk in `pnpm build` output; note the main chunk's size change.
- The Dashboard browser suites (read, labelling, extra scenarios) pass. Any assertion about section order on mobile that changes is listed.

## Phase 3: Remove the sparkline

Do this phase only if the user confirms the spec's Open Question 1. Otherwise skip it and say so in the Implementation State.

Deliverables: the Balance card without the sparkline, its loading and error lines, and its query.

Files:
- `src/modules/dashboard/BalanceCard.tsx`: remove the sparkline query, skeleton, error and chart.
- `src/modules/dashboard/queries.ts`: remove `sparkline`.
- Delete `src/modules/dashboard/{Sparkline.tsx,sparkline.ts,sparkline.test.ts}`.
- `src/locales/{en,es}.json`: remove `dashboard.balance.sparkline` and `dashboard.balance.chartFailed` if nothing else uses them.

Checks:
- `grep -r "sparkline\|Sparkline" src` finds nothing. The Dashboard sends one `GET /snapshots` fewer on load.
- The Balance card's states (loading, error, no snapshot, change with and without a comparison, unpriced note, Sync) look and work as before, at 1440px and 375px.
- The Dashboard browser suites pass; assertions about the sparkline are removed and listed.

## Phase 4: Value axis fit to data

Amendment to a built change: Phases 1 to 3 are in the working tree, uncommitted. Spec: D10 and [Value axis fit to data](./SPEC.md#value-axis-fit-to-data). Keep it small: the user will try it and may revert it by flipping one constant.

Deliverables: `fitValueAxis` with tests, and `BalanceChart` using it behind `FIT_VALUE_AXIS`.

Files:
- `src/modules/shared/chart.ts`: `fitValueAxis`. Leave `valueDomain` as it is.
- `src/modules/shared/chart.test.ts`: the Phase 4 cases in the spec's Tests section, including the examples table. If a table value disagrees with the formula, trust the formula, fix the test value, and report the corrected row so the spec can be updated.
- `src/modules/shared/components/BalanceChart.tsx`: `FIT_VALUE_AXIS`, a `useMemo` of `fitValueAxis(series)`, and `yAxisProps` taking its `domain` and `ticks` with the `valueDomain(startsAtZero)` fallback. Update the comment beside `yAxisProps` and the `startsAtZero` prop's doc to say it applies only when the fitted axis is off or has no data.

Not touched: `BalanceHistoryCard.tsx`, `BalanceHistory.tsx`, `CoinDetail.tsx`, `chartFormat.ts`, locales. About 120 changed lines, mostly tests.

Checks:
- `pnpm lint`, `pnpm test`, `pnpm build` pass. `src/routeTree.gen.ts` and `pnpm-lock.yaml` unchanged.
- Browser, against the fake API, at 1440px and 375px, hidden and shown: the Dashboard chart on 24h, 7d, 30d, 90d and 1y; the Assets total chart; a coin's USD and amount charts. For each, record the axis's lowest and highest tick against the data's min and max (from the `/snapshots` or history response): ticks are round, none below 0, the line uses most of the height, and the axis width stays 84px. With balances hidden every tick reads `••••`.
- A flat range (extend `scripts/fake-api.mjs` with a flat series if none exists, and say so): the line sits mid-chart.
- A coin with gaps (no price): gaps and their "No price" shading unchanged.
- Set `FIT_VALUE_AXIS` to `false` locally, confirm the old axis (USD from 0) returns, then set it back to `true`. Leave it `true`.
- Take screenshots of the Dashboard chart and a coin's USD chart, shown, before and after, into the scratchpad, and list their paths in the report so the user can compare.

## Implementation State

Phases 1 to 3 implemented (uncommitted). Phase 4 not started.

*Update 2026-11-09:* all four phases are implemented and committed in `a40391d`. Phase 4 is the fitted value axis: `fitValueAxis` in `src/modules/shared/chart.ts` and the `FIT_VALUE_AXIS` switch in `BalanceChart.tsx`, on. The time axis is being reworked by [Chart Time Axis](../2026-11-08-chart-time-axis/SPEC.md).
