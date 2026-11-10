---
title: "Implementation Plan: Dashboard"
change: dashboard-1
type: feature
spec: ./SPEC.md
issue: none
created: 2026-10-30
sdd_version: 7.3.0
---

# Implementation Plan: Dashboard

**Spec:** [SPEC.md](./SPEC.md)

Same phase rules as [App Foundation](../2026-10-30-app-foundation/PLAN.md).

## Phase 1: Data layer

Deliverables: typed API functions and query hooks for snapshots, movements, totals and categories, including the shared `SPENDING_FILTER`. Check the real `category_id` and `usd_value` shapes of a totals row before writing the types, since the backend uses custom key types for both.

Files: `src/modules/movements/{api,hooks,types}.ts`, `src/modules/snapshots/{api,hooks,types}.ts`, `src/modules/categories/{api,hooks,types}.ts`, tests for spending aggregation.

Checks: unit tests sum per category across assets, with null categories and unpriced rows.

## Phase 2: Read-only sections

Deliverables: the page layout, balance card with sparkline and sync, Recent movements, October spending, Holdings. Remove the old `GraphContainer`, `LineChart`, `InfoCard` and the `graphType` search param.

Files: `src/routes/_app/dashboard.tsx`, `src/modules/dashboard/*`, `src/locales/*`.

Checks: each section's loading, error and empty states. Screenshots at 1440px and 375px, compared with the design.

## Phase 3: Label cards

Deliverables: headline and cards for the current month, category buttons, New category, reason, Undo, "See older", optimistic updates and refreshes.

Files: `src/modules/dashboard/{LabelQueue,LabelCard}.tsx`, `src/modules/movements/hooks.ts`, `src/locales/*`.

Checks: all labelling criteria against the local backend, on a test account. Don't change labels on a real account without the user's go-ahead.

## Implementation State

Phases 1, 2 and 3 are built, with the fake API extended in `scripts/fake-api.mjs`. Nothing is committed. The Movements view isn't started. The `syncFailed` stopgap is gone. *(Superseded: the Movements view was built by [Movements and Categories](../2026-10-30-movements-categories/PLAN.md), and all of this is committed. See "Later changes" below.)*

**Verified:**
- `pnpm lint` exits 0 with no output. `pnpm build` (`tsc -b && vite build`) exits 0; its chunk-size advisory was already there in the baseline. `pnpm test` passes 71 of 71 in 7 files: spending aggregation, the "Needs a label" rules, date ranges, holdings, the category split and name rule, the price and filing wording, and the locale key sets.
- Headless Chrome (puppeteer-core, scripts kept in the scratchpad, outside the repo) against the fake on 8099 and Vite on 5173. Read-only checks: 114 of 114. Labelling: 46 of 46. Extra scenarios (holdings cap, an empty month, a fully priced account): 11 of 11. The Binance Connection suite (`binance.mjs`, updated for the removed stopgap): 113 of 113. The App Foundation loader and credentials checks (Task A): all pass.
- Screenshots at 1440px and 375px, and in Spanish, were compared by eye with direction C, and an empty-account state was reviewed. The console is clean apart from the injected faults.

Acceptance criteria:
- AC1, two unlabelled spending movements, headline 2 and both cards: pass.
- AC2, only last month unlabelled, All labelled and See older: pass for the headline and the link target. The list See older opens is the Movements view, which isn't built, so that part is not verified.
- AC3, a Convert with no category is not counted, has no card and isn't marked Needs a label: pass.
- AC4, Food on a card removes it at once, drops the count, updates Recent movements and October spending, and Undo restores it: pass.
- AC5, a failed PATCH brings the card back with an error and keeps the typed reason: pass.
- AC6, a spending movement with no price shows the note and the total is marked incomplete: pass.
- AC7, USDT and BTC rows in one category show one summed value: pass on screen ($312.40). Full precision is covered by the unit test with `9007199254740993.00000001`.
- AC8, no snapshot from 24 to 48 hours ago hides the comparison: pass.
- AC9, a sync already running shows an info message, not an error: pass.
- AC10, Spanish follows through text, numbers and dates, and names and reasons stay as written: pass.
- AC11, a new account shows only real or empty states, and no sample values: pass.
- Binance Connection AC4, a key saved with a failed first sync shows a retry, not a blank page: pass.

Requirement checks in the browser: the cards query (`kind`, `direction`, `status`, `category_id=none`, `limit=3`, the local month as Z times) and the other five requests have the shapes the spec asks for; no request carries a raw `+`, and a zone of `Etc/GMT+5` goes out as `%2B`. The PATCH bodies hold only the keys that changed, and Undo sends `{"category_id": null}`. In New category, a blank name is refused in the form, and a duplicate name gets the translated already-exists message (409). The sections fail and retry on their own, and skeletons show while they load. Above six categories, the top five by use are buttons and the rest are in a select. Holdings shows five of six coins, with the unpriced one cut.

