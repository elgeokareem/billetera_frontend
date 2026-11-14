---
title: "Implementation Plan: Movements Chart"
change: movements-chart-1
type: feature
spec: ./SPEC.md
issue: none
created: 2026-11-14
updated: 2026-11-14
sdd_version: 7.3.0
---

# Implementation Plan: Movements Chart

**Spec:** [SPEC.md](./SPEC.md). Behaviour, acceptance criteria and tests are there.

Rules:
- Never commit. Never open, read, `cat`, `grep` or print `.env` or any `.env.*` file. Tell every subagent this.
- Starts after Collapsible Movement Filters is built (needs `src/modules/shared/prefs.ts` and `useMotionDuration`).
- The working tree may still hold Nav Brand and Logout changes. Don't revert or reformat them; the locale files are shared, add keys only.
- Don't touch `specs/INDEX.md` or `specs/ROADMAP.md`.
- No new dependency, no backend change. Money stays a decimal string; `Number()` only for bar height and axis scale.
- Resolve open questions Q1 and Q2 in SPEC before starting, or build the stated defaults.

## Phase 1: Chart panel

**Outcome:** SPEC B1 to B14.

| File | Change |
|------|--------|
| `src/modules/shared/categoryColors.ts` | New. `SEGMENT_COLORS`, `NO_CATEGORY_COLOR`, moved from `SpendingCard.tsx`. |
| `src/modules/dashboard/SpendingCard.tsx` | Import the palette from the new file. No other change. |
| `src/modules/movements/chart.ts` | New. Pure `chartPeriod`, `chartRows`, `barRange`, summary helper. |
| `src/modules/movements/chart.test.ts` | New. Cases under Unit tests. |
| `src/modules/movements/MovementsChart.tsx` | New. Panel: header, Hide/Show (pref), Collapse, summary, unpriced note, segmented control, states, queries. |
| `src/modules/movements/MovementsBarChart.tsx` | New, default export, lazy-loaded. `BarChart` with stacked series, masked axis/tooltip, `onClick` on bars. |
| `src/modules/movements/MovementsPage.tsx` | Render `MovementsChart` between `FilterChips` and the list, passing `search`, `now` and an `onRange` that calls `go`. |
| `src/locales/en.json`, `src/locales/es.json` | `movements.chart.*` keys. |

9 files. Expect roughly 500 to 600 changed lines, about a third of them tests; above the ~400 guideline, kept as one phase as requested. If review is heavy, the natural cut is pure functions + tests + palette first, UI second.

**Checks:**
- `pnpm verify` passes.
- Manual with `pnpm dev`, at 375px and 1280px: AC1 to AC10. Network tab: Total mode makes one `/movements/totals` request per filter change, By category two, hidden none. AC10 with devtools' reduced-motion emulation. Dashboard Spending card looks unchanged.
- Report `git status --short` and record results and any drift under Implementation State.

## Implementation State

**Built** 2026-11-14, after Collapsible Movement Filters. `pnpm verify` passes: API check, lint, 487 tests, build.

Files changed:
- New `src/modules/shared/categoryColors.ts`: `SEGMENT_COLORS`, `NO_CATEGORY_COLOR` moved from `SpendingCard`, plus `OTHER_CATEGORY_COLOR`.
- `src/modules/dashboard/SpendingCard.tsx`: imports the palette from the new file. No other change.
- New `src/modules/movements/chart.ts` and `chart.test.ts`: `chartPeriod`, `chartRange`, `chartRows`, `chartSummary`, `barRange`, series keys.
- New `src/modules/movements/MovementsChart.tsx`: panel, saved Hide/Show, summary, unpriced note, segmented control, queries and states.
- New `src/modules/movements/MovementsBarChart.tsx`: default export, lazy-loaded, stacked `BarChart`, masked axis/tooltip, bar click.
- `src/modules/movements/MovementsPage.tsx`: renders the panel between the chips and the list, and turns a picked bar into `from`/`to` through `go`.
- `src/modules/movements/hooks.ts`: `useMovementTotals` takes an optional `{ enabled }`.
- `src/locales/en.json`, `src/locales/es.json`: `movements.chart.*` keys only.

Answers applied: Q1 defaults to the API's completed-only totals and labels the count "completed" when the URL has no status; Q2 keeps the four largest categories coloured, merges the rest into "Other categories" (`dark-2`), with no category last; Q3 caps the no-date chart to the last 12 months, monthly, with a "Last 12 months" caption. The list keeps its own unfiltered range.

Drift / fit notes:
- `useMovementTotals` had no way to disable a request, so it gained the optional `enabled` option for B12. While the chart is hidden both totals queries are disabled; the category query also waits for By category mode.
- Added `chartRange` (not named in the spec) to build the Q3 12-month cap as API instants. The summary and count come from the same query, so they describe the chart's 12-month range; the list is unchanged.
- The panel needs a count to decide B13's "movementCount is 0". While the chart is saved hidden no totals request is allowed, so the header is still shown until the viewer opens it; once shown and the count is 0, the whole panel isn't rendered.
- Mantine's `BarChart` has no bar-level click prop, so clicks use Recharts' `barProps.onClick`, reading `periodStart` from the row. Bars stay out of the keyboard path, as the spec allows.
- A category with only unpriced rows is left out of the series (no value to draw), and a period with no priced movement is absent, matching "null usd_value rows skipped" and no zero-filling.
- The chart's tooltip reads the summed strings; `Number()` is used only for bar heights and the axis.

Not run: the manual AC1 to AC10 pass and the network-tab request counts with a dev server, which the task forbade. The pure helpers, locale parity and build are covered by `pnpm verify`.
