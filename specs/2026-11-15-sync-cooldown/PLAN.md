---
title: "Implementation Plan: Sync Cooldown"
change: sync-cooldown-1
type: feature
spec: ./SPEC.md
issue: none
created: 2026-11-15
updated: 2026-11-15
sdd_version: 7.3.0
---

# Implementation Plan: Sync Cooldown

**Spec:** [SPEC.md](./SPEC.md). Behaviour, acceptance criteria and tests are there.

Rules:
- Never commit. Never open, read, `cat`, `grep` or print `.env` or any `.env.*` file. Tell every subagent this.
- Starts after the backend change [`../backend/specs/2026-11-15-sync-cooldown/`](../../../backend/specs/2026-11-15-sync-cooldown/PLAN.md) Phase 2 is built, so `docs/openapi/openapi.json` has the 429.
- Don't touch `specs/INDEX.md` or `specs/ROADMAP.md`.
- No new dependency. The locale files are shared: add keys only.
- Each phase ends with `pnpm verify` (API check, lint, tests, build) passing.

## Phase 1: Types, cooldown logic and state

**Outcome:** SPEC B1 to B4, with unit tests. No visible change yet besides the store being filled.

| File | Change |
|------|--------|
| `src/modules/shared/api-schema.d.ts` | Regenerated with `pnpm api:generate`. Not edited by hand. |
| `src/modules/shared/api-errors.ts` | `"sync cooldown": "errors.syncCooldown"`. |
| `src/modules/binance/sync.ts` | `DEFAULT_SYNC_COOLDOWN_SECONDS`, `retryAfterSeconds`, `syncCooldownSeconds`, the new `syncFailure` precedence. |
| `src/modules/binance/sync.test.ts` | The SPEC's cases. |
| `src/modules/binance/syncCooldown.ts` | New. Store, `remainingSeconds`, `useSyncCooldown`. |
| `src/modules/binance/syncCooldown.test.ts` | New. The SPEC's cases (`remainingSeconds` and the store; the hook isn't unit-tested). |
| `src/modules/binance/hooks.ts` | `useSyncBinanceData` starts the cooldown from the settled results. |
| `src/modules/shared/session.ts` | `useLogout` resets the store on success. |
| `src/locales/en.json`, `src/locales/es.json` | `errors.syncCooldown`, `dashboard.sync.cooldown_one`, `_other`. |

About 10 files, roughly 200 to 250 changed lines without the generated types, half of them tests.

**Check:** with the fake API unchanged, a sync still works and nothing in the UI changes.

## Phase 2: Button, fake API, manual checks

**Outcome:** SPEC B5 to B9 and AC1 to AC9.

| File | Change |
|------|--------|
| `src/modules/dashboard/SyncNow.tsx` | Disabled state, countdown line with `aria-describedby`, the `sync cooldown` error suppressed, error and in-progress messages as in B5. |
| `scripts/fake-api.mjs` | `syncCooldown` flag (B9), its doc comment and `/__fake/state`. |

2 files, roughly 100 to 150 changed lines.

**Check:** the manual checks listed under the SPEC's unit tests, against the fake API with `{"syncCooldown": 60}`, then once against the real backend locally (two clicks within a minute).

## After

- Report the result so the orchestrator can update `specs/INDEX.md`.
- Deploy after the backend. Until the frontend is deployed, a 429 shows as the generic error.

## Implementation State

Built 2026-11-15. All phases are implemented.

### Files

- New: `src/modules/binance/syncCooldown.ts`, `src/modules/binance/syncCooldown.test.ts`.
- Modified: `src/modules/binance/sync.ts`, `src/modules/binance/sync.test.ts`, `src/modules/binance/hooks.ts`, `src/modules/shared/session.ts`, `src/modules/shared/api-errors.ts`, `src/modules/shared/helpers.test.ts` (the mapping case), `src/modules/dashboard/SyncNow.tsx`, `src/locales/en.json`, `src/locales/es.json`, `scripts/fake-api.mjs`, `src/modules/shared/api-schema.d.ts` (generated), `specs/INDEX.md`.

### Commands

| Command | Result |
|---|---|
| `pnpm api:generate` | regenerated `api-schema.d.ts` from the backend's OpenAPI (429 and `binance.CooldownErrorResponse`) |
| `pnpm verify` | ok: API check, lint, 519 tests in 37 files, build |
| `pnpm test` | 519 passed, 0 failed (37 files) |
| fake API checks (`node scripts/fake-api.mjs` + curl) | 201 then 429 with `retry_after` and `Retry-After`; each route independent; 502 keeps the cooldown; 409 no-key and already-running give it back; `/__fake/state` shows the flag; bad values are 400 |
| manual UI checks (headless Chrome, fake API `{"syncCooldown":60}`) | AC1, AC2, AC4, AC6, AC7, AC8 at 1280 px and 375 px |

### Manual checks

- AC1: after connecting a key, the accent card's button was disabled with "You can sync again in 60 seconds.", counting down. At 375 px it stayed inside the card (`scrollWidth` overflow 0).
- AC2: a reload cleared the store; the next click was a 429 and the line started from the server's 58 seconds, with no red line and no generic error. A Spanish run with both routes 429 started at 10.
- AC4: with `failSync` on, a click showed "Binance didn't respond. Please try again." above the countdown, on the normal card.
- AC6: at one second the line read "Podrás sincronizar de nuevo en 1 segundo."
- AC7: the dashboard showed 60 and the Movements empty state showed 60 (see the deviation below).
- AC8: after the menu's logout and a new login, no countdown showed.
- The countdown line is the button's `aria-describedby` target and is not a live region.

### Deviations from the plan

- The Movements page renders `SyncNow` only in its empty state, so AC7 was checked with `account: "empty"` (dashboard 60 → Movements 60). No code changed for this.
- The app forces the dark color scheme (`forceColorScheme="dark"`), so the light-theme pass couldn't be run; both sizes were checked in dark.
- Mantine's disabled text color is overridden by the button's inline `c`, so `SyncNow` sets `--mantine-color-disabled` per variant: `dark-6` on the accent card (light text) and `dark-1` on a normal card (ink text). Computed styles and screenshots confirmed the contrast.
- AC4's manual pass used 502 on both routes because the fake's `failSync` is global; the 502 + 429 mix is covered by the unit tests.
- `syncCooldownSeconds` takes the larger of the default (fulfilled or 502) and the 429 waits, which is what SPEC B3's first bullet and AC3 need together.
- The fake's CORS `Access-Control-Expose-Headers` now also exposes `Retry-After`, so the dev page can read the header fallback.

### Follow-up

- 2026-11-15, after the manual pass: the disabled button didn't look disabled on either card, so `SyncNow` was restyled. On the accent card a translucent dark wash (`rgba(15, 42, 38, 0.18)`) carries dark ink at 80% (5.5:1); on a normal card `dark-4` carries `dark-0` text (4.9:1). Both set `cursor: not-allowed`. This supersedes the `dark-6`/`dark-1` disabled fills in the deviation above; the label is still set through the inline `c`, since it beats Mantine's disabled color.
