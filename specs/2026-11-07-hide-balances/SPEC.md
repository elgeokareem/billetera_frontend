---
title: Hide Balances
spec_type: tech
type: feature
status: draft
domain: Portfolio, Platform
issue: none
created: 2026-11-07
updated: 2026-11-07
sdd_version: 7.3.0
---

# Hide Balances

## Overview

A privacy toggle that hides money amounts, so the app can be opened in front of other people. Balances are **hidden by default**. The user's choice is one global setting per browser, saved in `localStorage` and held in memory in a small Zustand store. The eye toggle flips it instantly on every page.

**Revision (2026-11-07, Phase 4):** Phases 1 to 3 kept the setting in a URL search param, `show_balances=true`, retained across navigation inside `/_app`. A later amendment (also called Phase 4) added a saved choice plus an entry rule in `/_app`'s `beforeLoad`; it was cancelled before it shipped. The user then decided the setting **must not live in the URL at all**: the browser's history keeps a snapshot of each URL, so after hiding balances, Back could land on an older entry that still had `show_balances=true` and reveal them. Phase 4 is now "Move state from URL to localStorage store". The URL decisions are listed under [Superseded decisions](#superseded-decisions).

Depends on [App Foundation](../2026-10-30-app-foundation/SPEC.md) (layout, translations), and touches the views of [Dashboard](../2026-10-30-dashboard/SPEC.md), [Movements and Categories](../2026-10-30-movements-categories/SPEC.md) and [Assets](../2026-10-30-assets/SPEC.md). [Dashboard Balance Chart](../2026-11-07-dashboard-balance-chart/SPEC.md) builds on it.

This is display only. No API call changes, and the backend isn't involved.

### Current State

As built by Phases 1 to 3 (uncommitted):

- `src/modules/shared/privacy.ts` holds the URL helpers (`SHOW_BALANCES_PARAM`, `BalancesSearch`, `parseBalancesSearch`, `balancesShown`, `withBalancesShown`) and `MASK` / `maskText`. The cancelled amendment also added `BALANCES_STORAGE_KEY`, `BalancesStorage`, `loadBalancesShown`, `saveBalancesShown` and `balancesEntrySearch`; an implementer is reverting those edits now, so the storage helpers may or may not be present when Phase 4 starts.
- `src/modules/shared/usePrivacy.ts`: `useBalancesHidden()` reads the param through `useSearch({ strict: false, shouldThrow: false, select: balancesShown })`.
- `src/modules/shared/components/Sensitive.tsx`, `SpendingCard.tsx` and `BalanceChart.tsx` call `useBalancesHidden()`. They only depend on its signature (`() => boolean`).
- `src/modules/shared/components/BalancesToggle.tsx` navigates to `"."` with `withBalancesShown`, `replace: true` and `resetScroll: false`. `AppLayout` renders it twice (mobile header and navbar brand row, CSS shows one).
- `src/routes/_app.tsx` has `validateSearch: parseBalancesSearch` and `search: { middlewares: [retainSearchParams([SHOW_BALANCES_PARAM])] }`, plus (if the revert hasn't removed it yet) the entry rule on `cause === "enter"`.
- `hasFilters` in `src/modules/movements/search.ts` counts only the Movements filter keys (`FILTER_KEYS`), with a test that `show_balances` alone isn't a filter.
- `src/modules/dashboard/BalanceHistoryCard.tsx` has a doc comment saying `show_balances` is kept by the route.
- No call site in Dashboard, Assets or Movements passes `show_balances` by hand; retention was entirely the middleware's job.
- Zustand (`^5.0.16`) is a dependency, but **no store exists in `src/` yet**. This change creates the first one, so it sets the convention (see D17).
- `src/modules/shared/i18n.ts` keeps `billetera.language` in `localStorage` with every read and write in try/catch. This change follows that pattern.
- Vitest runs in Node (App Foundation D6). Node has `EventTarget` and `Event`, but no `StorageEvent` and no usable `window.localStorage` to rely on.

## Definitions

- **Sensitive value:** a USD value or a coin quantity that belongs to the user: a balance, a holding, a movement's amount or USD value, a fee, a counter amount, a spending total, a chart's value axis or tooltip value.
- **Not sensitive:** percentages (change and share of total), counts ("3 need a label", "N movements not priced"), market prices per coin (`usd_price`, `unit_price`), dates, coin codes, category names, reasons, counterparties, and status words such as "No price", "Pricing" and "—".
- **Mask:** the text `••••` (four U+2022 bullets), the same in every language.
- **Saved choice:** the value of `localStorage` key `billetera.showBalances`. Only the exact text `"true"` means shown.

## Decisions

| # | Decision | Why |
|---|----------|-----|
| D5 | The toggle is an icon button in the app chrome: in the mobile header next to the burger, and in the navbar's brand row on wide screens. One component, rendered in both places, with only one visible at a time | It must be reachable on every private page, and on mobile without opening the menu |
| D6 | Absolute values are masked; relative ones are not. Percentages, proportions (the spending bar), chart line shapes, counts and per-coin prices stay visible | These don't reveal how much the user has. Hiding them too would leave the pages unreadable. See Open Questions 2 and 3 |
| D7 | CSV export is unchanged and always holds real values | Export is an explicit action that produces a file for the user. The mask is about the screen |
| D8 | Masking happens at render time only. Query keys, requests and cached data don't change, so toggling never refetches | Fast, and nothing about the API depends on it |
| D14 | **Logging out keeps the saved choice** (user's decision). `useLogout` doesn't touch `billetera.showBalances` or the store | It's a per-browser preference, like the language. Accepted trade-off: on a shared computer, the next person to log in on that browser starts with balances shown if the previous user left them shown |
| D15 | **The setting is not in the URL.** No search param, no route `validateSearch`, no search middleware, no redirect reads or writes it | Browser history keeps a snapshot of every URL, so Back and Forward could restore an older "shown" state after the user hid balances. With nothing in the URL, history can't change the setting |
| D16 | One global show/hide state per browser, initialised from `localStorage` `billetera.showBalances`: exactly `"true"` is shown; missing, `"false"`, any other text, no storage, or an exception is hidden | Hidden is the safe default, and a stray value can't reveal anything. Same key prefix as `billetera.language` |
| D17 | The state is held in a Zustand vanilla store (`createStore` from `zustand/vanilla`) in `src/modules/shared/balancesStore.ts`, built by a factory that takes the storage getter, with one app-wide instance. Components read it through `useStore` in `useBalancesHidden()` | First store in the repo, so this sets the convention: vanilla store plus a hook, so the store and its storage logic are testable in Node without React. Keeping `useBalancesHidden()`'s signature means `Sensitive`, `SpendingCard` and `BalanceChart` need no change |
| D18 | The toggle flips the store and saves the new value (`"true"` or `"false"`). Every page updates at once. No navigation, no URL change, no history entry, no API request | What the user asked for. Writing `"false"` records a decision, though it reads the same as nothing saved |
| D19 | Every `localStorage` access is in try/catch, with the access to `localStorage` itself inside the try. Blocked or throwing storage reads as hidden; a failed write is ignored and the in-memory state still changes | Same pattern as `i18n.ts`. Some browsers throw `SecurityError` on merely reading `window.localStorage`. The toggle must keep working in the session even when nothing can be saved |
| D20 | Tabs stay in sync through the `storage` event: when another tab writes `billetera.showBalances`, this tab's store takes the new value; when another tab clears storage (`key === null`), this tab goes hidden. A page restored from the back/forward cache (`pageshow` with `persisted`) re-reads storage | The `storage` event is the browser's own cross-tab channel and costs a few lines. Without it, two open tabs could disagree, and a tab left shown would stay shown after the user hid balances elsewhere. A bfcached page misses `storage` events while frozen |
| D21 | A stale `show_balances` param in an old bookmark or history entry is left **inert**: nothing reads it, nothing strips it, and it's dropped by the first navigation that doesn't carry the previous search | Stripping it would need a redirect in `beforeLoad`, the very machinery being removed. Being ignored, it can't reveal anything |
| D22 | `hasFilters` keeps counting only `FILTER_KEYS`. It isn't dead code: it's the correct definition of "a filter is set", and it keeps "Clear all" hidden if any non-filter key (such as a stale `show_balances` or a future parent param) reaches the route's search. Only its comment and test wording change | Counting known keys is more robust than counting all keys, regardless of this feature |

### Superseded decisions

| # | Was | Superseded by |
|---|-----|---------------|
| D1 | The param is `show_balances`; only `true` shows | D15, D16 (the "only exact `true` shows" rule moves to the stored value) |
| D2 | `show_balances` declared on `/_app` and retained with `retainSearchParams` | D15 |
| D3 | Hiding removes the param rather than writing `false` | D15, D18 |
| D4 | The toggle replaces the history entry and keeps the scroll position | D18 (no navigation at all, so neither applies) |
| D9 | Entering the app applies the saved choice, never the URL's param | D15, D16 (there is no param to reconcile) |
| D10 | The entry rule lives in `/_app`'s `beforeLoad` | D15 (no entry rule) |
| D11 | Inside the app the URL is the source of truth; no `storage` listener | D17, D20 (the store is the source of truth, and tabs sync) |
| D12 | A link can't force balances visible on another device | D15 (still true, now trivially: links carry no setting) |
| D13 | The toggle saves to storage, then navigates | D18, D19 |

## Requirements

### Removed: the URL mechanism

- `src/routes/_app.tsx`: remove `validateSearch: parseBalancesSearch`, `search: { middlewares: [retainSearchParams([SHOW_BALANCES_PARAM])] }`, the `cause` argument and the entry rule (if still present). `beforeLoad` goes back to the session and Binance key checks only. Imports shrink to `createFileRoute` and `redirect`.
- `src/modules/shared/privacy.ts`: remove `SHOW_BALANCES_PARAM`, `BalancesSearch`, `parseBalancesSearch`, `balancesShown`, `withBalancesShown` and `balancesEntrySearch`. Keep `MASK` and `maskText`. Update the file's header comment (no longer "lives in the URL").
- `src/modules/shared/components/BalancesToggle.tsx`: no `useNavigate`, no `withBalancesShown`.
- `src/modules/dashboard/BalanceHistoryCard.tsx`: its doc comment stops mentioning `show_balances`. No code change there.
- `src/modules/movements/search.ts`: `FILTER_KEYS` and `hasFilters` stay (D22); their comments say "params that aren't filters" without naming `show_balances`.
- No other call site changes: none passes `show_balances` by hand.
- A URL with `?show_balances=...` is harmless (D21): it doesn't affect the setting, and no code reads it.

### Storage helpers

In `src/modules/shared/privacy.ts` (pure, no React, no Zustand). If the revert removed them, add them back as described here; if they're present, keep them.

- `BALANCES_STORAGE_KEY = "billetera.showBalances"`.
- `type BalancesStorage = Pick<Storage, "getItem" | "setItem">`.
- `loadBalancesShown(getStorage: () => BalancesStorage | undefined = () => globalThis.localStorage): boolean` returns `true` only when the stored value is exactly `"true"`. No storage, `null`, `"false"`, any other text, or any exception (from the getter or from `getItem`) returns `false`.
- `saveBalancesShown(shown: boolean, getStorage = same default): void` writes `"true"` or `"false"`. It swallows any exception.
- `shownFromStorageEvent(event: { key: string | null; newValue: string | null }): boolean | undefined`:
  - `key === BALANCES_STORAGE_KEY`: returns `newValue === "true"` (so a removal, `null`, is hidden).
  - `key === null` (another tab called `localStorage.clear()`): returns `false`.
  - Any other key: returns `undefined`, meaning "ignore".

### Store

`src/modules/shared/balancesStore.ts` (new):

- `type BalancesState = { shown: boolean; toggle: () => void }`.
- `createBalancesStore(getStorage?: () => BalancesStorage | undefined)` returns a Zustand vanilla store (`createStore<BalancesState>()`):
  - Initial `shown` is `loadBalancesShown(getStorage)`.
  - `toggle()` computes `next = !get().shown`, calls `saveBalancesShown(next, getStorage)`, then `set({ shown: next })`. The state changes even if the save fails (D19).
- `connectBalancesSync(store, target: Pick<EventTarget, "addEventListener" | "removeEventListener">, getStorage?)` returns an unsubscribe function. It listens on `target` for:
  - `"storage"`: `shownFromStorageEvent(event)`; when it's not `undefined` and differs from the current state, `set({ shown })`. It never writes to storage (no echo loop; the `storage` event doesn't fire in the tab that wrote, either).
  - `"pageshow"`: when `event.persisted` is true, `set({ shown: loadBalancesShown(getStorage) })`.
- `balancesStore`: the app's one instance, `createBalancesStore()` with the default getter. At module load, when `typeof window !== "undefined"`, it calls `connectBalancesSync(balancesStore, window)` once. Never unsubscribed (lives for the page).
- The module must be safe to import in Node: the default getter is reached inside the try of `loadBalancesShown`, and the listener is guarded by the `window` check.
- `useLogout` and `session.ts` don't import the store (D14).

### Reading the state

- `useBalancesHidden(): boolean` in `src/modules/shared/usePrivacy.ts` keeps its name and signature, and becomes `useStore(balancesStore, (state) => !state.shown)` (`useStore` from `zustand`). It no longer depends on the router, so it works outside `/_app` too; nothing outside `/_app` renders sensitive values, so that's moot.
- `Sensitive` in `src/modules/shared/components/Sensitive.tsx` is unchanged: when hidden it renders `<span aria-hidden="true">••••</span>` plus Mantine `VisuallyHidden` text `privacy.hidden` ("Hidden"); when shown, its children as they are. No wrapper that changes layout.
- Where the value is a plain string (an `aria-label`, an interpolated translation, a chart tick or tooltip), the call site uses `maskText` with `useBalancesHidden()`, as built. In text read aloud the hidden value is `t("privacy.hidden")`, not the bullets.
- `BalanceChart.tsx` and `SpendingCard.tsx` don't change for this phase; they keep calling `useBalancesHidden()`.

### Toggle

- `BalancesToggle` in `src/modules/shared/components/BalancesToggle.tsx`: a Mantine `ActionIcon`, `variant="subtle"`, `size={44}`, `radius="xl"`.
- Icon: `IconEyeOff` while hidden, `IconEye` while shown, `aria-hidden` on the icon.
- Accessible name `t("privacy.toggle")`, "Show balances", which doesn't change. `aria-pressed` is `true` while shown. A Mantine `Tooltip` with the same text.
- Reads `shown` with `useStore(balancesStore, (s) => s.shown)` (or `!useBalancesHidden()`). Click: `balancesStore.getState().toggle()`. Nothing else.
- Doc comment rewritten: the choice is saved in the browser and held in the store; toggling doesn't touch the URL or history.
- Placement in `AppLayout` unchanged: below `sm` in the header between the brand and the burger; from `sm` in the navbar's brand row; `hiddenFrom="sm"` / `visibleFrom="sm"`, so only one is in the accessibility tree. Both copies read the same store, so they always agree.
- Not on `/login`, `/register`, `/connect` or `/` (landing).

### What gets masked

Unchanged from Phases 1 to 3.

| View | Masked | Stays visible |
|------|--------|---------------|
| Dashboard, Balance card | Total, the USD change | The change percent, "Updated" time, the unpriced note |
| Dashboard, balance chart | Value-axis labels read `••••`; tooltip value `••••` | The line, gridlines and date labels |
| Dashboard, Spending | Each category's total, the total in the summary text and in the bar's `aria-label` | Category names, the bar's proportions, the "not priced" count |
| Dashboard, Holdings | Amount and USD value | Coin codes, order, "No price" |
| Dashboard, label cards | Amount and USD value | Kind, date, counterparty, categories, the reason field |
| Dashboard, Recent movements | USD value or coin amount, with its sign | Title, date, category, "No price", "Pricing" |
| Movements, table and cards (`MovementParts`) | Amount and USD value, with the sign | Everything else |
| Movements, drawer | Amount, USD value, counter amount, fee amount, fee USD value | `usd_price`, `unit_price`, coins, dates, IDs, reason, category |
| Categories | Each category's total | Names, counts |
| Assets, summary | Total, Spot and Funding values | Snapshot time |
| Assets, coin list | Amount, USD value | Share of total (percent), coin codes, order |
| Assets, coin detail | Total amount and value, the per-wallet split, free, locked and frozen | Coin code, wallet names |
| Every `BalanceChart` (Assets history, coin value and amount, the Dashboard chart) | Value-axis tick labels read `••••`; the tooltip shows the time and `••••` | The line, gaps and their "No price" shading, the time axis |

- The value axis keeps its width while masked, so the plot doesn't move. (The chart's axis logic is being changed separately; this spec only requires that masking doesn't change the axis width.)
- Row and card heights don't change when toggling: the mask sits in the same text element, with the same font size and line height. Widths may change.
- A null value keeps showing what it shows today ("—", "No price", "Pricing").

### Not affected

- CSV export (D7). The export button and its request are unchanged.
- Category names, reasons and counterparties (Open Question 1).
- The landing page, login, register, connect and settings. None shows a balance.
- Logout (D14).
- Toasts. None carries an amount today; any later one that does should use `maskText`.

### Translations

Unchanged. No new keys.

| Key | en | es |
|-----|----|----|
| `privacy.toggle` | Show balances | Mostrar saldos |
| `privacy.hidden` | Hidden | Oculto |

### Tests

Vitest in Node, no DOM, no React rendering (App Foundation D6). An in-memory fake storage (`Map`-backed `getItem`/`setItem`) and a throwing getter stand in for `localStorage`.

- `src/modules/shared/privacy.test.ts`:
  - Remove the `parseBalancesSearch`, `balancesShown`, `withBalancesShown` and `balancesEntrySearch` suites, and the `parseSearch`/`stringifySearch` import if nothing else uses it.
  - Keep `maskText` in both states and `MASK === "••••"`.
  - `loadBalancesShown`: `"true"` gives true; nothing saved, `"false"`, `""`, `"TRUE"`, `"1"`, `" true"`, `"yes"` give false; a getter returning `undefined` gives false; a throwing getter gives false; a throwing `getItem` gives false; the key is `billetera.showBalances`.
  - `saveBalancesShown`: `true` then `false` write `"true"` then `"false"` under the key and each reads back; a throwing getter and a throwing `setItem` don't throw.
  - `shownFromStorageEvent`: our key with `"true"` gives true; with `"false"`, `null` or garbage gives false; `key: null` gives false; another key (`billetera.language`) gives `undefined`.
- `src/modules/shared/balancesStore.test.ts` (new):
  - Init: missing, `"true"`, `"false"`, garbage, and a throwing getter give `shown` false, true, false, false, false.
  - `toggle()` from hidden sets `shown` true and writes `"true"`; again sets false and writes `"false"`; a new store on the same fake storage starts with the last value (persistence across reload).
  - `toggle()` with a throwing getter or a throwing `setItem` still flips `shown` and doesn't throw.
  - Sync, with an `EventTarget` and `Object.assign(new Event("storage"), { key, newValue })`: our key `"true"` sets shown; `"false"` hides; `key: null` hides; another key changes nothing; after the unsubscribe function runs, events change nothing. A `"pageshow"` event with `persisted: true` re-reads storage; with `persisted: false` it doesn't. A storage event doesn't call `setItem`.
- `src/modules/movements/search.test.ts`: keep the `hasFilters` cases, reworded as "a key that isn't a filter (for example a stale `show_balances`) doesn't count" (D22).

The toggle, masking, cross-tab sync and history behaviour are checked in the browser (see the plan).

## Acceptance Criteria

- **Given** a browser with nothing saved, **when** a logged-in user opens `/dashboard`, **then** every sensitive value shows `••••` and the toggle has `aria-pressed="false"`.
- **Given** balances are hidden, **when** the user clicks the toggle, **then** real values appear on the page at once, `billetera.showBalances` is `"true"`, the URL is unchanged, `history.length` is unchanged, the scroll position stays, and no API request is sent.
- **Given** balances are shown, **when** the user clicks the toggle, **then** values are masked, `billetera.showBalances` is `"false"`, and the URL and history are unchanged.
- **Given** balances are shown, **when** the user moves through the nav, the Holdings and Recent movements links, "See older", "Review all", a coin row, Movements filter changes and "Clear all", **then** values stay shown on every page and no URL contains `show_balances`.
- **Given** the user showed balances, **when** they reload, open `/dashboard` in a new tab, or open a bookmark, **then** values are shown. **Given** they hid them or never toggled, **then** values are hidden.
- **Given** saved `"true"`, **when** the user logs out and logs in again, **then** values are shown and `billetera.showBalances` is still `"true"`. **Given** saved `"false"` or nothing, **then** values are hidden.
- **Given** the user showed balances on Dashboard, went to Movements and hid them there, **when** they press Back (and then Forward), **then** Dashboard (and Movements) are still hidden. **And given** they hid balances and then go Back to any earlier entry, including one from before Phase 4 whose URL has `show_balances=true`, **then** values stay hidden.
- **Given** a URL with `?show_balances=true`, `=false`, `=1` or `=yes`, **then** the setting is whatever the saved choice says, and no error occurs.
- **Given** two tabs in the app, **when** tab B toggles, **then** tab A shows the same state without a reload, and tab A's URL doesn't change.
- **Given** another tab runs `localStorage.clear()`, **then** this tab goes hidden.
- **Given** `localStorage` is blocked or throws, **when** the user opens the app, toggles, moves around and reloads, **then** nothing crashes and no uncaught error is logged; the app starts hidden, the toggle shows and hides within the session, and after a reload values are hidden again.
- **Given** balances are hidden, **when** the user exports CSV, **then** the file holds the real amounts and values.
- **Given** balances are hidden on any `BalanceChart`, **when** the pointer is over a point, **then** the tooltip shows the time and `••••`, the value axis shows `••••` labels, and the line is drawn.
- **Given** a 375px screen, **then** the toggle is in the header next to the burger, visible without opening the menu, with a 44px target.
- **Given** a screen reader, **then** the toggle reads as "Show balances", toggle button, pressed or not pressed, and a masked value reads as "Hidden".
- **Given** Spanish, **then** the toggle reads "Mostrar saldos" and masked values read "Oculto".
- **Given** any page, **when** the user toggles, **then** card and row heights don't change.
- **Given** balances are hidden, **then** percentages, counts, coin prices, dates, category names and reasons are still shown.
- **Given** the toggle is used, **then** the active nav item is still highlighted.
- **Given** Movements with no filters, **then** "Clear all" isn't shown, even with a stale `?show_balances=true` in the URL.

## Out of Scope

- Any URL form of the setting, including **shareable or bookmarkable "shown" links**: they're gone by design (D15). A link can never show or hide balances.
- Stripping a stale `show_balances` from old URLs (D21).
- Storing the choice on the server or per account; clearing it on logout (D14).
- A keyboard shortcut, hiding automatically after idle time, a blur effect instead of a mask.
- Masking the CSV, names, reasons, counterparties, or the document title.
- Changes to the chart's axis logic in `src/modules/shared/chart.ts` and `BalanceChart.tsx` (separate work).

## Open Questions

1. Should hidden mode also cover category names, reasons and counterparties? **Recommendation: no.** They don't reveal amounts, and labelling would become impossible while hidden. A counterparty can be a P2P nickname or an address, so this may matter to the user.
2. Should percentages stay visible: the balance change percent and the coin list's share of total? **Recommendation: yes** (D6). Change percent with no base reveals no amount; the share reveals composition, not size.
3. Should per-coin prices in the Movements drawer (`usd_price`, P2P `unit_price`) stay visible? **Recommendation: yes.** They're market prices, not the user's money.
4. Cross-tab sync (D20) is included on the caller's recommendation. Confirm it's wanted: with it, hiding in one tab hides every open tab at once, and showing in one tab shows every open tab at once (including a tab someone else may be looking at). **Recommendation: keep it.**
5. Stale `?show_balances=...` (D21) is left inert rather than stripped. Confirm that seeing `show_balances=true` in an old URL while values are hidden is acceptable. **Recommendation: yes;** stripping needs a redirect for a cosmetic gain.

Resolved and removed: the former Open Question 4 (Back and Forward revealing balances inside the app) and Open Question 5 (a reload with storage blocked hiding a shown page). Neither applies once the URL holds no setting: history can't change it, and blocked storage always starts hidden.
