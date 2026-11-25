---
title: "Implementation Plan: Movements Pie Chart"
change: movements-pie-chart-1
type: feature
spec: ./SPEC.md
issue: none
created: 2026-11-25
updated: 2026-11-25
sdd_version: 7.3.0
---

# Implementation Plan: Movements Pie Chart

**Spec:** [SPEC.md](./SPEC.md). Behaviour, acceptance criteria and tests are there. The approved look is [mockup.html](./mockup.html) / [proposal.png](./proposal.png) — reference, not a pixel spec.

Rules:
- Never commit. Never open, read, `cat`, `grep` or print `.env` or any `.env.*` file. Tell every subagent this.
- No new dependency, no backend change. Money stays a decimal string; `Number()` only for the slice size and the percent.
- The locale files are shared: add the keys of the spec's i18n section to **both** `en.json` and `es.json`, changing nothing else.
- Don't touch `specs/INDEX.md` or `specs/ROADMAP.md`.
- There are no open questions; build the spec's stated decisions.

## Phase 1: Aligned labels, chart type toggle, pie

**Outcome:** SPEC B1 to B10, AC1 to AC10.

| File | Change |
|------|--------|
| `src/modules/movements/MovementsChart.tsx` | B1 label styles on the mode control (placement unchanged); B2 header layout with the accent Bars/Pie toggle (`chartType` state); B3 grouped-query enablement; B6 pie titles; B7 hide the mode control while the pie is on; B8/B10 unchanged states and lazy loading. |
| `src/modules/movements/MovementsPieChart.tsx` | New, default export, lazy-loaded: `PieChart` per B4 with the custom tooltip of B5 and the shared legend below. |
| `src/modules/movements/MovementsBarChart.tsx` | Extract the By-category legend (B4); nothing else changes. |
| `src/modules/movements/ChartLegend.tsx` | New, small: the swatch-and-name legend both charts render. |
| `src/locales/en.json`, `src/locales/es.json` | `movements.chart.*` keys of the spec's i18n section, en + es. |

5 files (2 new, 3 changed). Expect roughly 150 to 250 changed lines.

**Checks:**
- `pnpm verify` passes (API check, lint, tests, build).
- Manual with `pnpm dev` at 375px and 1280px, walking AC1 to AC10, if a dev environment is available; otherwise state that plainly in the report.
- Report `git status --short` and fill **Implementation State** below: files changed, answers/drift/fit notes, what wasn't run.

## Implementation State

**Status:** Implemented 2026-11-25. All of SPEC B1 to B10 is built; `pnpm verify` is green. The manual AC pass was not run (no dev server used).

### Files changed

| File | Change |
|------|--------|
| `src/modules/movements/MovementsChart.tsx` | B1 centered label styles on the mode control and the new toggle; B2 accent Bars/Pie toggle in the header (`chartType` state, not saved) with the title block in a wrapping left `Group`; B3 grouped query enabled by `shown && (mode === "category" || chartType === "pie")`, pie cells from `chartRows(grouped.assets, direction, "category")` with the shared `labelOf`/palette mapping; B6 pie title; B7 mode control hidden while the pie is on; B8/B10 shared states, lazy chunks and Hide/Show unchanged. |
| `src/modules/movements/MovementsPieChart.tsx` | New default export: `PieChart` per B4 (`size={220}`, outside percent labels, no built-in legend, `tooltipDataSource="segment"`, `accessibilityLayer={false}`, `role="img"`, `aria-label`, `mx="auto"`), B5 custom readout with name, whole percent and the masked exact amount, and the shared legend below. |
| `src/modules/movements/ChartLegend.tsx` | New: the swatch-and-name legend both category charts render (extracted from the bar chart). |
| `src/modules/movements/MovementsBarChart.tsx` | By-category legend now renders `ChartLegend`; no behavior change. |
| `src/locales/en.json` | `movements.chart.bars`, `.pie`, `.chartType`, `.title.out.pie`, `.title.in.pie`. |
| `src/locales/es.json` | The same five keys in Spanish. |

