---
title: Movements Chart
spec_type: tech
type: feature
status: draft
domain: Portfolio
issue: none
created: 2026-11-14
updated: 2026-11-14
sdd_version: 7.3.0
---

# Movements Chart

## Problem

The Movements page lists the filtered movements, but there's no way to see how much money moved per day, week or month for those filters, or how it splits by category, without exporting.

Depends on [Collapsible Movement Filters](../2026-11-14-collapsible-movement-filters/SPEC.md) (pref helper `src/modules/shared/prefs.ts`, `useMotionDuration`).

## Behaviour

**B1. Placement.** A panel in `MovementsPage.tsx` between `FilterChips` and the list (above `CategoriesUnavailable`). It reacts to every filter in the URL search.

**B2. Data.** `useMovementTotals` (`src/modules/movements/hooks.ts`) with `{ ...toMovementsQuery(search), period, tz: browserTimeZone() }`. No backend change, no new endpoint.
- **Total** mode: that one query. It feeds the bars, the summary and the count.
- **By category** mode: a second query with `group_by=category` added, used for the bars only. The summary keeps using the ungrouped query, since `group_by=category` counts a split movement once per category (`movementCount` doc in `spending.ts`). Server-side splits already count per portion.
- `status` is passed only when the URL has it, so without a status filter the totals are completed movements only (the API default), while the list shows every status. See open question Q1.

**B3. Period.** A pure `chartPeriod(search, now)`:
- Both `from` and `to`: span in days = `round((to - from) / 1 day)` (round absorbs DST hours). `day` if ≤ 31, `week` if ≤ 183, else `month`.
- Only `from`: span from `from` to `now`, same thresholds.
- No `from` (no date filter, or only `to`): `month`.
Weeks start on Monday in `tz` (backend `date_trunc('week')`).

**B4. Direction.** Bars show `in` when the URL has `direction=in`, otherwise `out`. Header: `Money out by day|week|month` / `Money in by …`.

**B5. Summary line** above the bars, from the ungrouped query's asset rows: "Out $X · In $Y · N movements". Out and In are `sumKnown` (`src/modules/shared/money.ts`) of the `usd_value` of rows of that direction; N is `movementCount`. With a direction filter, only that direction's amount shows. Amounts are decimal strings, formatted with `formatUsd`.

**B6. Bars.** A pure `chartRows(rows, direction, mode)` turns asset rows into one entry per `period_start`, sorted ascending, summing `usd_value` per period (and per category in By category mode) with `money.ts`. Values stay strings in the result; they become `number` only at the chart boundary, for bar height. Periods with no movements are absent (as the API returns them); no zero-filling. X labels: day and week as a short date (week = its Monday), month as `formatMonth`.

**B7. Total / By category.** A `SegmentedControl` (44px tall). By category is a stacked `BarChart` (`type="stacked"`) of `@mantine/charts`. Series order and colours follow `SpendingCard`: categories by total value over the whole range, largest first, colours from `SEGMENT_COLORS` cycling, no-category last in `NO_CATEGORY_COLOR`. The palette moves to `src/modules/shared/categoryColors.ts`, and `SpendingCard.tsx` imports it from there. Category names from `useCategories`; an unknown ID uses `movements.categoryUnknown`. See Q2 for many categories. The mode is component state, not saved.

**B8. Tooltip.** Period label, then each series' formatted value (and the period total in By category). Values come from the summed strings, not the numbers.

**B9. Bar click.** A pure `barRange(periodStart, period, current)` returns `{ from, to }` as API instants: `from` = `period_start`; `to` = the next local day, the next local Monday (+7 local days) or the 1st of the next local month, built with local `Date` constructors like `presetRange` in `search.ts`. The result is clamped to the current `from`/`to` when they exist, so a click never widens the range. The page navigates with `withFilter` for `from` and `to` through `go` (a push, so Back returns). The chip then shows the custom range label. Bars aren't required to be keyboard-reachable (recharts limitation); the date filter stays the accessible path.

**B10. Hide Balances.** With `useBalancesHidden()`, summary amounts render through `Sensitive`; the value axis tick formatter returns `MASK` and keeps its width; tooltip values show `MASK`. Bars, periods and the count stay.

