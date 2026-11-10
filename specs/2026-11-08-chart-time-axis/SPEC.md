---
title: Chart Time Axis
spec_type: tech
type: bugfix
status: draft
domain: Portfolio
issue: none
created: 2026-11-08
updated: 2026-11-09
sdd_version: 7.3.0
---

# Chart Time Axis

## Overview

The user's report about the Assets chart and the Dashboard "Balance over time" chart: clicking the range filters "doesn't update, always shows the same range and values". What they expect: "the X axis should change with the filter; if we have no data we should just show what we have, but the axis should change."

This fix changes every `BalanceChart`: the Dashboard chart, the Assets total chart, and a coin's USD and Amount charts. The time axis spans the selected window, with ticks on clock boundaries. A range with fewer than two points still draws its axis. Assets gets the 24h range, and its requests stop sending `to`, so a Sync's snapshot shows up without a reload.

Depends on [Dashboard Balance Chart](../2026-11-07-dashboard-balance-chart/SPEC.md) (the shared chart, ranges and fitted value axis), [Assets](../2026-10-30-assets/SPEC.md) and [Hide Balances](../2026-11-07-hide-balances/SPEC.md) (masking, which must keep working).

### Diagnosis

This was checked in the browser against the fake API with sparse data, and in a Recharts 3.10.1 harness. That harness was a throwaway script outside the repo and isn't kept; the plan's checks use only what's in the repo.

1. **The requests are correct.** Each click sends a new `from`, the browser's `tz` and no `bucket`, so the backend chooses the bucket. The query key holds the query, and there is no `placeholderData`. So the bug is in what gets drawn, not in what gets fetched.
2. **Bug A: the X axis spans only the data.** `src/modules/shared/components/BalanceChart.tsx:112-117` sets `domain: ["dataMin", "dataMax"]` (`type: "number"`, `scale: "time"`), and `BalanceChart` has no window prop. If the account is younger than the range, every range returns the same points, so every range draws the same chart.
3. **Bug B: on Assets, the end time is fixed when the page opens.** `AssetsPage.tsx:15` and `CoinDetail.tsx:57` read `now` once, and `rangeQuery` (`chartRange.ts:30`) sends `to` from it. A snapshot taken by a later Sync falls after `to`, so it doesn't appear until a reload. The Dashboard omits `to` (`openRangeQuery`) and doesn't have this bug.
4. **The default ticks are odd.** Recharts picks its own times (such as 03:17), and day labels repeat ("Nov 7" four times).
5. **One point draws no chart.** With one point, `hasEnoughHistory` (`shared/chart.ts`) replaces the chart with text.
6. **What the harness found (Recharts 3.10.1 through `@mantine/charts`):**
   - A fixed `domain: [start, end]` with `type: "number"` works.
   - Explicit `ticks` are used as given. Use them with `interval: 0` and `allowDataOverflow: true`.
   - A single point at `now` sits on the right edge, so half of it is cut off. The axis needs right padding.
   - An empty series draws no X labels. Two null points at the window's edges fix that.

### API facts used

From `../backend/README.md` (Snapshots) and `api-schema.d.ts`:
- `GET /snapshots` and `GET /snapshots/assets/:asset` accept `from`, `to`, `bucket` and `tz`. `to` defaults to now.
- Both responses always include `from`, `to`, `bucket` and `tz` (`snapshots.HistoryResponse` and `snapshots.AssetHistoryResponse`, where `to: string` is required). When the request leaves `to` out, the response's `to` is the server's "now" for that request.
- Without `bucket`, the backend picks one from the span: `raw` up to 2 days, `hour` up to 31, `day` up to 731. Every range, including 24h, stays under the 2000-bucket cap (Dashboard Balance Chart spec, table).

No new endpoint or field is used.

## Decisions

