---
title: Sync Cooldown
spec_type: tech
type: feature
status: draft
domain: Portfolio
issue: none
created: 2026-11-15
updated: 2026-11-15
sdd_version: 7.3.0
---

# Sync Cooldown

## Problem

The backend now limits manual syncs per user ([`../backend/specs/2026-11-15-sync-cooldown/SPEC.md`](../../../backend/specs/2026-11-15-sync-cooldown/SPEC.md)). Within the cooldown (60 s by default), `POST /binance/sync` and `POST /binance/movements/sync` answer **429** with `{"error": "sync cooldown", "retry_after": N}` and a `Retry-After: N` header. Each route has its own cooldown, started when the request is admitted, so the button's two parallel requests never block each other.

Today the Sync button (`src/modules/dashboard/SyncNow.tsx`, through `useSyncBinanceData` in `src/modules/binance/hooks.ts`) would show a 429 as `errors.generic`. The user should instead see the button disabled with a countdown, and the button should be disabled for the cooldown right after a sync too, so the user doesn't click into a 429.

Depends on the backend change being built and `pnpm api:generate` run.

### Current state

- `useSyncBinanceData` posts both routes with `Promise.allSettled` and throws `syncFailure(results)` (`src/modules/binance/sync.ts`): the first failure that isn't `errors.syncInProgress`, else the first failure. It invalidates every query on settle, and the session on error.
- `SyncNow` renders one `Button`, an info `Alert` for `errors.syncInProgress`, and a red error line for anything else. It's used in `BalanceCard` (twice), `AssetSummary`, `NoSnapshot` and `MovementsPage`. Each instance has its own mutation.
- `ConnectPage` runs the same mutation once after saving a key, then navigates to `/dashboard` whatever the result.
- `api-errors.ts` maps backend texts to keys. `scripts/fake-api.mjs` fakes both sync routes.
- Pure logic has Vitest tests; there are no component tests.

## Behaviour

**B1. Error mapping.** `api-errors.ts` maps `"sync cooldown"` to `errors.syncCooldown`.

**B2. Reading the wait.** A pure `retryAfterSeconds(error): number | undefined` in `src/modules/binance/sync.ts`: for an axios error with status 429, the body's `retry_after` when it's an integer ≥ 1, else the `Retry-After` header when it parses as an integer ≥ 1, else `undefined`. Anything else is `undefined`.

**B3. Outcome of a click.** A pure `syncCooldownSeconds(results): number | undefined` next to `syncFailure`:
- Any result is a 429 `sync cooldown`: the largest `retryAfterSeconds` among them, or `DEFAULT_SYNC_COOLDOWN_SECONDS` (60) when none has a value.
- Otherwise, any result is fulfilled or is a 502: `DEFAULT_SYNC_COOLDOWN_SECONDS`. These are the cases where the server kept its cooldown.
- Otherwise (409, 401, 403, 500, network error): `undefined`. The server gives its cooldown back on 409 and on the credential 500s, and a network error may not have reached it. If the server did start one, the next click gets a 429 and B5 takes over.

`syncFailure` changes its precedence to: a real failure, then a cooldown, then already-running. A 429 `sync cooldown` is not a real failure. So a 502 next to a 429 reports the 502, and a 429 next to a 409 reports the 429.

**B4. Shared cooldown state.** A vanilla Zustand store in `src/modules/binance/syncCooldown.ts`, like `balancesStore.ts`: `{ until: number | null; start(seconds, now); reset() }`. `start` keeps the later of the current and the new `until`. One store per tab, in memory only: a reload clears it, and the server answers the next click with a 429 if a cooldown is still on. A pure `remainingSeconds(until, now) = max(0, ceil((until − now) / 1000))`.

`useSyncBinanceData` calls `start(syncCooldownSeconds(results), Date.now())` once both requests settle, before it throws, when the value isn't `undefined`. Because the store is shared, every `SyncNow` on the page (and the one on the next page) shows the same state. `useLogout` calls `reset()` on success, so the next user on the browser doesn't inherit a countdown.

**B5. Button during the cooldown.** A hook `useSyncCooldown()` returns the remaining seconds, re-rendering once a second only while it's above 0. In `SyncNow`, while it's above 0:
- The `Button` is `disabled` and keeps its label. On the accent card it stays readable (the disabled style must keep contrast with the card).
- Under it, a line: `dashboard.sync.cooldown` with `count` = remaining seconds. Dimmed on a normal card, `INK_ON_ACCENT` on the accent card. The button gets `aria-describedby` pointing at it. The line isn't a live region, so screen readers aren't told every second.
- A `sync cooldown` error is never shown as an error line or alert (the countdown is the message). When the countdown reaches 0, the line disappears and the button enables. The mutation's error state from a 429 doesn't bring back any message.
- A real failure from the same click (for example a 502 on one route) still shows its red error line, above the countdown line.
- The `errors.syncInProgress` alert shows as today. If the same click also set a cooldown, both show.

