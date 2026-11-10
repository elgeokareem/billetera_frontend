---
title: "Implementation Plan: Chart Time Axis"
change: chart-time-axis-1
type: bugfix
spec: ./SPEC.md
issue: none
created: 2026-11-08
updated: 2026-11-09
sdd_version: 7.3.0
---

# Implementation Plan: Chart Time Axis

**Spec:** [SPEC.md](./SPEC.md). The spec has the exact behaviour, signatures and test cases. Read the section a step names before writing it.

Rules for every phase:
- Never commit. Never open, read, `cat`, `grep` or print `.env` or any `.env.*` file.
- Edit app code only within the files a phase lists. If another file needs to change, say so in the report.
- Don't touch `specs/INDEX.md` or `specs/ROADMAP.md`; the main session updates them.
- Before reporting a phase as done, run `pnpm lint`, `pnpm test` and `pnpm build`, and paste the last lines of each. Then confirm `pnpm-lock.yaml` is unchanged (no phase adds a dependency) and that `src/routeTree.gen.ts` holds no change you didn't intend. Running the dev server can rewrite both files.
- Keep each phase under about 400 changed lines and 15 files. Report the actual numbers (`git diff --stat`).

Browser checks use only what's in the repo:
1. `pnpm fake-api` serves the fake API on `http://localhost:8099`. Its header comment (top of `scripts/fake-api.mjs`) lists the login, the test keys, the account kinds and the flags.
2. In another terminal, `VITE_BACKEND_ENDPOINT=http://localhost:8099 pnpm dev` serves the app on `http://localhost:5173`.
3. Log in as `test@example.com` / `password`, and connect with the read-only test key from that header comment (`readonly`, or `readonly00000000` with the secret `secret0000000000` once [Review Fixes](../2026-11-09-review-fixes/SPEC.md) Phase 2 has landed).
4. Set a scenario with `curl -s -X POST http://localhost:8099/__fake/state -H 'content-type: application/json' -d '<json>'`, then reload the page. `curl -s http://localhost:8099/__fake/state` shows the current flags. Scenarios used here:
   - **Dense:** `{"account": "populated"}` (the start state). Snapshots cover the last 30 days, hourly for the last 72 hours, then every 6 hours. So 24h, 7d and 30d are full, and 90d and 1y are sparse (the line should fill only the right third and the right twelfth of the plot).
   - **Sparse (minutes):** register a new user from `/register`, log in, connect with the test key (the connect page runs the first sync), then click Sync on the Dashboard two more times, a few seconds apart. All three snapshots are within a minute of now.
   - **One point:** `{"account": "single-snapshot"}`, one snapshot dated two minutes ago.
   - **No snapshot:** `{"account": "empty"}`. The Dashboard hides the chart section; the Assets page shows `NoSnapshot` and the total chart (B4).
   - **Zero points with a snapshot:** not in the fake. Optional manual check: in Chrome DevTools, Network panel, right-click a `GET /snapshots?...` response, "Override content", replace `"points":[...]` with `"points":[]`, save, and reload. Remove the override afterwards. Otherwise rely on the unit tests.
   - **Gaps:** `{"unpriced": true}` (the default). ADA was held 5 to 14 days ago, and a stretch of its history has no price, so `/assets/ADA` on 30d shows shaded gaps.
   - **Slow loads:** `{"delayMs": 1500}` to see skeletons. Set back to `0` afterwards.
5. Hide or show balances with the eye button in the app header.
6. Widths: DevTools device toolbar (Ctrl+Shift+M) set to 375 px, 1024 px and 1440 px wide.
7. Reading the X labels and checking overlap: paste this in the DevTools console. It prints each chart's X labels and any pair that overlaps.
   ```js
   (() => {
     for (const [n, chart] of [...document.querySelectorAll(".recharts-wrapper")].entries()) {
       const ticks = [...chart.querySelectorAll(".recharts-xAxis .recharts-cartesian-axis-tick-value")];
       const boxes = ticks.map((t) => ({ text: t.textContent, box: t.getBoundingClientRect() }));
       const overlaps = boxes.slice(1).flatMap((b, i) => (b.box.left < boxes[i].box.right ? [`${boxes[i].text} | ${b.text}`] : []));
       const plot = chart.querySelector(".recharts-cartesian-grid")?.getBoundingClientRect();
       console.log(`chart ${n}`, boxes.map((b) => b.text), "overlaps:", overlaps, "plot:", plot && [Math.round(plot.left), Math.round(plot.right)]);
     }
   })();
   ```
   If a selector finds nothing, inspect one X label in the Elements panel, adjust the class names in the snippet, and say so in the report.
8. Screenshots: DevTools command menu (Ctrl+Shift+P), "Capture node screenshot" on the chart card. Save them outside the repo (for example under `/tmp`) and list their paths in the report.

Report each browser check as pass, fail or not verified.

## Phase 1: Pin the test zone, pure helpers and tests

