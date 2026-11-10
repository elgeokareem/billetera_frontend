---
title: "Implementation Plan: Assets"
change: assets-1
type: feature
spec: ./SPEC.md
issue: none
created: 2026-10-30
sdd_version: 7.3.0
---

# Implementation Plan: Assets

**Spec:** [SPEC.md](./SPEC.md)

Same phase rules as [App Foundation](../2026-10-30-app-foundation/PLAN.md).

## Phase 1: Assets view

Deliverables: summary, history chart with presets, merged coin list, states. A shared `BalanceChart` built on `@mantine/charts`.

Files: `src/routes/_app/assets/index.tsx`, `src/modules/assets/{CoinList,AssetSummary,mergeHoldings}.ts(x)`, `src/modules/shared/components/BalanceChart.tsx`, `src/locales/*`.

Checks: unit tests for `mergeHoldings`, including precision and unpriced rows. Screenshots at 1440px and 375px.

## Phase 2: Coin detail

Deliverables: `/assets/$asset`, value and amount chart, wallet split, the Movements link.

Files: `src/routes/_app/assets/$asset.tsx`, `src/modules/assets/CoinDetail.tsx`, `src/modules/snapshots/hooks.ts`, `src/locales/*`.

Checks: the coin detail criteria, including unpriced gaps and an invalid coin code.

## Implementation State

Phases 1 and 2 are built. Nothing is committed. The fake API is extended in `scripts/fake-api.mjs`.