**Not verified:**
- The Movements view. The "See older" and "Review all" links are checked for their targets and the data behind them, not the list they open.
- The real backend (roadmap step 6). Everything runs against the fake, built from `../backend/README.md` and the Go structs for movements, snapshots and categories.
- Browsers other than Chrome. Daylight-saving changes inside a month. A page left open across midnight or a month boundary: the dates are fixed when the page mounts.
- Server-side 400 for a category name and 404 for a deleted category. The client refuses a bad name first, so the browser never reaches them. The messages are mapped in `api-errors.ts`.
- What `gcTime: 0` does to the mutation cache. It was checked only that the connect, refused-key and replace flows still work.
- Real Binance. No real key was used.

**Drift from the plan and spec:**
- Optimistic labelling keeps in-flight saves in the queue component. Their cards are hidden and taken off the count, and nothing is written to the cache, so there's no rollback to get wrong. A failed save shows the card again from the server's data.
- The spending filter includes `status=completed` on the totals and the list calls. The spec's totals URL leaves it out, but the backend default is the same.
- The balance change reads "Balance change since yesterday", because the comparison point is 24 to 48 hours back.
- A Convert's title is its kind and both coins, such as "Convert BNB → USDT".
- Holdings shows the amount under each coin. The design shows the coin and its value only.
- Not in the design: the 409 info message is a blue info alert; the balance card's Sync button is dark on the accent card; the no-snapshot prompt sits on the surface colour.
- `useSyncBinanceData` (in the binance module) refreshes queries after a failed sync as well (`onSettled`), because one of the two calls may have saved.
- The connect page sends a user to `/dashboard` with no flag after a failed first sync. The no-snapshot prompt's Sync now is the retry, which replaces `syncFailed`.
- `/_app` sets `pendingMinMs: 0`, which fixes the 500ms loader note in App Foundation.
- `/_app/movements` gets a minimal `validateSearch` for the six keys the Dashboard links use.
- The fake: `delayMs` now delays every API call (it covered `/auth` and `/binance` only). `POST /binance/sync` adds a snapshot dated now. `POST /binance/movements/sync` adds counts only. New scenario flags: `account`, `unpriced`, `moreCategories`, `gapWindow`, `syncInProgress`, `failRoute`, `failStatus`.
- Files outside the plan's list: `src/modules/dashboard/` (the components, `queries.ts`, `movementText.ts` and their tests), `src/modules/movements/{types,api,hooks,spending,search}.ts`, `src/modules/snapshots/{types,api,hooks,holdings}.ts`, `src/modules/categories/{types,api,hooks,ranking}.ts`, `src/modules/shared/dateRange.ts`, and `src/locales/locales.test.ts`. Also `money.ts` and `format.ts` (extended), `src/modules/binance/ConnectPage.tsx`, `src/modules/binance/hooks.ts`, and the deleted `src/modules/binance/SyncRetry.tsx`.
- The Binance Connection PLAN still describes the `syncFailed` retry and the 500ms loader note in its Implementation State. Those statements are now out of date, and that file is outside this change, so it's left for a decision.

**Open questions:**
- An account with no movements at all reads "All labelled", because that's the spec's rule for an empty queue. Should a brand-new account get its own line?
- Should the dates be refreshed while the page stays open, or is the reload needed at a month boundary acceptable?
- The Movements change needs to decide the URL form of the comma lists. TanStack's default encodes the commas as `%2C`.

**Later changes:** the [Movements and Categories](../2026-10-30-movements-categories/PLAN.md) change built the Movements view and verified AC2's list: "See older" shows last month's unlabelled movements. The comma-list question is settled there too.

**Chart axes (follow-up):** *(Superseded 2026-11-07 by [Dashboard Balance Chart](../2026-11-07-dashboard-balance-chart/SPEC.md): the sparkline was removed (its D9) and replaced by the balance chart under the Balance card, whose value axis fits the data instead of starting at zero (its D10). The counts below are from that time; on 2026-11-09, `pnpm test` passes 227 tests in 22 files.)* The balance sparkline has a USD scale that starts at zero, with at most four compact ticks, so the height means the same at every point. Its three date labels are the first snapshot's date, the last one's, and the snapshot nearest the middle of the period, in the short day and month form. Each point sits at its real time, not its index, because the snapshots come at uneven intervals. It's inline SVG and HTML, with no chart library. The balance change question is closed: the user accepted "since yesterday". `pnpm test` passes 183 of 183 in 19 files. The dash suites (114, 46 and 11 checks) and the Assets suites (33, 41 and 6 checks) pass with no assertion changed. An axes check measured the labels at 1440px and 375px, in English and Spanish: 121 of 121.