No change in behaviour. Nothing imports the new code yet.

Deliverables:
- **Pinned zone (spec B12, Tests):** in `vite.config.ts`, add `/// <reference types="vitest/config" />` as the first line, and add to the returned object:
  ```ts
  // Tests run in one fixed zone, so every run is the same on every machine (Chart Time Axis B12). Santiago has DST changes at
  // midnight, the hardest case for the time axis. forks, not threads: TZ only takes effect in a new process.
  test: { env: { TZ: "America/Santiago" }, pool: "forks" },
  ```
  If `pnpm build` (`tsc -b`) rejects the `test` key, change the import to `import { defineConfig } from "vitest/config"` and keep `loadEnv` from `"vite"`. The Netlify check above it doesn't change.
- In `src/modules/shared/chart.ts`: `TimeWindow`, `chartWindow`, `clipToWindow`, `padEmptyWindow` and `timeAxisTicks`, written exactly as in the spec's "Window helpers" and "Time axis ticks", including the DST rule (B13: use `new Date(y, m, d, h)` as is) and the iteration rule. Import `RANGE_DAYS` and `RangeKey` from `./chartRange`. Update the doc comment of `MIN_POINTS` and `hasEnoughHistory`.
- In `src/modules/shared/chartFormat.ts`: `formatMonthTick` and `timeTickFormatter`.

Files:
- `vite.config.ts`
- `src/modules/shared/chart.ts`
- `src/modules/shared/chart.test.ts`
- `src/modules/shared/chartFormat.ts`
- `src/modules/shared/helpers.test.ts`

Tests to add (spec "Tests"):
- `chart.test.ts`, first: a guard test, `expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("America/Santiago")`, with a comment pointing at `vite.config.ts`.
- `chartWindow`, `clipToWindow`, `padEmptyWindow`, as listed.
- `gapSpans(clipToWindow([], window))` is `[]`, and `gapSpans` of a clipped series whose only points are outside the window is `[]`.
- `timeAxisTicks`, regular and compact, every range, on non-DST windows (for example `end = new Date(2026, 10, 9, 15).getTime()`): order, bounds, no duplicates, the per-range rules, compact as a subset at twice the step, and anchoring (slide by one hour).
- Every DST case listed in the spec, with the exact `Date.parse("...Z")` values it gives.
- `helpers.test.ts`: `formatMonthTick` and `timeTickFormatter`.

Checks:
- `pnpm test`. All existing tests must still pass in the pinned zone (on 2026-11-09 all 227 tests in 22 files passed with `TZ=America/Santiago`).
- `TZ=UTC pnpm test` and `TZ=Asia/Tokyo pnpm test` also pass, and the guard test passes in both: this proves the config overrides the shell's zone. Report both.
- `pnpm lint` and `pnpm build`.
- No import cycle: `grep -n "from \"./chart\"" src/modules/shared/chartRange.ts` finds nothing.

## Phase 2: The chart draws the window

Fixes Bug A, the ticks, and the 1-point and 0-point states, on all four charts. The requests don't change in this phase: Assets still sends `to` and still has four ranges.

Deliverables:
- `BalanceChart` changes as described in the spec's "`BalanceChart`" section:
  - new props: `range`, `windowEnd` and `fetchedAt`; `formatTime` is removed
  - `window`, `shown` (clipped), `data` (padded) and the ticks, each in a `useMemo`
  - `gapSpans`, `fitValueAxis`, the tooltip's `find` and the dot's neighbour check all read `shown`; only `LineChart`'s `data` prop gets `data`
  - compact ticks: `const { ref, width } = useElementSize()`, `ref` on a `div` that wraps only the `LineChart`, and the rule in the spec's "When to use compact ticks" (`VALUE_AXIS_WIDTH = 84`, used for `yAxisProps.width` too, and `MIN_TICK_SPACING = 56`)
  - `xAxisProps` uses the window domain, `allowDataOverflow`, `ticks`, `interval: 0` and right padding
  - the `notEnough` caption under the chart, inside the component's root `Stack`
- The three callers drop their not-enough branch and pass the new props.
- `CoinDetail`'s `hasGaps` is computed on the clipped series.

Files:
- `src/modules/shared/components/BalanceChart.tsx`
- `src/modules/dashboard/BalanceHistoryCard.tsx`
- `src/modules/assets/BalanceHistory.tsx`
- `src/modules/assets/CoinDetail.tsx`

