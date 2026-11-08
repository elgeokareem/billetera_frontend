---
title: "Implementation Plan: Landing Page"
change: landing-page-1
type: feature
spec: ./SPEC.md
issue: none
created: 2026-11-07
sdd_version: 7.3.0
---

# Implementation Plan: Landing Page

**Spec:** [SPEC.md](./SPEC.md)

Same phase rules as [App Foundation](../2026-10-30-app-foundation/PLAN.md):
- Never commit. Never read or print `.env` files.
- Before reporting a phase done, run `pnpm lint`, `pnpm test` and `pnpm build`.
- Confirm `pnpm-lock.yaml` and `src/routeTree.gen.ts` hold only changes the phase meant to make. Running the dev server can rewrite both. No phase adds a dependency, so `pnpm-lock.yaml` must not change.
- Every product claim in the copy must be in the spec's "Facts the Page May State". Don't add any.
- Don't touch `specs/INDEX.md` or `specs/ROADMAP.md`. The main session updates them.

Browser checks run against the fake API: `pnpm fake-api`, then `VITE_BACKEND_ENDPOINT=http://localhost:8099 pnpm dev`. Logged out is the fake's state after `{"reset": true}`. Login is `test@example.com` / `password`; a key of `readonly` connects it. Keep any browser scripts in the scratchpad, outside the repo.

## Phase 1: Route, redirect helper and hero

Deliverables: `redirectIfLoggedIn` with unit tests, `/` rendering the landing page for logged-out visitors, and a first `LandingPage` with the header and the hero (no illustration yet). The other sections come later.

Files:
- `src/modules/shared/session.ts`: add `redirectIfLoggedIn(queryClient)`.
- `src/modules/shared/session.test.ts` (new).
- `src/routes/index.tsx`: `beforeLoad` and `component`.
- `src/modules/landing/LandingPage.tsx`, `src/modules/landing/LandingHeader.tsx`, `src/modules/landing/Hero.tsx` (new).
- `src/locales/{en,es}.json`: `landing.header` and `landing.hero` keys.
- `src/app.css`: the `.landing` page container and hero rules.

Checks:
- Unit tests, with a fresh `QueryClient` per test: a seeded session (`setQueryData(sessionQuery.queryKey, { configured: true, ... })`) and one with `configured: false` both throw a redirect to `/dashboard` (check it with `isRedirect` from `@tanstack/react-router`, and its `options.to`); a seeded `null` returns; a failing check (`vi.spyOn(axios, "get")` rejecting with a network error, then with a 503 `AxiosError`) returns without throwing. If importing `session.ts` fails in Node because of `react-toastify` or `i18n`, say so in the report rather than mocking around it silently.
- Browser: the first four route criteria in the spec, including `{"failRoute": "GET /binance/credentials", "failStatus": 503}` for the failed check and `{"delayMs": 1500}` for the loader. Both CTAs reach `/register` and `/login` with no `redirect` param.
- `/login` and `/register` behave as before: a logged-in user still goes to `/dashboard`.

## Phase 2: Illustration, What you get, How it works

Deliverables: the decorative label-card illustration in the hero, the four feature items and the three steps, with the responsive grids.

Files:
- `src/modules/landing/HeroIllustration.tsx`, `src/modules/landing/Features.tsx`, `src/modules/landing/HowItWorks.tsx` (new).
- `src/modules/landing/Hero.tsx`, `src/modules/landing/LandingPage.tsx`.
- `src/locales/{en,es}.json`: `landing.features`, `landing.steps`.
- `src/app.css`: grid rules for the two sections and the two-column hero.

Checks:
- The illustration is `aria-hidden`, has no numbers, and uses the theme colours.
- Screenshots at 375px and 1440px, in English and Spanish, compared with direction C. No horizontal scroll at 375px. Both hero CTAs are visible without scrolling at 375px.
- Icons come from `@tabler/icons-react`. No new package.

## Phase 3: Security, FAQ, final call to action, footer

Deliverables: the rest of the page.

Files:
- `src/modules/landing/Security.tsx`, `src/modules/landing/Faq.tsx`, `src/modules/landing/LandingFooter.tsx` (new). The final call to action can live in `LandingPage.tsx`.
- `src/modules/landing/LandingPage.tsx`.
- `src/locales/{en,es}.json`: `landing.security`, `landing.faq`, `landing.cta`, `landing.footer`.
- `src/app.css`, if Mantine props aren't enough.

Checks:
- Each claim in the security points and the FAQ matches a row of "Facts the Page May State". The footer has the "not affiliated with Binance" line.
- Keyboard: Tab reaches every link, button and FAQ item with a visible focus ring. Enter and Space open an FAQ item.
- The full page in Spanish has no English left, and the reverse. Reload keeps the language.
- If the `en` and `es` additions in this phase push it past about 400 changed lines, split the FAQ into its own phase.

## Phase 4: SEO tags and final pass

Deliverables: the `index.html` tags, and a pass over the whole page against every acceptance criterion.

Files:
- `index.html`.
- Any landing file, only for fixes the pass finds.

Checks:
- `pnpm build`, then `dist/index.html` has the title, the description, the six Open Graph tags, `twitter:card` and `theme-color`, with absolute `https://billetera.william-vegas.com` URLs.
- Every acceptance criterion in the spec, in the browser, at 375px and 1440px, in both languages.
- The network panel on `/`, logged out: one API call, `GET /binance/credentials`. Then opening `/login` from the page sends no second one.
- Report each criterion as pass, fail or not verified, as the earlier plans do, and list any drift from the spec.

## Expected Size

| Phase | New files | Changed files | Rough lines |
|-------|-----------|---------------|-------------|
| 1 | 4 | 5 | 250 |
| 2 | 3 | 5 | 300 |
| 3 | 3 | 4 | 350 |
| 4 | 0 | 1 to 3 | 50 |

The locale files count twice (English and Spanish), which is most of each phase's growth.
