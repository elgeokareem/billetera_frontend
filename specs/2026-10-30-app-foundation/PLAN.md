---
title: "Implementation Plan: App Foundation"
change: app-foundation-1
type: feature
spec: ./SPEC.md
issue: none
created: 2026-10-30
sdd_version: 7.3.0
---

# Implementation Plan: App Foundation

**Spec:** [SPEC.md](./SPEC.md)

Rules for every phase:
- Never commit. Never read or print `.env` files.
- Before reporting a phase done, run `pnpm build` and `pnpm lint`, and `pnpm test` once it exists.
- Confirm `pnpm-lock.yaml` and `src/routeTree.gen.ts` hold only changes the phase meant to make. Running the dev server can rewrite both.

## Phase 1: Helpers

Deliverables: `vitest`, `big.js`, `format.ts`, `money.ts`, `getApiErrorKey`, with unit tests.

Files: `package.json`, `vite.config.ts`, `src/modules/shared/{format,money,api-errors}.ts` and their tests.

Checks: tests cover `en` and `es` output, `null`, values that lose precision as a `number`, and both backend error shapes.

## Phase 2: Language

Deliverables: `i18next` setup, `en` and `es` translation files, the `LanguageSwitch` component.

Files: `package.json`, `src/modules/shared/i18n.ts`, `src/locales/{en,es}.json`, `src/modules/shared/components/LanguageSwitch.tsx`, `src/main.tsx`.

Checks: first visit follows the browser, the choice survives a reload, and the app works with `localStorage` blocked.

## Phase 3: Session

Deliverables: the session query, route guards, a rewritten interceptor, devtools in dev only. Remove `auth.ts` and `jwt-decode`.

Files: `src/modules/shared/axios-interceptors.ts`, `src/modules/shared/session.ts`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/main.tsx`, `package.json`.

Checks: all session criteria in the spec, against the local backend.

## Phase 4: Theme and layout

Deliverables: the theme tokens, fonts, the left panel, responsive top bar, "Coming soon" routes. Remove `Sidebar`, `SidebarItems`, `ModulesContainer` and `ModuleLayout`.

Files: `index.html`, `src/modules/shared/theme.ts`, `src/modules/shared/components/AppLayout.tsx`, `src/routes/_app.tsx` and the placeholder routes, `src/app.css`, `src/mantine-colors.d.ts`.

Checks: screenshots at 1440px and 375px, compared with the design.

## Phase 5: Login and register

Deliverables: both screens rebuilt to the spec, translated errors.

Files: `src/routes/{login,register}.tsx`, `src/modules/login/*`, `src/modules/register/*`, `src/locales/*`.

Checks: the login and register criteria in the spec.

## Implementation State

All five phases are built. Nothing is committed.

**Verified:**
- `tsc -b`, `vite build` and 17 unit tests pass.
- A headless browser ran the session, login, register, language and mobile criteria against a temporary fake API. A production build was checked for devtools and blocked storage.

**Not verified:**
- `pnpm lint`: `typescript-eslint` doesn't support the installed TypeScript 7, so ESLint crashes at startup. This happens before any of this change's code is linted.
- The real backend: not run yet, so its cookie and origin checks haven't been exercised with this frontend.

**Drift from the plan and spec:**
- Removed the old dashboard, `InfoCard` and `LineChart` here instead of in the Dashboard change, because `LineChart` was already breaking the build. `/dashboard` is a placeholder until then.
- Removed `joi` and `mantine-form-joi-resolver`. Form validators now use translated messages.
- Unit tests run with Vitest's default config, so `vite.config.ts` is unchanged.
- The error page is set as the router's default, because a root `errorComponent` doesn't cover child routes.