| # | Decision | Why |
|---|----------|-----|
| B1 | **The X domain is the selected window** on every `BalanceChart`. `end` is the response's `to`. `start` is `end − RANGE_DAYS[range] × 24h`, taken from the chip's length, not from the request's `from`, which is fixed when the page mounts. Points outside `[start, end]` are dropped before drawing. | Each range then has a different width, and the newest data sits at the right edge. The response's `to` moves forward on every refetch, but `from` doesn't, so `from` can't be the left edge. |
| B2 | **Ticks are explicit and fall on local clock boundaries.** They come from a pure function, `timeAxisTicks(range, start, end, compact?)`, in `shared/chart.ts`. See [Time axis ticks](#time-axis-ticks). | Fixes item 4: the ticks are predictable, and each label appears once. |
| B3 | **With 1 point**, the chart draws its dot on the full-window axis, and the "Not enough history yet" text becomes a caption under the chart instead of replacing it. **With 0 points**, the chart draws the empty window axis with the same caption. | This is what the user asked for: "show what we have, but the axis should change". |
| B4 | **No change when there's no snapshot at all.** On the Dashboard, when `GET /snapshots/latest` is 404, the chart section isn't rendered, as before (`DashboardPage.tsx`, `latest.data !== null`). The coin page still shows `NoSnapshot` and no chart. The Assets total chart (`BalanceHistory`) has always rendered under `NoSnapshot`. It now shows the empty window axis and the caption instead of text alone (Open Question 2). | The Dashboard behaviour was checked and is kept. Assets keeps its current gating. |
| B5 | **Gap shading is unchanged.** Only the stretches between points are shaded. Neither the time before the first snapshot nor the padding points are shaded. | Gaps mean "no price", not "no data yet". |
| B6 | **The Y axis is unchanged** (`FIT_VALUE_AXIS`, `fitValueAxis`). It's computed only from the points inside the window. | A point clipped out of the window shouldn't stretch the axis. |
| B7 | **Assets gets the 24h range.** The Assets total chart and the coin charts offer 24h, 7d, 30d, 90d and 1y, the same set as the Dashboard. `ASSET_RANGE_KEYS` and `DASHBOARD_RANGE_KEYS` merge into one `RANGE_KEYS`. | User decision. One set of ranges everywhere. |
| B8 | **The Assets range stays in local component state.** It doesn't move to the URL. | It isn't trivial to align: there are two routes (`/assets` and `/assets/$asset`), each would need `validateSearch` and navigation, and the earlier spec left this as its own decision. It stays out of scope. |
| B9 | **Assets chart requests drop `to`** and use `openRangeQuery`, like the Dashboard. `from` is still fixed when the page mounts, so the query key stays the same. The coin page's not-found check (`useAbsentCoinCheck`, through `rangeQuery` and `everHeldQuery`) keeps its `to`. | Fixes Bug B. After a Sync, the invalidated query refetches, and its response has a later `to` and the new point. The not-found check isn't a chart and doesn't need to move. |
| B10 | **The range decides the time format.** The `formatTime` prop is removed, and `BalanceChart` takes `range` and formats ticks with `timeTickFormatter(range)`. The tooltip keeps `formatMoment`. | Before this, each caller picked a formatter, and Assets always used days, which would be wrong for 24h. |
| B11 | **Hidden balances mask only the value axis and the tooltip value.** X ticks are dates and are never masked. | Same as before (Dashboard Balance Chart D8). |
| B12 | **Time zones (user decision, 2026-11-09).** Timestamps are UTC in the database and the API. The client shows and computes everything in the user's time zone, which is the browser's zone, the same one it sends as `tz`. Unit tests run in one fixed, pinned zone, `America/Santiago`, set in the Vitest config (see [Tests](#tests-unit-vitest)). | One rule for every date the app shows. A pinned zone makes every test run the same on every machine and in CI. Santiago has daylight saving time, and its changes happen at midnight, so the tests cover the hardest case for midnight ticks. |
| B13 | **A tick whose local time doesn't exist is placed at the first instant that exists after it, and labelled with that time and that day.** A tick whose local time happens twice is placed at the first of the two. This is exactly what `new Date(y, m, d, h)` returns (ECMAScript's "compatible" rule), so the code has no DST special case. In `America/Santiago`, 2026-09-06 00:00 doesn't exist (clocks go from 00:00 to 01:00), so that day's tick is 2026-09-06 01:00 −03:00 (`2026-09-06T04:00:00Z`), it's labelled "Sep 6" on the day ranges and "01:00 AM" on 24h. | Replaces the earlier "drop the tick or use the runtime's resolution", which conflicted with the tests' exact midnights. Dropping a tick would leave a hole in the axis; moving it keeps one tick per day. |

## Requirements

### Window helpers (`src/modules/shared/chart.ts`, pure)

- `type TimeWindow = { start: number; end: number }` (epoch ms).
- `chartWindow(range: RangeKey, to: string, fallbackEnd: number): TimeWindow`
  - `end = Date.parse(to)`. If that isn't finite, `end = fallbackEnd`. Callers pass the query's `dataUpdatedAt`, which is when the response arrived. The schema requires `to`, so this only guards against a malformed value.
  - `start = end − RANGE_DAYS[range] × 86_400_000`. So 24h is 24 hours, 7d is 7 × 24 hours, and 1y is 365 × 24 hours. This matches `daysBefore`.
- `clipToWindow(series: readonly ChartPoint[], window: TimeWindow): ChartPoint[]`: keeps the points with `start ≤ time ≤ end`, in order. Gaps (`y: null`) inside the window stay.
- `padEmptyWindow(series: readonly ChartPoint[], window: TimeWindow): ChartPoint[]`: returns `series` unchanged when it has at least one point. When it's empty, returns `[{ time: start, y: null, value: null }, { time: end, y: null, value: null }]`, so Recharts draws the X labels.
- `hasEnoughHistory` and `MIN_POINTS` stay. Their doc comment changes: fewer than 2 points now shows a caption beside the chart, not text instead of it.
- `RangeKey` and `RANGE_DAYS` are imported from `./chartRange`. `chartRange` imports nothing from `chart`, so there's no import cycle.

### Time axis ticks

`timeAxisTicks(range: RangeKey, start: number, end: number, compact = false): number[]` in `src/modules/shared/chart.ts`. It's pure, and it uses the runtime's local clock, which is the browser's zone, the same `tz` the requests send (B12). In tests it's `America/Santiago`. It returns epoch ms, ascending, every tick with `start ≤ tick ≤ end`, and no duplicates.

| Range | Regular ticks | Compact ticks | Label | Formatter |
|-------|---------------|---------------|-------|-----------|
| 24h | Every local 00:00, 06:00, 12:00 and 18:00 (at most 5); a skipped 00:00 is at 01:00 (B13) | Same | time of day | `formatHourTick` (existing) |
| 7d | Every local midnight | Every 2nd midnight | `MMM d` | `formatDayTick` (existing) |
| 30d | Every 5th local midnight | Every 10th midnight | `MMM d` | `formatDayTick` |
| 90d | Every 14th local midnight (every other Monday) | Every 28th midnight | `MMM d` | `formatDayTick` |
| 1y | The 1st of each month, at local midnight | The 1st of every 2nd month (Jan, Mar, May, Jul, Sep, Nov) | `MMM` | `formatMonthTick` (new) |

Rules:
- **Times are built from calendar fields, not by adding milliseconds.** Each candidate is `new Date(y, m, d, h)` (or `new Date(y, m, 1)` for months), stepping the day or month field, never adding 86 400 000. So a DST change never shifts later ticks off the boundary.
- **DST (B13):** a local time that doesn't exist becomes the first instant after the gap; a repeated local time becomes its first occurrence. That's what the `Date` constructor returns, so use it as is and don't adjust. The result is still ascending with no duplicates, because each calendar day or hour gives one candidate.
- **Iteration:** start from the local calendar day of `start` (`new Date(start)`'s year, month and date), go one calendar day (or month, for 1y) at a time up to the local day of `end`, build each candidate, and keep it when it's a tick for the range and `start ≤ candidate ≤ end`.
- **Multi-day steps are anchored so ticks don't move as the window slides.** A local day `D` is a tick when `dayIndex(D) % step === 0`, where `dayIndex` is the number of calendar days from Monday 2000-01-03, computed as `(Date.UTC(y, m, d) − Date.UTC(2000, 0, 3)) / 86_400_000` from the local date's fields. That anchor makes the 14-day and 28-day steps fall on Mondays.
- **Month steps are anchored on the calendar month.** Regular ticks fall on every month. Compact ticks fall on months where `month % 2 === 0` (Jan = 0).
- **24h** uses hours with `hour % 6 === 0`.

Formatting (`src/modules/shared/chartFormat.ts`):
- `formatMonthTick(time)`: `Intl.DateTimeFormat(i18n.language, { month: "short" })`. In English this gives "Nov"; in Spanish, "nov" (with or without a dot, depending on ICU; the test accepts either).
- `timeTickFormatter(range)`: returns `formatHourTick` for 24h, `formatMonthTick` for 1y, and `formatDayTick` otherwise.
- In English, 24h ticks keep the existing `formatHourTick` output ("06:00 AM"); in Spanish they're "06:00". See Open Question 1.

**When to use compact ticks:**
- `BalanceChart` calls `const { ref, width } = useElementSize()` from `@mantine/hooks` (already a dependency) and puts `ref` on a `div` that wraps only the `LineChart` (not the caption). `width` is that wrapper's content width in px.
- `regularTicks = timeAxisTicks(range, window.start, window.end, false)`.
- `compact = width > 0 && regularTicks.length > 0 && (width − 84) / regularTicks.length < MIN_TICK_SPACING`. 84 is the value axis's width (`yAxisProps.width`), so `width − 84` is about the plot's width. Use a named constant `VALUE_AXIS_WIDTH = 84` for both.
- `ticks = compact ? timeAxisTicks(range, window.start, window.end, true) : regularTicks`.
- A width of 0 means "not measured yet" (the first render, or a hidden element), and the regular ticks are used.
- `MIN_TICK_SPACING` is 56 px, a named constant in `BalanceChart.tsx`; the implementer may tune it after measuring and must report the final value. The goal: no two X labels overlap at 375 px, at the Dashboard column width (about 405 px at 1440 px), or at 1024 px, in English or Spanish.

### `BalanceChart` (`src/modules/shared/components/BalanceChart.tsx`)

Props:
- Removed: `formatTime`.
- Added:
  - `range: RangeKey`
  - `windowEnd: string`, the response's `to`
  - `fetchedAt: number`, the query's `dataUpdatedAt`, which is the fallback end
- `series`, `label`, `startsAtZero`, `formatValue`, `formatTick` and `formatTooltipTime` are unchanged.

Inside, each value is memoised on its inputs:
1. `window = chartWindow(range, windowEnd, fetchedAt)`.
2. `shown = clipToWindow(series, window)`. Everything else is computed from `shown`, the clipped array: `gapSpans(shown)`, `fitValueAxis(shown)`, the tooltip lookup (`shown.find(...)`), and the dot's neighbour check (`shown[i]`, `shown[i - 1]`, `shown[i + 1]`).
3. `data = padEmptyWindow(shown, window)`. Only this padded array goes to `LineChart` as `data`. The `dot` callback's `index` is an index into `data`, and the check reads `shown` at that index: whenever `shown` has points, `data` is the same array, so the indexes match; when `shown` is empty, `shown[i]` is undefined and no dot is drawn. Padding points are null, so they never get a dot or a shading span, and the tooltip finds no row for them because it searches `shown`.
4. `ticks`, regular or compact, as in [When to use compact ticks](#time-axis-ticks).
5. `xAxisProps`:
   - `type: "number"`, `scale: "time"`
   - `domain: [window.start, window.end]`, `allowDataOverflow: true`
   - `ticks`, `interval: 0`
   - `padding: { left: 0, right: 8 }`, enough to show a dot of radius 3 at `end`; the implementer confirms the value in the browser
   - `tickFormatter: (v) => timeTickFormatter(range)(Number(v))`, never masked
6. `yAxisProps`, `valueFormatter` (masked), the reference areas and the tooltip work as today.
7. When `!hasEnoughHistory(shown)` (0 or 1 point), it renders under the chart a caption: `chart.notEnough` (`fw={600}`, `size="sm"`) and `chart.notEnoughBody` (`size="sm"`, `c="dimmed"`), in a `Stack gap={2}`. The chart stays 260 px high.

The doc comments on the component and its props are updated to describe the window, the ticks, the caption and the padding.

### Callers

All three drop their `!hasEnoughHistory(...)` branch. The loading skeleton and the error state are unchanged. On success they render `BalanceChart` with `range`, `windowEnd={history.data.to}` and `fetchedAt={history.dataUpdatedAt}`, and no `formatTime`.

- `src/modules/dashboard/BalanceHistoryCard.tsx`: as above. It still uses `openRangeQuery`, the URL range and `RANGE_KEYS`.
- `src/modules/assets/BalanceHistory.tsx`:
  - Uses `openRangeQuery(now, range, timeZone)` (B9) and `RANGE_KEYS` (B7). The range stays `useState`, with default `DEFAULT_RANGE` (30d) (B8).
  - The `now` prop's doc changes to say it only fixes `from`.
- `src/modules/assets/CoinDetail.tsx`:
  - The chart query uses `openRangeQuery` and `RANGE_KEYS`. `useAbsentCoinCheck` keeps `now` and `rangeQuery` (B9).
  - The gaps note (`hasGaps`) is computed on the clipped series, so it uses the same window as the chart: `gapSpans(clipToWindow(series, window))` with the same `chartWindow(...)`. The comment on `now` changes to say it fixes `from` and the not-found checks.
- `src/modules/assets/AssetsPage.tsx`: the comment on `now` changes ("the start of each range", not "the day the ranges end on"). No code change.

### Ranges (`src/modules/shared/chartRange.ts`)

- `RANGE_KEYS: readonly RangeKey[] = ["24h", "7d", "30d", "90d", "1y"]` replaces `ASSET_RANGE_KEYS` and `DASHBOARD_RANGE_KEYS`. Update the imports in `src/routes/_app/dashboard.tsx`, `BalanceHistoryCard.tsx`, `BalanceHistory.tsx`, `CoinDetail.tsx` and `chartRange.test.ts`.
- `src/modules/shared/components/RangeChips.tsx`: its doc comment (line 8) says "Assets and the Dashboard give their own keys". It becomes "Every chart passes `RANGE_KEYS`." The `keys` prop stays.
- `rangeQuery` stays, for `useAbsentCoinCheck`. Its doc says it's only for the not-found check now.
- `openRangeQuery`'s doc says it's used by every chart.

### States

| State | Dashboard chart | Assets total | Coin USD / Amount |
|-------|-----------------|--------------|-------------------|
| Loading (request or chunk) | 260 px skeleton (unchanged) | same | same |
| Error | `SectionError` with retry (unchanged) | same | same |
| No snapshot at all | Section not rendered (unchanged, B4) | `NoSnapshot` above, then the empty window axis and the caption (B4) | `NoSnapshot` frame, no chart (unchanged) |
| 0 points in the window | Empty window axis, ticks for the range, caption | same | same |
| 1 point in the window | One dot at its time on the full window, caption | same | same |
| 2 or more points | Line on the full window; data can end before `end` | same | same; the gaps note when a USD gap is inside the window |
| After a Sync | Refetch; the new point is at the right edge (unchanged) | Same as Dashboard (fixed by B9) | Refetched by the invalidation; the new point appears without a reload (B9) |
| Hidden balances | Y ticks and tooltip value read `••••`; X ticks shown | same | same |

### Translations

No new keys. `chart.notEnough` and `chart.notEnoughBody` are reused as the caption. `chart.range.24h` already exists and now also shows on Assets. The body text ("A line needs at least two snapshots in the range. Sync again later to add one.") still fits under a chart that shows one dot.

### Tests (unit, Vitest)

**The zone is pinned (B12).** `vite.config.ts` gets a `test` block: `test: { env: { TZ: "America/Santiago" }, pool: "forks" }`, with a comment that says why. With the `forks` pool, each test process starts with that `TZ`, whatever the shell's `TZ` is. (Checked on 2026-11-09 with Vitest 5.0.5: `test.env.TZ` overrides an outer `TZ=UTC` with `forks`, but not with `threads`, so the pool is set explicitly.) For the types, add `/// <reference types="vitest/config" />` as the first line of `vite.config.ts`; if `tsc -b` still rejects the `test` key, import `defineConfig` from `"vitest/config"` instead of `"vite"`. `chart.test.ts` starts with a guard test: `Intl.DateTimeFormat().resolvedOptions().timeZone` is `"America/Santiago"`, so a run that bypasses the config fails at once instead of passing by luck.

Generic cases still build their expected values with local `Date` constructors, as `dateRange.test.ts` does. The DST cases use fixed UTC instants, which are only right in the pinned zone.

- `chart.test.ts`:
  - `chartWindow`: for each range, `end − start` equals `RANGE_DAYS × 24h`. `end` equals `Date.parse(to)`. An unparseable `to` uses the fallback.
  - `clipToWindow`: drops points before `start` and after `end`, keeps the boundaries and gaps inside, and keeps the order.
  - `padEmptyWindow`: an empty series gives the two null edge points. A one-point series is returned unchanged.
  - `gapSpans` of an empty clipped series is `[]`. This is what the component shades, never the padded array.
  - `timeAxisTicks`, for each range, regular and compact, on windows with no DST change (the DST cases follow):
    - every tick is within `[start, end]`, ascending, with no duplicates
    - 24h: 4 or 5 ticks, local minutes and seconds 0, hours in {0, 6, 12, 18}
    - 7d: each local midnight, 7 or 8 ticks
    - 30d: local midnights 5 calendar days apart, 6 or 7 ticks
    - 90d: local midnights 14 calendar days apart, all Mondays
    - 1y: the 1st of a month at local midnight, 12 or 13 ticks; compact keeps only even months
    - compact: 7d, 30d and 90d ticks are twice as far apart as the regular ones, and are a subset of them; 24h is unchanged
    - Sliding the window by an hour keeps the ticks still inside it unchanged (anchoring).
  - DST in `America/Santiago` (B13), with exact instants. In 2026, clocks go forward at 2026-09-06 00:00 (to 01:00, −04:00 to −03:00) and back at 2026-04-05 00:00 (to 2026-04-04 23:00, −03:00 to −04:00).
    - **24h across the gap:** `end = Date.parse("2026-09-06T15:00:00Z")` (12:00 −03:00). Ticks are exactly `["2026-09-05T16:00:00Z", "2026-09-05T22:00:00Z", "2026-09-06T04:00:00Z", "2026-09-06T09:00:00Z", "2026-09-06T15:00:00Z"]` (as `Date.parse` values). Their local hours are 12, 18, 1, 6, 12: the skipped 00:00 is at 01:00.
    - **24h across the fall back:** `end = Date.parse("2026-04-05T16:00:00Z")` (12:00 −04:00). Ticks are exactly `["2026-04-04T21:00:00Z", "2026-04-05T04:00:00Z", "2026-04-05T10:00:00Z", "2026-04-05T16:00:00Z"]`, local hours 18, 0, 6, 12. 23:00 happens twice that night; it isn't a tick hour, and there's no duplicate.
    - **7d across the gap:** `end = Date.parse("2026-09-09T15:00:00Z")`. Ticks are the local days Sep 3 to Sep 9, 7 ticks. The Sep 6 tick is `Date.parse("2026-09-06T04:00:00Z")`, with `getDate() === 6` and `getHours() === 1`. Sep 3, 4 and 5 are at `04:00Z` (00:00 −04:00) and Sep 7, 8 and 9 at `03:00Z` (00:00 −03:00), all with `getHours() === 0`.
    - **30d and 90d across the gap** (any `end` in mid-September 2026): every tick's `getHours()` is 0, and consecutive ticks are still 5 or 14 calendar days apart. Sep 6, 2026 has `dayIndex` 9743, which isn't a multiple of 5 or 14, so it isn't a tick on either range; the days after it are midnights at −03:00.
    - **The gap day as a tick:** `timeAxisTicks("7d", ...)` on any window that includes Sep 6 has exactly one tick on that local day, at 01:00. Never zero, never two.
    - **Anchoring across the gap:** sliding the 7d window above by one hour, either way, keeps every tick that's still inside it unchanged.
  - The existing `hasEnoughHistory` tests stay.
- `helpers.test.ts`:
  - `formatMonthTick` in English ("Nov") and Spanish ("nov", with an optional trailing dot).
  - `timeTickFormatter` returns the right function for each range.
- `chartRange.test.ts`:
  - `RANGE_KEYS` has the five ranges in order.
  - The "24h is dropped with the Assets keys" case is removed.
  - The `parseRangeSearch` cases use `RANGE_KEYS`.
  - `openRangeQuery` has no `to` for every key.

## Acceptance Criteria

The data comes from the repo's fake API (`scripts/fake-api.mjs`, `pnpm fake-api`), set up with `POST /__fake/state`. The plan lists the exact scenario for each criterion:
- **Dense:** the `populated` account. Its snapshots cover the last 30 days (hourly for 72 hours, then every 6 hours), so 24h, 7d and 30d are full, and 90d and 1y are sparse: the line fills only the right third and the right twelfth.
- **Sparse:** a newly registered user, connected, then synced a few times; every snapshot is within minutes of now.
- **One point:** the `single-snapshot` account.
- **Zero points with a snapshot:** the fake can't serve this on the Dashboard or a coin chart; it's covered by the unit tests (`padEmptyWindow`) and, on Assets, by the `empty` account (B4). A manual check can use Chrome DevTools' "Override content" on a `GET /snapshots` response to set `points` to `[]`.

- **Given** a sparse account (every snapshot within the last few minutes or hours), **when** the user switches the Dashboard chart from 24h to 30d, **then**:
  - the time axis changes: 24h shows times of day, and 30d shows dates about 5 days apart across a whole month
  - on 30d the line fills only the right edge of the plot, and on 24h a wider share of it
  - the two charts look clearly different (different X labels and line position)
  - on both, the last point is at or next to the right edge.
- **Given** the same sparse account on the Assets page, **when** the user switches between ranges on the total chart and on a coin's USD and Amount charts, **then** each range shows its own window and ticks, as above.
- **Given** an account with dense history covering the whole range, **when** any range is shown, **then** the line spans the full width, as before. The ticks are the new clock-aligned ones. The shape and the Y axis are unchanged.
- **Given** exactly one point in the window, **then** one dot is drawn at its time, fully visible, and not cut off at the right edge. The X axis shows the full window's ticks. "Not enough history yet" and its body show as a caption under the chart.
- **Given** zero points in the window (the history response's `points: []`), **then** the X axis shows the window's ticks. There is no line, dot or shading. The caption shows.
- **Given** an account with no snapshot at all, **then** the Dashboard shows no chart section (unchanged). On Assets, `NoSnapshot` shows, and the total chart shows the empty window axis with the caption.
- **Given** each range, **then** the X ticks are:
  - 24h: 00:00, 06:00, 12:00 and 18:00 local time, those within the window
  - 7d: each local midnight
  - 30d: midnights 5 days apart
  - 90d: midnights 14 days apart
  - 1y: the 1st of each month, labelled by month
  - Each label appears only once.
- **Given** the Assets total chart or a coin chart, **then** the chips are 24h, 7d, 30d, 90d and 1y, with 30d selected first. 24h shows times of day. The requests have `from` and `tz`, with no `to` and no `bucket`.
- **Given** the Assets page is open, **when** the user clicks Sync on the Assets summary, **then** the total chart refetches and the new snapshot appears as its last point at the right edge, with no reload. Its value matches the summary total. A coin page opened before the Sync shows the new point after its query is invalidated and refetched.
- **Given** balances are hidden, **then** on every chart the Y ticks and the tooltip value read `••••`, the X ticks show real dates and times, and the 1-point and 0-point captions show.
- **Given** a 375 px screen, **then** on every chart and every range the X labels don't overlap or overflow the card. 1y (and any range that needs it) uses the compact ticks.
- **Given** a 1440 px screen, **then** the Dashboard chart (in the right column) and the Assets charts show their ticks without overlap.
- **Given** Spanish, **then** the X labels use Spanish month names ("nov", "1 nov" or "nov 1", depending on ICU) and 24-hour times. The caption and chips are in Spanish.
- **Given** the coin USD chart has a no-price gap inside the window, **then** it's shaded as before, the gaps note shows, and no shading shows before the first point.

## Out of Scope

The Assets range in the URL (B8), an "All time" range, changing the backend's bucket choice, changing the Y axis, and showing the year on 1y ticks.

## Amendments to other specs

These edits to `specs/2026-11-07-dashboard-balance-chart/SPEC.md` were made by hand, in place. Each one is marked in italics with a date and links back here. The original text is kept.
- Front matter: `updated` changed to 2026-11-08.
- D7 (24h hour labels) is marked superseded by B1, B2 and B10.
- Requirements, Dashboard chart: the formatter list notes that `range`, `windowEnd` and `fetchedAt` replace it.
- States, "Not enough history": the text is now a caption under the chart, with the 1-point and 0-point behaviour.
- Acceptance criteria:
  - "single snapshot": the text is a caption under the windowed chart.
  - "Assets after the refactor": Assets later gains 24h and drops `to`.
- Out of Scope: "adding 24h to Assets" is marked as since done here.
- Open Question 2: resolved. Assets gets 24h and the open-ended `to`, and its range stays local state.

## Open Questions

1. **24h tick format in English.** The user's wording was `HH:mm`. The existing `formatHourTick` gives "06:00 AM" in English and "06:00" in Spanish. **Recommendation:** keep the existing formatter. It follows the locale and matches the tooltip. If they want a strict 24-hour clock in English too, add `hourCycle: "h23"` to `formatHourTick`.
2. **Assets total chart with no snapshot.** It now shows an empty axis under `NoSnapshot`. Should it be hidden instead, as on the Dashboard? **Recommendation:** hide it when `useLatestSnapshot()` is `null`, which is a one-line check in `AssetsPage`. This spec keeps the current gating until the user confirms.
3. **Compact ticks for ranges other than 1y.** The user only asked for fewer 1y ticks on narrow widths. This spec gives 7d, 30d and 90d a compact step too, which applies only when labels would otherwise overlap (`MIN_TICK_SPACING`). **Recommendation:** keep it, because at 375 px the 7d and 90d charts would have six or seven date labels in about 250 px.
4. **1y ticks across the new year.** The labels are month names only, so "Jan" doesn't show the year. **Recommendation:** leave it, since the tooltip has the full date. Out of scope unless the user asks.