**Verified:**
- `pnpm lint` exits 0 with no output. `pnpm build` (`tsc -b && vite build`) exits 0. Its chunk-size advisory was already in the baseline. `pnpm test` passes 163 of 163 in 18 files, up from 129 in 13 before this change.
- The new unit tests cover `coinHoldings` (exact sums across wallets, a partly unpriced coin, a coin with no rows, tiny amounts), the chart series (a null price is a gap, a priced zero is a zero, blank text is a gap, the tooltip keeps the API's strings), the gap spans, the range and all-time queries (no bucket is sent, and every preset fits the backend's 2000-bucket cap, checked against a copy of the backend's bucket rule), the absent-coin status, the coin code rule, and the movements link.
- Headless Chrome (puppeteer-core, scripts in the scratchpad under `e2e/assets`, outside the repo) against the fake on 8099 and Vite on 5173: the list page 33 of 33, the coin page 41 of 41, and the request rules 6 of 6.
- The existing suites, rerun after the changes: dashboard read 114 of 114, labelling 46 of 46, extra scenarios 11 of 11, Binance connection 113 of 113, Movements phases 1, 2 and 3 at 51 of 51, 31 of 31 and 29 of 29, and ac6 8 of 8. None failed.
- Requests: the list asks for 30 days with the browser's zone and no bucket, and 1 year asks for 365 days with no bucket. The API refuses one year at hourly buckets with `range too large for bucket` and accepts the same year with the bucket it picks, which is daily. A coin page with an invalid code sends no request, and neither does an encoded slash. A lower-case code goes to the API in upper case.
- Screenshots at 1440px and 375px were read in English and Spanish, and in the empty, one-point, error and Not-found states.
- Bundle: the main chunk grows by 18.88 kB (4.78 kB gzip), to 1,035.11 kB (316.46 kB gzip). The chart library, `@mantine/charts` with recharts, is a separate chunk of 399.48 kB (114.65 kB gzip), with 13.86 kB of CSS (2.49 kB gzip). It loads only on the Assets pages.

Acceptance criteria:
- AC1, BTC in both wallets: one row, `0.06858074 BTC` and `$6,412.30`, checked against the API's rows. Pass.
- AC2, the coin with no price sits last with "No price", and a note says the total leaves unpriced coins out. Pass, on desktop and at 375px.
- AC3, a null USD point is a gap. The value line breaks, the stretch is shaded and labelled "No price", and the amount line has no gap. Checked on ADA, whose history has six unpriced snapshots. Pass.
- AC4, one year loads with no range error. Pass.
- AC5, the coin's movements link is `/movements?asset=BTC&asset_match=any`. Movements shows "Includes Convert" and a Convert row. Pass.

**Not verified:**
- The real backend (roadmap step 6). Everything ran against the fake, which was built from `../backend/README.md` and `backend/modules/snapshots`.
- A priced point between two gaps. The code draws a dot for it, but the fake has no such point, so the dot was never drawn in a browser.
- Keyboard use of the chart. Its keyboard layer is off. The coin rows and links are keyboard reachable, but tabbing through them wasn't tested.
- The unknown-coin check on real data, and the cost of the all-time check on a long real history, which reads every snapshot of the user for one coin.
- Browsers other than Chrome, days with a daylight-saving change, and loading skeletons under a slow network (the fake's `delayMs`). The skeleton states were seen, not timed.

**Drift from the plan and spec:**
- `mergeHoldings` is reused from `src/modules/snapshots/holdings.ts`, as the brief asked. The plan listed `src/modules/assets/mergeHoldings.ts`, which doesn't exist. The per-wallet split for the coin page, `coinHoldings`, is in the same file.
- Files beyond the plan's lists. `src/modules/assets/` also has `AssetsPage.tsx`, `BalanceHistory.tsx`, `RangeChips.tsx`, `NoSnapshot.tsx`, `chart.ts`, `chartFormat.ts`, `queries.ts`, `status.ts`, `codes.ts`, `links.ts` and `hooks.ts`, plus five test files. `src/modules/snapshots/{api,hooks,types}.ts` gain the asset history fetch, hook and types, which the plan didn't list for Phase 2. `src/app.css` gains `.row-link`. `src/routes/_app/assets.tsx` moved to `assets/index.tsx`, and `assets/$asset.tsx` is new.
- `BalanceChart.tsx` is in `src/modules/shared/components/`, and it's loaded with `React.lazy`, so the chart library stays out of the main chunk.
- The spec says only an invalid code shows Not found. The brief also makes an unknown coin Not found. The API can't say whether a coin was ever held, so a coin the latest snapshot lacks counts as formerly held if any of three checks finds it: its daily points for the last year, its monthly points from 2000, or any movement that involves it. Only when all three find nothing is it Not found.
- The fake: ADA is held from 5 to 14 days ago and sold since, and its history has six unpriced snapshots, but only with unpriced on. BTC has a locked and a frozen part, and `free` is now the amount less locked and frozen. Before, `locked` and `freeze` were always zero. The seeded totals are unchanged, because BTC absorbs ADA's value.
- The chart plots each snapshot at its `captured_at`, not at the start of its bucket. The USD value axis starts at zero, and the amount axis fits its values (see the note below).

- Money display: coin amounts keep every digit with trailing zeros trimmed. USD values show cents, as the Dashboard does.

**Chart axes (follow-up):** *(Superseded 2026-11-07 by [Dashboard Balance Chart](../2026-11-07-dashboard-balance-chart/SPEC.md) D10: every balance chart's value axis now fits the data, never below zero, behind `FIT_VALUE_AXIS` in `BalanceChart.tsx`. The time axis and the ranges change again in [Chart Time Axis](../2026-11-08-chart-time-axis/SPEC.md).)* The USD value charts, the balance history and a coin's USD value, start their value axis at zero, so the height of the line means the same at every point. The amount chart still fits its values, so a small change in the amount shows. The day labels along the bottom were already on both charts. They're checked at 1440px and 375px in English and Spanish, and they don't overlap. `pnpm test` passes 183 of 183 in 19 files, and the Assets suites pass with no assertion changed (33, 41 and 6 checks). The Dashboard PLAN has the rest of the run.

**Open questions:**
1. Is the three-check rule for an unknown coin acceptable? A holding can be missed if it was shorter than the checks' spacing and has no movement record. Movements sync only 90 days back on the first run. An exact answer needs a backend endpoint that says whether a coin was ever held, and the README has none.
2. Should the chosen range live in the URL, so that going back from a coin page keeps the list's range? The spec doesn't say.
3. Should USD values show sub-cent digits when a value has them? The Dashboard shows cents, so this kept cents.
