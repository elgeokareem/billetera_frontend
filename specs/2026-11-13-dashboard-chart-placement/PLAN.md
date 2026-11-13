---
title: "Implementation Plan: Dashboard Chart Placement"
change: dashboard-chart-placement-1
type: feature
spec: ./SPEC.md
issue: none
created: 2026-11-13
updated: 2026-11-13
sdd_version: 7.3.0
---

# Implementation Plan: Dashboard Chart Placement

**Spec:** [SPEC.md](./SPEC.md). Behaviour, acceptance criteria and tests are there.

Rules:
- Never commit. Never open, read, `cat`, `grep` or print `.env` or any `.env.*` file. Tell every subagent this.
- Don't touch `specs/INDEX.md` or `specs/ROADMAP.md`.
- No new dependency, no backend change, no new request.
- If something outside the file list seems to need a change, stop and say so.

## Decision on chart state

`BalanceHistoryCard` holds no local UI state: the range is the `range` search param, and the history comes from the query cache. The remount is accepted as is; nothing is lifted.

## Phase 1: Placement and transition

**Outcome:** from 768px the chart sits under Spending/Holdings when the label queue is empty, and animates when it moves (SPEC B1 to B7).

| File | Change |
|------|--------|
| `src/modules/dashboard/chartPlacement.ts` | New. The pure rule of B1 (`"main"` / `"side"`). |
| `src/modules/dashboard/chartPlacement.test.ts` | New. The four cases under Unit tests. |
| `src/modules/dashboard/DashboardPage.tsx` | Read `useMovementTotals(dashboardQueries(now, timeZone).labelCount)`, compute the placement, render the history section after `.dash__pair` or after `.dash__balance`. Track the placement of the first render (ref); once it differs, add the enter class, keyed on the placement so the animation replays on each move. Update the component comment. |
| `src/app.css` | `@keyframes` for the enter animation and the modifier class, inside `@media (min-width: 768px) and (prefers-reduced-motion: no-preference)`. Update the `.dash` comment. Mobile `order` rules unchanged. |

**Checks:**
- `pnpm verify` passes (API check, lint, tests, build).
- Manual, with `pnpm dev` from 768px: AC1 to AC6, including the range chip kept across the move and reduced motion via devtools emulation. Under 768px: AC7. Network tab: no extra `/movements/totals` request (AC9).
- Report `git status --short` and record files, results and any drift under Implementation State.

About 80 to 120 changed lines in 4 files.

## Implementation State

Built on 2026-11-13.

Files changed:
- `src/modules/dashboard/chartPlacement.ts` (new): the B1 rule as `chartPlacement`, over the count query's status and asset rows.
- `src/modules/dashboard/chartPlacement.test.ts` (new): the four unit cases (success 0, success above 0, pending, error).
- `src/modules/dashboard/DashboardPage.tsx`: reads `labelCount` through `useMovementTotals`, places the chart with `chartPlacement`, and tracks the first placement the count settles on. Only a later change gets `.dash__history--enter`, keyed on the placement; the first settled placement renders without it.
- `src/app.css`: `.dash__history--enter` and its keyframes, inside `@media (min-width: 768px) and (prefers-reduced-motion: no-preference)`. Mobile layout and order rules unchanged.
- `specs/INDEX.md`: this change's row set to built, as the user asked (the plan's file list otherwise excludes it).

Open decision resolved by the user: the first placement after the count's initial load is not animated. While the count loads the chart sits on the right without animation; if the first loaded count is 0 it jumps left without animating. Later changes animate.

Verification: `pnpm verify` passed (api:check, lint, 34 test files / 451 tests, build). `git status --short` shows `M specs/INDEX.md`, `M src/app.css`, `M src/modules/dashboard/DashboardPage.tsx`, and the untracked spec folder plus the two new `chartPlacement` files. No other drift.

