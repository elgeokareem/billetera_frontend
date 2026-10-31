---
title: App Foundation
spec_type: tech
type: feature
status: draft
domain: Platform, Identity
issue: none
created: 2026-10-30
updated: 2026-10-30
sdd_version: 7.3.0
---

# App Foundation

## Overview

Replaces the first-version shell with the base every other view needs: a working session, the "Inbox" theme, the app layout, English and Spanish, API error handling and money formatting. Design source: direction C on the [design canvas](https://claude.ai/artifact/FsQ18XGCvVr8NVMPaaj89B).

### Current State

- `src/modules/shared/auth.ts` and `axios-interceptors.ts` read a `token` cookie. The backend sets an httpOnly `access_token` cookie, which JavaScript can't read, so expiry is never detected. A 401 only logs to the console.
- `src/routes/dashboard.tsx` has its auth check commented out.
- `axios-interceptors.ts` builds a second router instance, separate from the one in `main.tsx`.
- `login.tsx` pre-fills an email and a password, and shows "Remember me" and "Forgot password?", which have no backend support.
- `register.tsx` navigates to login before the request finishes, so a failed registration looks like success. It has a terms checkbox with no terms behind it.
- The sidebar links (Portfolio, Trading, Performance, Charts, Reports) all go to `/`. The backend has no trading.
- Devtools render in every build.

## Decisions

| # | Decision | Why |
|---|----------|-----|
| D1 | A session is detected with `GET /binance/credentials`: 200 means logged in, 401 means not | The backend has no `/auth/me` and the cookie can't be read. This call also tells us if a key is set, which the next change needs |
| D2 | The `expires_at` from login isn't stored. Any 401 on an authenticated call ends the session | One rule, and the server stays the source of truth |
| D3 | `jwt-decode` and `src/modules/shared/auth.ts` are removed | Nothing can read the token |
| D4 | Add `i18next` and `react-i18next` | Agreed with the user |
| D5 | Add `big.js` for money math | Money is a full-precision decimal string and is never parsed to `number` for math. Numbers are allowed only for chart coordinates |
| D6 | Add `vitest`, for pure helpers only | Formatting and money math are easy to get wrong and have no UI to reveal it. No component tests in the MVP |
| D7 | Fonts load with a Google Fonts `<link>` in `index.html` | Matches the design with no extra dependency |
| D8 | `/` redirects to `/dashboard`. The landing page is a later step | The current landing page is three buttons |
| D9 | Dark theme only in the MVP | The design is one fixed palette |

## Requirements

### Session and routes

- Public routes: `/login`, `/register`. Every other route is protected.
- A protected route runs the session check through TanStack Query, under the key `["session"]`, before it renders. While it loads, a full-page loader shows.
- A 401 from any call except `POST /auth/login` clears the query cache and redirects to `/login`, keeping the attempted path in a `redirect` search param.
- A logged-in user who opens `/login` or `/register` goes to `/dashboard`.
- Interceptors use the router instance from `main.tsx`.
- Devtools render only when `import.meta.env.DEV` is true.

### Login and register

- Login has email and password, with empty initial values. "Remember me" and "Forgot password?" are removed.
- After login, the user goes to `redirect`, or to `/dashboard`.
- Register has email, password and confirm password. The terms checkbox is removed.
- Register goes to `/login` only after a 201. The form keeps its values on failure.
- Both screens show the language switch. Both buttons show a loading state.

### Theme

Mantine theme tokens, set in one place:

| Token | Value |
|-------|-------|
| Ground | `#0F2A26` |
| Surface | `#16372F` |
| Border, strong | `#4A7266` |
| Border, subtle | `#2B5247` |
| Text | `#EEF5F1` |
| Muted text | `#B4CBC1` |
| Accent | `#C8F169` |
| Text on accent | `#16270C` |

- Display font: Bricolage Grotesque, weight 700. Body font: DM Sans. Numbers use tabular figures.
- Interactive targets are at least 44px tall.

### App layout

- Left panel, in order: "billetera" title, EN | ES switch, nav (Dashboard, Movements, Assets, Categories, Settings).
- The nav uses real links, with the active route marked.
- A route that isn't built yet shows a "Coming soon" page, so no nav link is dead.
- Below 768px the panel becomes a top bar with a burger menu.
- The content area scrolls and has no fixed widths.

### Language

- Languages: `en`, `es`. The first visit uses the browser's language, falling back to `en`.
- The choice is stored in `localStorage` under `billetera.language`. A storage failure doesn't break the app.
- The `lang` attribute on `<html>` follows the choice.
- All UI text comes from translation files. Category names and reasons are the user's and aren't translated.
- The switch is a two-option control with `aria-pressed` on each button.

### Formatting helpers

In `src/modules/shared/format.ts`, all based on the active language:

- `formatUsd("1233.9")`: `$1,233.90` in `en`, `1.233,90 US$` in `es`.
- `formatAmount("0.05000000", "ETH")`: trims trailing zeros and keeps the asset code.
- `formatDate`, `formatDateTime`.
- `formatPercent`.
- A `null` value shows as an em dash.

`src/modules/shared/money.ts` wraps `big.js` for `sum`, `diff` and `percentOf`, taking and returning strings.

### API errors

- The backend answers errors as `{"error": "..."}` or `{"message": "..."}`. `getApiErrorKey(error)` reads both and maps known strings to translation keys.
- An unknown string falls back to a generic translated message. Raw backend text isn't shown.
- A network failure has its own message.

## Acceptance Criteria

- **Given** no session, **when** the user opens `/dashboard`, **then** they land on `/login?redirect=/dashboard`.
- **Given** that redirect, **when** login succeeds, **then** they land on `/dashboard`.
- **Given** a session that expires, **when** any call answers 401, **then** the user lands on `/login` and cached data is cleared.
- **Given** an email already registered, **when** the user registers, **then** they stay on the form, with a translated error and their values kept.
- **Given** Spanish is chosen, **when** the page reloads, **then** it stays in Spanish and `<html lang="es">` is set.
- **Given** a 375px wide screen, **when** any page opens, **then** there's no horizontal page scroll and the nav is reachable.
- **Given** a production build, **then** no devtools are in the page.
- **Given** the login page, **then** no credentials are pre-filled.

## Out of Scope

Landing page, light theme, password reset, session expiry warnings, storing language on the server.

## Open Questions

None.