**B11. Unpriced.** When the shown direction's rows have `unpriced_count > 0`, a dimmed note under the summary: the total leaves out N movements with no price (reuse the Spending card's wording style, new key).

**B12. Hide/Show chart.** A subtle button in the panel header, "Hide chart" / "Show chart", `mih={44}`, `aria-expanded`, `aria-controls`. The body is in a `Collapse` with `useMotionDuration()` and `ease`. Saved under `billetera.movementsChart` (`"shown"` / `"hidden"`, default shown) through `prefs.ts`. While hidden, no totals request is made (`enabled: false`).

**B13. States.**
- Loading: `SectionSkeleton` (`src/modules/dashboard/SectionStates.tsx`), plus the lazy chart's Suspense fallback as in `BalanceHistoryCard`.
- Error: `SectionError` with retry.
- `movementCount` is 0: the panel isn't rendered (the list's empty state already speaks).
- Movements exist but none in the bar direction: summary shows, bars area says "No money out for these filters" / "No money in …".

**B14. Lazy chart.** The `BarChart` lives in a default-export file loaded with `React.lazy`, importing `@mantine/charts/styles.css`, as `BalanceChart.tsx` does.

## i18n

en + es keys under `movements.chart.*`: title (out/in × day/week/month), summary parts, count (plural), total, byCategory, hide, show, unpriced (plural), emptyDirection (out/in), noCategory reuse `dashboard.spending.noCategory`.

## Acceptance criteria

- **AC1.** Given the "This month" preset, when Movements loads, then the panel shows "Money out by day", the summary and one bar per day that had money out.
- **AC2.** Given "Last 90 days", then bars are weekly; given no date filter, monthly.
- **AC3.** Given `direction=in`, then the header says "Money in by …", bars are money in, and the summary shows only In and the count.
- **AC4.** Given By category, then bars stack by category with the dashboard's colours, no category last; switching back to Total shows one bar per period.
- **AC5.** Given weekly bars, when the user clicks the week starting Mon 2026-11-02, then the URL has `from` = that Monday 00:00 local and `to` = the next Monday 00:00 local (clamped to the current range), the list narrows, the chart shows daily bars, and Back restores the previous range.
- **AC6.** Given Hide Balances on, then summary amounts, value axis and tooltip values show the mask; bars and count stay.
- **AC7.** Given an unpriced movement in the shown direction, then the unpriced note shows.
- **AC8.** Given the user presses Hide chart, then the body collapses softly, no totals request is made after reload, and Show chart is offered; localStorage throwing leaves it shown and nothing errors.
- **AC9.** Given the totals request fails, then the panel shows the section error with retry, and the list still works.
- **AC10.** Given `prefers-reduced-motion: reduce`, the panel shows and hides without animation.

## Open questions

- **Q1. Status mismatch.** Without a status filter, `/movements/totals` counts completed movements only, while the list shows pending and failed too, so the chart's count can be lower than the list's. Default: keep the API default and label the summary "completed" when no status filter is set. Alternative: send every status, so totals match the list but include money that never moved.
- **Q2. Many categories.** The palette has four colours and cycles, so with more than four categories colours repeat. Default: the four largest categories get colours, the rest are merged into one "Other categories" series in `var(--mantine-color-dark-2)`, then no-category last. Alternative: cycle as `SpendingCard` does.
- **Q3. No date filter.** Default is `month` across all time, which can be many bars for a long history. Acceptable, or cap to the last 12 months when no date is set?

## Unit tests (node, no DOM, TZ America/Santiago)

- `chartPeriod`: 1, 31, 32, 183, 184 days; a range spanning the DST change; only `from`; only `to`; none.
- `chartRows`: Total and By category, direction filtering, string sums exact (e.g. `0.1` + `0.2` = `0.3`), null `usd_value` rows skipped, sorted periods, category order with no-category last.
- `barRange`: day, week and month across a DST change in Santiago (2026-04-05 and 2026-09-06), month end (Jan 31 → Feb 1), clamping to the current `from`/`to`.
- Summary: Out/In sums and count from a fixture.
