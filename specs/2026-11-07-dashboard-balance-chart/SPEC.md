---
title: Dashboard Balance Chart
spec_type: tech
type: feature
status: draft
domain: Portfolio
issue: none
created: 2026-11-07
updated: 2026-11-08
sdd_version: 7.3.0
---

# Dashboard Balance Chart

## Overview

A chart of the total balance over time on `/dashboard`, directly under the Total balance card, with range filters. The user asked for "a graph in the dashboard showing the balances over time ... under the total balance card. It should have some time filters".

It reuses the Assets balance chart rather than building a second one.

**Amendment (2026-11-07, Phase 4):** the value axis no longer starts at $0. A balance near $12,500 that moves a few hundred dollars drew an almost flat line. The axis now fits the data (D10, [Value axis fit to data](#value-axis-fit-to-data)), in every `BalanceChart`: the Dashboard chart and the Assets total and per-coin charts. The user wants to try it and judge the result, so it is one small change behind one switch, easy to revert. Depends on [Dashboard](../2026-10-30-dashboard/SPEC.md), [Assets](../2026-10-30-assets/SPEC.md) (the chart and its helpers) and [Hide Balances](../2026-11-07-hide-balances/SPEC.md) (the masking, which this chart must honour).

### Current State

- The Balance card shows a 30-day sparkline: inline SVG in `src/modules/dashboard/Sparkline.tsx`, with geometry in `sparkline.ts`, from `dashboardQueries(...).sparkline` (`GET /snapshots`, 30 days, browser `tz`, no bucket).
- Assets has the full chart: `src/modules/shared/components/BalanceChart.tsx` (on `@mantine/charts`, loaded with `React.lazy`, so recharts stays out of the main chunk), used by `src/modules/assets/BalanceHistory.tsx` and `CoinDetail.tsx`. Its helpers are in the assets module: `chart.ts` (`ChartPoint`, `balanceSeries`, `assetSeries`, `gapSpans`, `hasEnoughHistory`, `valueDomain`), `chartFormat.ts` (tick and tooltip formatters), `queries.ts` (`RANGE_DAYS`, `RANGE_KEYS` 7d/30d/90d/1y, `DEFAULT_RANGE` 30d, `rangeQuery`, and the coin-only `everHeldQuery`), and `RangeChips.tsx`. `BalanceChart`, in shared, imports from `assets/chart.ts`.
- The Assets range is component state, not in the URL (Assets PLAN, open question 2).
- Every query sends `to` as the page's mount time. A Sync invalidates every query (`useSyncBinanceData`), but a snapshot taken after `to` stays out of the refetched range.

### What the backend supports

From `../backend/README.md` and `backend/modules/snapshots/services.go`: `GET /snapshots?from&to&bucket&tz` returns one point per bucket, the bucket's last snapshot. Without `bucket`, the span picks it: up to 2 days `raw` (every snapshot), up to 31 days `hour`, up to 731 days `day`, longer `week`. A range may span at most 2000 buckets, with `raw` counted in 5-minute widths. Snapshots come from the cron (default every hour, minimum 5 minutes) and from each Sync.

| Range | Span | Bucket the backend picks | Most points | Under the 2000 cap |
|-------|------|--------------------------|-------------|--------------------|
| 24h | 1 day | raw | one per snapshot: about 24 at the default interval, plus syncs, at most 288 | yes, 288 widths |
| 7d | 7 days | hour | 168 | yes |
| 30d | 30 days | hour | 720 | yes |
| 90d | 90 days | day | 90 | yes |
| 1y | 365 days | day | 365 | yes |

All five are supported with no `bucket` sent. "All time" would need `week` or `month` buckets and a start date; it isn't offered (Open Question 3).

## Decisions

| # | Decision | Why |
|---|----------|-----|
| D1 | The chart is its own section, `.dash__history`, directly under `.dash__balance` in the right column. Below 768px it comes right after the Balance card: queue, balance, history, recent, spending, holdings | "Under the total balance card", as asked, on every width |
| D2 | Reuse `BalanceChart` and the series helpers. Move the shared pieces out of `src/modules/assets/` into `src/modules/shared/` (see Requirements). Assets keeps working unchanged | One chart. It also ends `shared` importing from a feature module |
| D3 | Ranges: 24h, 7d, 30d, 90d, 1y. Default 30d | All fit the backend's automatic bucket (table above). 30d matches the sparkline and Assets today |
| D4 | The range is the `range` search param of `/dashboard`. Absent means 30d, and choosing 30d removes it. An unknown value is ignored (30d). Changing it replaces the history entry and keeps the scroll position | Like the Movements filters, a view survives a reload and can be shared. Replace and no scroll reset, as for the Hide Balances toggle. `range` isn't retained when leaving the Dashboard. (Hide Balances no longer uses the URL; see its D15.) |
| D5 | The range control is the existing `RangeChips`, moved to shared with a `keys` prop, rather than a new segmented control | Same control as Assets. The card header already wraps, so five chips fit the narrow column on two lines if needed (Open Question 4) |
| D6 | The Dashboard chart sends `from` and `tz` and leaves `to` out, so the backend ends the range at the time of each request. `from` is fixed when the page mounts, so the query key holds | A Sync refetches the chart, and the new snapshot must appear on it, matching the Balance card's total |
| D7 | The 24h range labels its time axis with hours (such as 14:00), the others with days, as Assets does. *(Superseded 2026-11-08 by [Chart Time Axis](../2026-11-08-chart-time-axis/SPEC.md): the time axis spans the selected window, with clock-aligned ticks from `timeAxisTicks`; 1y is labelled by month; the format comes from the range inside `BalanceChart`.)* | Day labels on a one-day range would all read the same |
| D8 | In hidden-balances mode the line is still drawn. The value-axis ticks read `••••`, and the tooltip shows the time and `••••`. This comes from `BalanceChart` itself (Hide Balances, Phase 2), so this change adds no masking code | The shape shows direction, not size. With the fitted axis (D10) the shape doesn't even give ratios to the total: only up, down and the relative size of moves within the range |
| D9 | Remove the Balance card's 30-day sparkline, with `Sparkline.tsx`, `sparkline.ts`, its test, the `sparkline` query and its translation keys | The new chart right under it shows the same 30 days, with axes and ranges. Two charts of one series would be redundant. Needs the user's confirmation (Open Question 1); it's the last phase, so it can be dropped |
| D10 | *(Amendment.)* **The value axis fits the data** instead of starting at zero: from a little below the range's lowest value to a little above its highest, on round ticks, never below 0. It applies to **every** `BalanceChart`: the Dashboard chart, the Assets total, and the coin page's USD and amount charts. Behind one constant in `BalanceChart`, so turning it off restores the old axis | Moves of a few hundred dollars on a five-figure balance become visible. All four charts share the component, and one axis rule across the app is easier to read than a zero-based Dashboard next to a fitted coin chart (the amount chart already fitted its values, through recharts' `auto`). One switch keeps the trial cheap to undo. This supersedes the Assets spec's "a USD value starts at zero" for the value axis |

## Requirements

### Shared chart pieces (refactor, no behaviour change)

- `src/modules/assets/chart.ts` and `chart.test.ts` move to `src/modules/shared/chart.ts` and `chart.test.ts`, unchanged. Its type-only imports from `../snapshots/types` stay.
- `src/modules/assets/chartFormat.ts` moves to `src/modules/shared/chartFormat.ts`, and gains `formatHourTick(time)`: `Intl.DateTimeFormat(i18n.language, { hour: "2-digit", minute: "2-digit" })`.
- The range parts of `src/modules/assets/queries.ts` move to `src/modules/shared/chartRange.ts`: `RANGE_DAYS` (gaining `"24h": 1`), `RangeKey`, `DEFAULT_RANGE`, and `rangeQuery(now, key, timeZone)`, unchanged in output. It adds:
  - `ASSET_RANGE_KEYS = ["7d", "30d", "90d", "1y"]` (what Assets shows today) and `DASHBOARD_RANGE_KEYS = ["24h", "7d", "30d", "90d", "1y"]`.
  - `openRangeQuery(now, key, timeZone)`: `{ from, tz }` with no `to` and no `bucket` (D6).
  - `parseRangeSearch(raw, keys)`: `{ range?: RangeKey }`, kept only when `raw.range` is one of `keys` and isn't `DEFAULT_RANGE`.
- `everHeldQuery` and `EVER_FROM` stay in `src/modules/assets/queries.ts`. The range tests move with the code to `src/modules/shared/chartRange.test.ts`.
- `src/modules/assets/RangeChips.tsx` moves to `src/modules/shared/components/RangeChips.tsx`, with a `keys: readonly RangeKey[]` prop. Assets passes `ASSET_RANGE_KEYS`.
- Translations move from `assets.range.*` to `chart.range.*`, and from `assets.history.notEnough` and `notEnoughBody` to `chart.notEnough` and `chart.notEnoughBody`. `assets.history.title`, `chartLabel` and `gaps` stay.
- `BalanceChart` imports from `../chart`. Every import in `src/modules/assets/` follows the moves. Assets' behaviour, requests and text don't change.

### Value axis fit to data

Added by the Phase 4 amendment (D10). Display only: `y` is already a drawing coordinate (`chart.ts`), the tooltip still shows the API's exact string, and no request changes.

- `fitValueAxis(series: readonly ChartPoint[]): { domain: [number, number]; ticks: number[] } | null` in `src/modules/shared/chart.ts`, pure:
  - Uses only points whose `y` is a finite number (gaps are skipped). None: returns `null`.
  - `min`, `max` of those, `mid = (min + max) / 2`.
  - **Minimum span:** `span = max(max − min, |mid| × 0.02)`. So a flat line, or a single value, gets a span of 2% of its value, centred on it, and sits mid-chart instead of on an edge. If that is still 0 (every value is 0), the result is `{ domain: [0, 1], ticks: [0, 0.25, 0.5, 0.75, 1] }`.
  - **Padding:** 8% of `span` on each side: `low = mid − span/2 − 0.08 × span`, `high = mid + span/2 + 0.08 × span`.
  - **Never below 0:** when `min ≥ 0` (every balance and amount), `low = max(low, 0)`.
  - **Round ticks:** `step` is the smallest of 1, 2, 2.5 and 5 times a power of ten that is at least `(high − low) / 4`. The domain is `[floor(low / step) × step, ceil(high / step) × step]` (still not below 0), and `ticks` are every `step` from the first to the last, inclusive, which gives 4 to 7 ticks. Each tick is rounded to the step's decimals so float drift doesn't print `12399.999`.
- `BalanceChart.tsx` has `const FIT_VALUE_AXIS = true` at module level. When it's true and `fitValueAxis(series)` isn't `null`, `yAxisProps` gets `domain: axis.domain` and `ticks: axis.ticks`; otherwise `domain: valueDomain(startsAtZero)` as today. Reverting is setting the constant to `false`. `valueDomain`, its test and the `startsAtZero` prop stay, so the revert path still compiles and is tested. Computed with `useMemo` on `series`.
- The axis keeps `width: 84`. Tick labels still go through `formatTick` and `maskText`, so hidden balances show `••••` on every tick, as D8 says.
- Callers (`BalanceHistoryCard`, `BalanceHistory`, `CoinDetail`) don't change.

Examples (for the tests):

| Values | Domain | Ticks |
|--------|--------|-------|
| 12,300 to 12,700 | [12,200, 12,800] | 12,200, 12,400, 12,600, 12,800 |
| 12,500 flat, or a single 12,500 | [12,300, 12,700] | 12,300, 12,400, …, 12,700 |
| 0 to 100 | [0, 150] | 0, 50, 100, 150 (`low` clamped to 0) |
| 0.0012 to 0.0013 | [0.00115, 0.00135] | 0.00115, 0.0012, …, 0.00135 |
| all 0 | [0, 1] | 0, 0.25, 0.5, 0.75, 1 |

The implementer recomputes these from the formula in the test and fixes this table if a number here is off; the formula is the rule.

### Dashboard chart

- `src/routes/_app/dashboard.tsx` gains `validateSearch: (raw) => parseRangeSearch(raw, DASHBOARD_RANGE_KEYS)`.
- `src/modules/dashboard/BalanceHistoryCard.tsx` (new), rendered by `DashboardPage` in `<section className="dash__history">` after `.dash__balance`. It takes the page's `now` and `timeZone`.
- Data: `useSnapshotHistory(openRangeQuery(now, range, timeZone))`, which is `GET /snapshots?from=<now − range>&tz=<browser zone>`. Times are `Z` instants, so no `+` reaches the URL.
- Header: title `dashboard.history.title` and `RangeChips` with `DASHBOARD_RANGE_KEYS`, in a wrapping `Group`, as `BalanceHistory` lays it out.
- Chart: the lazy `BalanceChart` with `balanceSeries(points)`, `startsAtZero` (ignored while D10's axis applies), `formatUsd` for the tooltip, `formatUsdTick` for the value axis, `formatHourTick` for 24h and `formatDayTick` otherwise for the time axis *(amended 2026-11-08: replaced by `range`, `windowEnd` and `fetchedAt` props, see [Chart Time Axis](../2026-11-08-chart-time-axis/SPEC.md))*, `formatMoment` for the tooltip time, and `label` `dashboard.history.chartLabel`.
- Choosing a chip: `navigate({ to: "/dashboard", search: (prev) => ({ ...prev, range: key === DEFAULT_RANGE ? undefined : key }), replace: true, resetScroll: false })`. The hidden/shown state isn't in the URL, so a range change doesn't affect it.
- Surface: `Paper bg="dark.6"`, radius 12, padding 20/24, like the other Dashboard cards. Chart height 260px at every width, as on Assets.

### States

- **Loading:** a 260px skeleton under the header, while the request or the chart chunk loads. The header and chips show at once.
- **Error:** `SectionError` from `SectionStates.tsx`, with a retry. The other sections are unaffected.
- **Not enough history:** fewer than 2 points (`hasEnoughHistory`) shows `chart.notEnough` and `chart.notEnoughBody`. A new user with one snapshot sees this on every range; with two hourly snapshots, 24h, 7d and 30d draw a line. *(Amended 2026-11-08 by [Chart Time Axis](../2026-11-08-chart-time-axis/SPEC.md): the text is now a caption under the chart, not a replacement for it. One point draws its dot on the full window axis; zero points draw the empty window axis.)*
- **No snapshot yet:** when `GET /snapshots/latest` is 404 (`useLatestSnapshot()` returns `null`), the section isn't rendered. The Balance card already shows the sync prompt. While the latest snapshot is loading, the section renders as normal.
- **After a Sync:** the chart refetches with the rest (D6) and the new snapshot is its last point.
- **Hidden balances:** as D8.
- **Mobile (below 768px):** full width, after the Balance card. The chips wrap under the title. The value axis keeps its 84px width.

### Translations

| Key | en | es |
|-----|----|----|
| `dashboard.history.title` | Balance over time | Saldo en el tiempo |
| `dashboard.history.chartLabel` | Total balance over time | Saldo total en el tiempo |
| `chart.range.24h` | 24 hours | 24 horas |
| `chart.range.7d` / `30d` / `90d` / `1y` | as `assets.range.*` today | as `assets.range.*` today |

The chart's label doesn't name the range: the selected chip already says it, and one label avoids Spanish agreement problems ("últimos 1 año").

### Tests

- `chartRange.test.ts`: the moved range tests, plus 24h (`raw` under the cap, a span of 24 hours), `openRangeQuery` has `from` and `tz` and no `to` or `bucket`, and `parseRangeSearch` keeps each Dashboard key except 30d, and drops `"2y"`, `""`, `"24H"` and a 24h value when the keys are the Assets ones.
- `chart.test.ts`: moved, unchanged, still passing.
- `formatHourTick` in `en` and `es` (a helpers test, as `helpers.test.ts` does for `format.ts`).
- Phase 4, `chart.test.ts`, `fitValueAxis`: the examples table; every value lies inside the domain and the first and last ticks equal the domain's ends; ticks are evenly spaced, 4 to 7 of them, with no float noise (`12400`, not `12399.999…`); the domain never goes below 0 for non-negative data; a flat series puts its value strictly inside the domain, near the middle; gaps (`y: null`) are ignored, and an all-gap or empty series returns `null`; small amounts (0.0012 to 0.0013) get a fitted domain with ticks of a matching step.

## Acceptance Criteria

- **Given** a user with snapshots over the last 30 days, **when** the Dashboard opens, **then** the chart sits under the Balance card with 30 days selected, and one request goes out: `GET /snapshots` with `from` 30 days back, the browser's `tz`, and no `to` or `bucket`.
- **Given** the user picks 7 days, **then** the URL is `/dashboard?range=7d`, the chart redraws for 7 days, the page doesn't scroll, and Back leaves the Dashboard instead of returning to 30 days.
- **Given** `/dashboard?range=1y`, **then** 1 year is selected and the chart loads with no `range too large for bucket` error.
- **Given** `/dashboard?range=2y`, **then** 30 days is selected.
- **Given** 24 hours, **then** the time axis shows hours and the tooltip shows the full date and time.
- **Given** an account with a single snapshot, **then** the chart section says "Not enough history yet" on every range. *(Amended 2026-11-08: as a caption under a chart that shows the one point on the selected window; see [Chart Time Axis](../2026-11-08-chart-time-axis/SPEC.md).)*
- **Given** an account with no snapshot, **then** the Balance card shows the sync prompt and no chart section shows.
- **Given** the history request fails, **then** the section shows an error with Try again, and the other sections are unaffected.
- **Given** the user clicks Sync, **then** the chart's last point is the new snapshot, and its value matches the Balance card total.
- **Given** balances are hidden, **then** the line is drawn, the axis labels read `••••`, and the tooltip shows the time and `••••`. **Given** they're shown, **then** real values appear, with no new request.
- **Given** balances shown and `?range=90d`, **when** the user changes the range, **then** balances stay shown. **When** the user goes to Movements, **then** `range` is dropped and balances stay shown.
- **Given** a 375px screen, **then** the chart is full width right after the Balance card, the chips wrap, and nothing overflows.
- **Given** Spanish, **then** the title, chips, axis labels, tooltip and empty state are in Spanish.
- **Given** Assets after the refactor, **then** its ranges, requests, text and charts are as before (apart from the value axis, changed by D10). *(Later changed by [Chart Time Axis](../2026-11-08-chart-time-axis/SPEC.md): Assets gains 24h and drops `to`.)*
- **Given** a balance near $12,500 that moved a few hundred dollars in the range, **when** the Dashboard chart draws, **then** the value axis spans about that movement on round ticks (not from $0), and the line uses most of the chart's height.
- **Given** a flat balance over the range, **then** the line sits around the middle of the chart, not on its top or bottom edge.
- **Given** any chart, **then** no value-axis tick is below $0 (or below 0 for an amount).
- **Given** the Assets page total chart, a coin's USD chart and a coin's amount chart, **then** each value axis fits its data the same way.
- **Given** balances are hidden, **then** every value-axis tick of every chart reads `••••`, the axis width doesn't change, and the line is drawn with the fitted axis.
- **Given** `FIT_VALUE_AXIS` is set to `false`, **then** the charts draw as before Phase 4 (USD from 0, amounts on recharts' `auto`).

## Out of Scope

An "All time" range, custom date ranges, Spot and Funding as separate lines, per-coin lines on the Dashboard, a marker for deposits and withdrawals, putting the Assets range in the URL, adding 24h to Assets (since done by [Chart Time Axis](../2026-11-08-chart-time-axis/SPEC.md)), and an unpriced-coins note on the chart (the Balance card has one).

## Open Questions

1. Remove the Balance card's 30-day sparkline (D9)? **Recommendation: yes.** If the user prefers to keep it, drop Phase 3 of the plan.
2. Should Assets get the same treatment later: 24h, the range in the URL (Assets PLAN open question 2), and the open-ended `to` so a Sync shows on its charts? **Recommendation: yes, as a separate small change.** This one keeps Assets as it is. **Resolved 2026-11-08 by [Chart Time Axis](../2026-11-08-chart-time-axis/SPEC.md):** Assets gets 24h and the open-ended `to` (a Sync now shows on its charts); the range stays local state, not in the URL.
3. Add "All time"? It needs a start date (the first snapshot isn't exposed; `everHeldQuery` uses 2000-01-01 with `month` buckets) and `week` or `month` buckets. **Recommendation: not now.** History started recently.
4. Five chips in the right column may wrap to two lines at some widths. Is that fine, or should the Dashboard use a compact `SegmentedControl` with short labels (24h, 7d, 30d, 90d, 1y)? **Recommendation: chips**, for one control across the app.
5. *(Amendment.)* After trying the fitted axis, keep it, keep it only on some charts, or revert (set `FIT_VALUE_AXIS` to `false`)? **Recommendation: keep it on all four charts** (D10). The fitted axis exaggerates small moves; if that reads as alarming on the Dashboard, the 8% padding or the 2% minimum span can be widened rather than reverting.
