---
title: Dashboard Chart Placement
spec_type: tech
type: feature
status: draft
domain: Portfolio
issue: none
created: 2026-11-13
updated: 2026-11-13
sdd_version: 7.3.0
---

# Dashboard Chart Placement

## Problem

On the dashboard, the left column holds the label queue and the Spending/Holdings pair. Once every movement of the month has a label, the queue shrinks to its done state and the left column ends well above the right one, which holds Balance, the balance chart and Recent movements. The left side looks empty and the chart is squeezed into the narrower column.

## Behaviour

**B1. Placement.** From 768px, the balance chart (`.dash__history`, `BalanceHistoryCard`) goes in the left column, below `.dash__pair`, at the full width of that column, when the label queue is empty: the `labelCount` query has data and `movementCount(data) === 0`. In every other case (count loading, count errored, count above 0) it stays in the right column under Balance, as today.

**B2. Same data.** The page reads `dashboardQueries(now, timeZone).labelCount` through `useMovementTotals`, the same query `LabelQueue` uses, so it shares the cache and makes no extra request. The decision uses the server count only. A save in flight doesn't move the chart; it moves when the count refetches after the save.

**B3. Chart shown at all.** Unchanged: the chart renders only when `useLatestSnapshot().data !== null`, wherever it's placed.

**B4. Below 768px.** No visual change. The wrappers are `display: contents` and `.dash__history` keeps `order: 3`, so it stays third whichever wrapper it's in. No animation below 768px either (B5), since nothing moves on screen.

**B5. Transition.** When the placement changes after the page has mounted, the chart section animates in at its new spot: opacity 0 to 1 and `translateY(8px)` to 0, about 250ms, ease-out. A CSS `@keyframes` rule, applied by a modifier class (for example `.dash__history--enter`) only after a placement change, and only inside `@media (min-width: 768px)`. No animation on the first render. Under `prefers-reduced-motion: reduce` there is no animation. No new dependency. The other sections reflow without animation.

**B6. Remount.** Moving the section between wrappers remounts `BalanceHistoryCard`. Its data comes from the query cache, so there's no skeleton or refetch. Its only UI state, the selected range, is the page's `range` search param, so it survives the move; nothing needs lifting. The lazy chart module is already loaded, so the Suspense fallback doesn't show.

**B7. Decision as a pure function.** The rule in B1 is a pure function in `src/modules/dashboard/` (for example `chartPlacement(count): "main" | "side"`, taking the query's status and data), unit-tested.

## Acceptance criteria

- **AC1.** Given a viewport of 768px or more and a month with movements still to label, when the dashboard loads, then the chart is in the right column under Balance.
- **AC2.** Given a viewport of 768px or more and a label count of 0, when the count has loaded, then the chart is in the left column below Spending and Holdings, at the column's full width, and the right column holds Balance then Recent movements.
- **AC3.** Given the label count is loading or has failed, then the chart is in the right column.
- **AC4.** Given the dashboard is open from 768px with one movement left to label, when the user labels it and the count refetches to 0, then the chart moves to the left column with the fade-and-rise animation, and the selected range is unchanged.
- **AC5.** Given the same as AC4 with `prefers-reduced-motion: reduce`, then the chart moves with no animation.
- **AC6.** Given the dashboard opens with the count already cached (for example coming back from another page), then the chart renders in its place with no animation.
- **AC7.** Given a viewport under 768px, then the section order is the same as today (queue, balance, chart, recent, spending, holdings) whatever the count, and no animation plays.
- **AC8.** Given no snapshot yet, then no chart is rendered in either column.
- **AC9.** Opening the dashboard makes no request beyond today's.

## Unit tests

`chartPlacement`: success with count 0 is `"main"`; success with count above 0 is `"side"`; pending is `"side"`; error is `"side"`.

## Open questions

1. **First load with nothing to label.** With no cached count, the chart first renders on the right (B1, count loading) and moves left when the count arrives, usually within a moment of page load. By B5 that move animates. Alternatives: keep that first move unanimated (only animate changes after the count has resolved once), or hold the chart back until the count resolves. The plan follows B5 as written unless the user picks otherwise.