**B6. While a sync runs.** Unchanged: `loading` on the button that was clicked. The other `SyncNow` instances aren't disabled by a running sync (unchanged), only by the cooldown.

**B7. Connect page.** Unchanged code path. After saving a key, the first sync starts the cooldown, so the dashboard's button shows the countdown on arrival. A 429 there (key saved twice within a minute) still navigates, as any failure does.

**B8. Texts.**

| Key | en | es |
|-----|----|----|
| `errors.syncCooldown` | `Too many syncs. Wait a moment and try again.` | `Demasiadas sincronizaciones. Espera un momento e inténtalo de nuevo.` |
| `dashboard.sync.cooldown_one` | `You can sync again in {{count}} second.` | `Podrás sincronizar de nuevo en {{count}} segundo.` |
| `dashboard.sync.cooldown_other` | `You can sync again in {{count}} seconds.` | `Podrás sincronizar de nuevo en {{count}} segundos.` |

`errors.syncCooldown` is only the fallback where a 429 is shown through `getApiErrorKey` outside `SyncNow` (for example a toast); `SyncNow` uses the countdown.

**B9. Fake API.** `scripts/fake-api.mjs` gets a flag `{"syncCooldown": <seconds>}`, default `0` (off, so existing manual flows aren't throttled). When it's above 0, each sync route keeps a per-user cooldown with the backend's rules (start at admission, kept on success and 502, given back on 409) and answers 429 with the body and header above. `GET /__fake/state` shows the flag. The comment block at the top documents it.

## API

No new call. Uses the 429 of `POST /binance/sync` and `POST /binance/movements/sync`. Types come from `pnpm api:generate` (`binance.CooldownErrorResponse`).

## Acceptance Criteria

- **AC1:** Given a sync that succeeds on both routes, when it settles, then every Sync button on the page is disabled and shows "You can sync again in 60 seconds.", counting down; at 0 the line goes and the buttons enable.
- **AC2:** Given the server answers 429 with `retry_after: 42` on both routes, when the user clicks Sync, then no red error shows, and the countdown starts at 42.
- **AC3:** Given one route answers 201 and the other 429 with `retry_after: 1`, then the countdown shows 60: the route that succeeded just started its own cooldown, and the button fires both.
- **AC4:** Given one route answers 502 and the other 429, then the red `errors.binanceFailed` line shows and the countdown runs.
- **AC5:** Given both routes answer 409 `binance credentials not set`, then the red error shows and no countdown starts.
- **AC6:** Given a countdown in Spanish with 1 second left, then the line reads "Podrás sincronizar de nuevo en 1 segundo."
- **AC7:** Given a countdown on the dashboard, when the user goes to Movements, then its Sync button shows the same remaining time.
- **AC8:** Given a countdown, when the user logs out and logs in again, then no countdown shows.
- **AC9:** Given a 429 with no `retry_after` and no header, then the countdown starts at 60.

## Unit tests

| File | Cases |
|------|-------|
| `src/modules/binance/sync.test.ts` | `retryAfterSeconds`: body value; header fallback; body `0`, negative, non-integer or string falls back to the header; neither → `undefined`; a 409 or a network error → `undefined`. `syncCooldownSeconds`: both fulfilled → 60; 429 + 429 → the larger; 429 + fulfilled → 60 when 429 is smaller, the 429 when larger; 502 + 409 → 60; 409 + 409 → `undefined`; network + network → `undefined`; 429 without a value → 60. `syncFailure`: 502 + 429 → the 502; 429 + 409 → the 429; 429 + fulfilled → the 429 (existing cases unchanged). |
| `src/modules/binance/syncCooldown.test.ts` | `remainingSeconds`: past → 0, 200 ms → 1, exactly 60 s → 60. Store: `start` sets `until`; a shorter `start` doesn't shorten it; `reset` clears it. |

Manual checks against the fake API (`{"syncCooldown": 60}`): AC1, AC2, AC4, AC6, AC7, AC8, on the dashboard's normal and accent cards, at 375 px and desktop, in light and dark themes.

## Decisions

| ID | Decision | Rejected |
|----|----------|----------|
| D1 | Separate frontend spec in this repo, linked from the backend one | One combined spec in the backend repo: the frontend's INDEX and review flow would lose track of it |
| D2 | Assume 60 s after a success; trust `retry_after` after a 429 | Ask the backend for `cooldown_seconds` in success bodies (backend Q3) |
| D3 | One store per tab, in memory | `localStorage`: the server is the source of truth, and a stale countdown after a reload is worse than one 429 |
| D4 | The countdown line isn't a live region | A live region announcing every second |

## Follow-up

2026-11-15: the disabled button now reads as inactive on both cards. On the lime card a translucent dark wash (`rgba(15, 42, 38, 0.18)`) carries dark ink at 80% opacity (5.5:1); on a dark card `dark-4` carries `dark-0` text (4.9:1). Both keep `cursor: not-allowed`, which Mantine's disabled button doesn't suppress because it leaves pointer events alone.

## Open Questions

None. Backend Q1 to Q3 don't change this spec's behaviour.