Checks:
- `pnpm lint`, `pnpm test` and `pnpm build`. The chart is still a separate lazy chunk in the build output (a `BalanceChart-*.js` file). Note any change in the size of the main chunk.
- Browser, at 1440 px and 375 px, in English. For each of the Dashboard chart, the Assets total chart and a coin's (BTC) USD and Amount charts, use the console snippet (step 7) on each range:
  - **Dense:** 24h, 7d and 30d: the line spans the plot, and the labels follow the spec's tick table, each once. 90d and 1y: the line starts about two-thirds and eleven-twelfths of the way across. Take a screenshot of the Dashboard chart on 30d before you start the phase and after, and compare: same shape, same Y ticks.
  - **Sparse (minutes):** on every range the line or dots sit at the right edge, and the labels change with the range. The last point is within 8 px of the plot's right edge, and its dot is fully visible.
  - **One point:** one dot at the right edge, not cut off, with the full window's labels, and "Not enough history yet" with its body under the chart.
  - **No snapshot (Assets):** `NoSnapshot`, then the empty window axis with the window's labels, and the caption. No line, no dot, no shading.
  - **Zero points with a snapshot:** the optional DevTools override; otherwise "not verified (unit tests only)".
  - **Gaps:** `/assets/ADA` on 30d: the shaded stretches as before, none before the first point.
  - **Hidden balances:** every Y tick and the tooltip value read `••••`; the X labels are real dates or times.
- Label overlap: at 375 px, 1024 px and 1440 px (where the Dashboard chart is in its column, about 405 px), in English and Spanish, the snippet reports no overlaps on any range. Tune `MIN_TICK_SPACING` if needed, and report the final value and which ranges went compact at each width.
- Screenshots of each case above, with their paths in the report.

## Phase 3: Assets gets 24h and drops `to`

Fixes Bug B and adds 24h to Assets.

Deliverables:
- `RANGE_KEYS` replaces `ASSET_RANGE_KEYS` and `DASHBOARD_RANGE_KEYS`.
- The Assets total and coin chart queries use `openRangeQuery`. `useAbsentCoinCheck` (`src/modules/assets/hooks.ts`) keeps `rangeQuery`.
- Update the doc comments for `now` and the queries, as the spec's "Callers" and "Ranges" sections describe, and `RangeChips`' doc comment.

Files:
- `src/modules/shared/chartRange.ts`
- `src/modules/shared/chartRange.test.ts`
- `src/modules/shared/components/RangeChips.tsx` (doc comment only, line 8)
- `src/routes/_app/dashboard.tsx`
- `src/modules/dashboard/BalanceHistoryCard.tsx`
- `src/modules/assets/BalanceHistory.tsx`
- `src/modules/assets/CoinDetail.tsx`
- `src/modules/assets/AssetsPage.tsx` (comment only)

`src/modules/assets/hooks.ts` must not change.

Checks:
- `pnpm lint`, `pnpm test` and `pnpm build`.
- `grep -rn "ASSET_RANGE_KEYS\|DASHBOARD_RANGE_KEYS" src` finds nothing.
- Browser, dense account unless noted:
  - **Chips:** Assets total and coin chips are 24h, 7d, 30d, 90d and 1y, with 30d selected.
  - **Requests:** in the Network panel, each `GET /snapshots?...` and `GET /snapshots/assets/BTC?...` from an Assets chart has `from` and `tz`, with no `to` and no `bucket`. Open `/assets/XRP` (a coin the account never held): its not-found checks still send `to`.
  - **24h on Assets:** hour labels, and the line over the last 24 hours.
  - **Sync on Assets:** open `/assets`, wait a minute, then click Sync in the summary. The total chart refetches, its last point is the new snapshot at the right edge (hover it: the tooltip time is now), and its tooltip value equals the summary total, with no reload.
  - **Coin page after Sync:** open `/assets/BTC`, then in another tab run Sync from the Dashboard, then come back to the first tab (window focus refetches) or click another range and back. The new point appears.
  - **Dashboard regression:** `?range=7d` opens on 7d; `?range=2y` shows 30d; Back after a range click goes to the previous page; Sync adds the new point.
- Run the full acceptance list from the spec at 1440 px and 375 px, in English and Spanish, with balances hidden and shown, and record pass, fail or not verified for each criterion. List screenshot paths.

## Implementation State

All three phases are implemented, uncommitted.

- Phase 1: done. `vite.config.ts` pins `TZ=America/Santiago` with `pool: "forks"`; `chart.ts` has `chartWindow`, `clipToWindow`, `padEmptyWindow` and `timeAxisTicks`; `chartFormat.ts` has `formatMonthTick` and `timeTickFormatter`; the tests include the guard and the DST cases. The guard fails when the config's TZ is changed to UTC, as expected (checked, then restored).
- Phase 2: done. `BalanceChart` draws the window, with explicit ticks, compact ticks from `useElementSize`, the right padding and the not-enough caption. The three callers pass `range`, `windowEnd` and `fetchedAt`, and `CoinDetail`'s gaps note reads the clipped series. `MIN_TICK_SPACING` stayed at 56 px, the plan's value, because the browser measuring step wasn't run.
- Phase 3: done. `RANGE_KEYS` replaces the Assets and Dashboard key lists, and the Assets total and coin chart requests use `openRangeQuery`; `useAbsentCoinCheck` still uses `rangeQuery`.

The browser and manual checks in the plan were not run; they are left for the main session.
