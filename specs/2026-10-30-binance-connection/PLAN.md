---
title: "Implementation Plan: Binance Connection"
change: binance-connection-1
type: feature
spec: ./SPEC.md
issue: none
created: 2026-10-30
sdd_version: 7.3.0
---

# Implementation Plan: Binance Connection

**Spec:** [SPEC.md](./SPEC.md)

Same phase rules as [App Foundation](../2026-10-30-app-foundation/PLAN.md). Never paste a real Binance key into code, logs or test fixtures.

## Phase 1: Connect

Deliverables: credentials hooks, the key form, `/connect`, the redirect for users with no key, the first-sync state.

Files: `src/modules/binance/{hooks.ts,CredentialsForm.tsx}`, `src/routes/connect.tsx`, `src/routes/_app.tsx`, `src/locales/*`.

Checks: the connect criteria, with error answers tested using invalid keys. A real key is only used if the user provides one.

## Phase 2: Settings

Deliverables: `/settings`, replace and remove modals, logout, the rejected-key banner.

Files: `src/routes/_app/settings.tsx`, `src/modules/binance/{ConnectionCard,RejectedKeyBanner}.tsx`, `src/modules/shared/components/AppLayout.tsx`, `src/locales/*`.

Checks: the remaining criteria. Screenshots at 1440px and 375px.

## Implementation State

Phases 1 and 2 are built, with the fake API in `scripts/fake-api.mjs` (`pnpm fake-api`). Nothing is committed. The Dashboard change is not started. *(Out of date: the Dashboard is built and everything is committed; see "Later changes" at the end. [Review Fixes](../2026-11-09-review-fixes/SPEC.md) adds the backend's 16-to-128 character check to the key form and changes the fake's test keys.)*

**Verified:**
- `pnpm lint` exits 0 with no warnings. `pnpm build` (`tsc -b && vite build`) exits 0. `pnpm test` passes 17 of 17.
- Headless Chrome (puppeteer-core) against the fake API on port 8099 and Vite on port 5173: 114 of 114 checks pass. The script lives outside the repo.
- Login and register, moved out of `src/routes` (App Foundation criteria): 11 of 11 checks pass, and login honours `redirect`.
- Acceptance criteria:
  - No key: `/dashboard`, `/movements`, `/assets` and `/categories` go to `/connect`. `/settings` stays open.
  - Valid read-only key: both syncs start after the save, side by side, then the user lands on `/dashboard`.
  - `trading`, `noread` and an unknown key answer 422, stay on the form with a translated message, and save nothing.
  - Failed first sync: `/dashboard?syncFailed=true` shows the retry, survives a reload, and clears after a successful retry. The key stays saved.
  - Rejected key: the banner shows on dashboard, movements, assets, categories and settings, and links to Settings. A sync that Binance refuses shows it without a reload.
  - Remove key goes to `/connect`. The DELETE leaves the fake's history counters unchanged, and they keep growing after reconnecting.
  - Secret: cleared from the form on submit. Not in localStorage, sessionStorage, cookies, the DOM or the console.
- Also checked: the show/hide toggle, client validation, Spanish labels and `lang`, logout from Settings and from `/connect`, the `/connect` guards, Settings with no key, no horizontal scroll at 375px, and 44px or more for every control on the new screens (submit, logout, language switch, banner link, card buttons, modal close, modal submit, show/hide toggles).
- Screenshots at 1440px and 375px were reviewed for connect, saving and fetching, dashboard retry, settings (active, rejected, no key), and the replace and remove dialogs.
- The production bundle has no devtools strings, and no fake-API or test strings.
- `pnpm fake-api` starts, and reports a busy port and exits 1.

**Not verified:**
- The real backend. It wasn't run, as instructed. The fake sets `HttpOnly; SameSite=Lax` cookies without `Secure`. The backend defaults to `Secure` unless `COOKIE_SECURE=false`.
- Real Binance. No real key was used. The 422 and 502 shapes and the permission name come from the backend code, not a live call. The Binance labels "API Management" and "Enable Reading" are not checked against the live site.
- Movements and categories surviving a remove and reconnect. There are no movement or category views yet. Only the fake's history counters were checked.
- Browsers other than Chrome. The live cron, which skips rejected users.

**Drift from the spec and plan:**
- Lint: `allowExportNames: ['Route']` alone left three warnings, because the plugin still flags local components in route files. The `Login`, `Register` and `Root` components moved to `src/modules/login/LoginPage.tsx`, `src/modules/register/RegisterPage.tsx` and `src/modules/shared/components/RootLayout.tsx`. No behaviour change.
- Files outside the plan's list: `src/modules/binance/{ConnectPage,ConnectionCard,RejectedKeyBanner,SyncRetry}.tsx`, `src/modules/settings/SettingsPage.tsx` (route files stay thin), `src/routes/_app/dashboard.tsx` (the retry panel), `src/modules/shared/session.ts` (`useLogout`), `src/modules/shared/components/Buttons.tsx` and `src/modules/shared/theme.ts` (44px targets), and `scripts/fake-api.mjs`.
- The dashboard retry is a stopgap. The connect page sends the user to `/dashboard?syncFailed=true`. The Dashboard change should replace it with the spec's "no snapshot" prompt, which uses `GET /snapshots/latest` returning 404.
- Replacing a key saves without syncing. The spec asks for syncs only after a first connect. Open question: should a replaced key sync too?
- A failed sync re-reads the session, so a key that Binance refused shows the banner at once. The spec doesn't say this. Without it the banner waits for the 5-minute session cache.
- A DELETE that answers 404 counts as removed.
- `/connect` sends a user who already has a key to `/dashboard`. The spec doesn't say this.
- Only the API secret is masked. The spec's parenthesis could also cover the key.
- Settings shows the rejected warning in the card and in the banner, as the spec asks.
- The state badge is uppercase, Mantine's default.
- The secret stays in TanStack Query's mutation variables in memory until they're garbage-collected. It isn't logged or stored. React Query Devtools in dev builds can show it. The form field is cleared on submit.
- The theme's Button default is `mih: 44`, because Mantine's default size (sm) measured 36px and md 42px. `PrimaryButton` sets it too. So login and register change too. The show/hide toggle is 44px. The Connect "Log out" link is now a subtle Button, because the link measured 20px.
- The connect steps are numbered by hand, because `app.css` removes list markers from every `li`.
- A key shorter than 16 characters masks to "…", as the backend does. The fake's test keys are short, so the UI shows "…".
- Route transitions into `_app` show the full-page loader for about 500ms. TanStack's minimum pending time applies, because `_app` sets `pendingMs: 0`. That's App Foundation's setting, and I didn't change it.
- Spanish: `errors.keyNotReadOnly` now says "retiros y transferencias". `common.close` was added for the modal close button.
- Fake API: no 16 to 128 character rule, so `readonly` works. Only a missing or empty field gets 400. Logout clears the cookie without revoking the token, as the backend does. `enableSpotAndMarginTrading` is an illustrative permission name.

**Later changes:** the [Dashboard](../2026-10-30-dashboard/PLAN.md) change removed the `syncFailed` retry above, and its no-snapshot prompt is now the retry after a failed first sync. It also removed the 500ms loader and set `gcTime: 0` on the credentials mutation, so the secret no longer stays in the mutation cache after it finishes.

The [Movements and Categories](../2026-10-30-movements-categories/PLAN.md) change verified in the UI, against the fake API, that movements and categories survive removing and reconnecting a key.