### Correction 2026-11-25: B1's first fix did not fix the alignment

The requester's screenshot showed the selected pill short and top-aligned inside the 44px control. Root cause, measured with a repro built on the repo's own tooling (`.seg-fix-repro`, since removed): Mantine's `FloatingIndicator` copies the active **label's** box, and the label is content-sized inside the stretched `control` flex item — the first fix (`styles.label` flex-centering) centered text inside the short label and changed nothing. The fix on both controls is `styles={{ control: { display: "flex" }, label: { display: "flex", alignItems: "center", justifyContent: "center", flex: 1 } }}` with `mih={44}` kept; measured after: root 44, label 36, indicator 36, pill top 4. An alternative (`--sc-padding: 0.5rem 1rem`) also fills the pill but makes the control 45.7px, so it was rejected. SPEC B1 was rewritten to describe this.

### Fit notes and drift

- `PieChart` defaults `withTooltip` to `false` (unlike `BarChart`), so `MovementsPieChart` sets `withTooltip` explicitly; B5's tooltip would not render otherwise. This is the only prop the spec did not name.
- `PieSliceView` carries the spec's `{ name, value, color, amount }` plus `key`, which only gives the legend a stable React key; recharts and Mantine pass the extra field through untouched and `amount` remains the exact decimal string.
- No new pure helper was needed: the pie consumes `chartRows(..., "category").series`, so `chart.ts` and `chart.test.ts` are untouched and the existing 553 tests stay green.
- `specs/INDEX.md` and `specs/ROADMAP.md` already showed as modified when the implementation started; they were not touched here, per the plan.

### Not run

- The manual acceptance walk (AC1 to AC10, especially the 375px header wrap and the hover tooltip) needs `pnpm dev`, which this implementation had no dev server for.

### Verification

```
$ pnpm verify
.../mwvq163y-h7zq                        | Progress: resolved 33, reused 32, downloaded 1, added 33, done
✨ openapi-typescript 7.13.0
Done in 3.3s using pnpm v12.14.0
$ eslint .
$ vitest run
 Test Files  39 passed (39)
      Tests  553 passed (553)
$ tsc -b && vite build
✓ 8294 modules transformed
dist/assets/ChartLegend-ChLGGWpJ.js               0.90 kB │ gzip:  0.49 kB
dist/assets/MovementsPieChart-fQ1rGTgw.js        21.98 kB │ gzip:  7.27 kB
dist/assets/MovementsBarChart-CV59c186.js        28.27 kB │ gzip:  9.62 kB
✓ built in 934ms
```

(The build's pre-existing "chunks larger than 500 kB" warning is unchanged by this work; the pie is its own lazy chunk.)

### Improvement 2026-11-25: legend beside the pie, with its figures

`ChartLegendItem` gained an optional `trailing` node, rendered inline after the name; the bars pass none, so their legend is unchanged. `MovementsPieChart` now lays the pie and the legend in a wrapping `Group` (`justify="center"`, `align="center"`, `gap="xl"`, `wrap="wrap"`) instead of a `Stack`, and every legend row carries its percent (`Math.round(cell.value / total * 100)`, dimmed, never masked) and its exact amount (`maskText(formatUsd(cell.amount), hidden)`, `fw={600}`). The legend lives in a `Box` with `flex: "0 1 300px"`, so it forms one row per category beside the pie while there is room and the same flex wrap drops the whole column below it when the card narrows — no media query. A plain unflexed legend was measured to drop below the pie even at 1280px (its max-content width exceeds the ~696px left beside the pie), so the column's flex basis is what keeps AC11 true at that width.

`pnpm verify` green on 2026-11-25: API check, ESLint, 553 tests in 39 files, and `tsc -b && vite build` (the pie chunk is 22.33 kB). The manual acceptance walk was not run.

