---
title: Landing Page
spec_type: tech
type: feature
status: draft
domain: Platform, Identity
issue: none
created: 2026-11-07
updated: 2026-11-09
sdd_version: 7.3.0
---

# Landing Page

## Overview

A public page at `/` that explains billetera to someone who hasn't signed up, and gives them reasons to trust it with a Binance key. It closes the "Landing page" item in the [Roadmap](../ROADMAP.md). The app is live at https://billetera.william-vegas.com and other people will sign up, so the page has to say what the product does, what it can't do with their money, and how to start.

It uses the "Inbox" look of direction C on the [design canvas](https://claude.ai/artifact/FsQ18XGCvVr8NVMPaaj89B): the deep green ground, the lime accent, Bricolage Grotesque headings. Depends on [App Foundation](../2026-10-30-app-foundation/SPEC.md) for the session check, theme, language switch and translation files.

### Current State

- `src/routes/index.tsx` redirects every visitor to `/dashboard` (App Foundation D8). A logged-out visitor then lands on `/login?redirect=/dashboard`, with no word about what the app is.
- `/login` and `/register` already send a logged-in user to `/dashboard`, each with its own `beforeLoad` that runs `sessionQuery` and treats a failed check as logged out.
- `PublicLayout` is a 440px column for forms. It doesn't fit a page with several sections.
- `RootLayout` forces the dark colour scheme. There is no light theme (App Foundation D9).
- `index.html` has `<title>billetera</title>` and no description or Open Graph tags. Netlify serves `index.html` for every path (`netlify.toml`).
- Tests run with Vitest in Node, for pure helpers only (App Foundation D6). There are no component or route tests.
- `public/assets/` has the logo as 1024x1024 PNGs: `billetera-logo-white.png`, `billetera-logo-black.png`, `billetera-logo-transparent-bg.png`.

## Facts the Page May State

Every product claim on the page comes from this list, which is taken from `../backend/README.md` and the backend specs. Anything not here stays off the page.

| Claim | Source |
|-------|--------|
| billetera reads your Binance balances and movements with an API key you create | README, Binance credentials |
| Only a read-only key is accepted. A key that can trade, withdraw or transfer is refused when you save it | README: `PUT /binance/credentials`, 422 `key is not read-only` |
| The key and the secret are stored encrypted (AES-256-GCM), with the encryption key kept outside the database. They're never shown back, only a masked form such as `AbCd…WxYz` | README; backend `2026-10-29-per-user-credentials` FR1 |
| You can restrict the key to an IP address in Binance. Settings shows whether your key is restricted | Backend Q7 (recommended, not required); Binance Connection's `ip_restricted` note |
| Balances and movements sync automatically every hour, and on demand with Sync | README: `SNAPSHOT_CRON_INTERVAL` default `1h`; `POST /binance/sync` |
| Movements covered: deposits, withdrawals, Pay transfers, P2P orders and Convert trades | README, Movements |
| The first sync brings the last 90 days of movements. Balance history starts when you connect | README, Movements |
| Values in USD, from Binance's public prices at the minute of each movement. Some coins have no price | README, `usd_price` |
| Spending is money leaving Binance: withdrawals, P2P sales and Pay transfers sent. Converting between coins isn't spending | [Dashboard](../2026-10-30-dashboard/SPEC.md) Definitions |
| Label each movement with a category and a reason. Syncs never change them | README: `PATCH /movements/:id` |
| Movements can be filtered, searched and exported as CSV | README: `GET /movements`, `/movements/export` |
| Assets by coin, across the Spot and Funding wallets, with history up to a year | [Assets](../2026-10-30-assets/SPEC.md) |
| Removing the key stops syncing and keeps your history | README: `DELETE /binance/credentials` |
| Disabling or deleting the key in Binance also cuts billetera's access | How Binance API keys work: a disabled or deleted key is refused. The backend then marks the key `rejected` (Binance Connection, the rejected-key banner). *(Added 2026-11-09: the security section already stated this.)* |

The page doesn't claim: a price, that it's free, user counts, uptime, account deletion (there's no endpoint for it), other exchanges, or any affiliation with Binance.

## Decisions

| # | Decision | Why |
|---|----------|-----|
| D1 | `/` shows the landing page to a logged-out visitor. A logged-in visitor goes to `/dashboard`, the same rule as `/login` and `/register` | The app is the product for someone who's logged in. One rule for every public page |
| D2 | A failed session check (network error, 5xx) counts as logged out, so the landing page shows | Same as `/login`. A public page must not depend on the API being up |
| D3 | The check lives in one helper, `redirectIfLoggedIn(queryClient)`, in `src/modules/shared/session.ts`, used by `/`. `/login` and `/register` keep their current code | The helper can be unit tested in Node without component tests. Leaving the two forms untouched keeps this change to the landing page |
| D4 | The landing page's code goes in a new module, `src/modules/landing/` | Matches one module per area |
| D5 | Dark theme only, the same palette as the app | The app has no light theme (App Foundation D9). Adding one is a separate change |
| D6 | No new dependencies. Layout with Mantine and `app.css`, icons from `@tabler/icons-react`, which is already installed | Keeps the bundle and review small |
| D7 | Visuals are CSS or inline SVG built from the theme. The hero illustration shows a label card with shapes and category chips, and no numbers | Numbers on a mock read as real data. Screenshots would go stale with every UI change |
| D8 | Binance is named in plain text only. No Binance logo. The footer says billetera isn't affiliated with Binance | Avoids trademark use and any suggestion of endorsement |
| D9 | No pricing, testimonials, user counts or other stats | None exist, and inventing them breaks the trust the page is for |
| D10 | SEO is static tags in `index.html`, in English | It's a SPA on Netlify. Crawlers and link previews read the HTML before JavaScript runs, so the tags can't follow the language toggle. They apply to every path, which is fine because all other pages are behind the login |
| D11 | The language switch is the existing `LanguageSwitch`, in the page header | Same control and storage as the rest of the app |
| D12 | The interceptor's `PUBLIC_PATHS` stays as it is | The landing page makes no API call except the session check, which the interceptor already ignores on 401 |

## Requirements

### Route and session

- `src/routes/index.tsx` keeps `createFileRoute("/")`. Its `beforeLoad` calls `redirectIfLoggedIn(context.queryClient)`, and its `component` is `LandingPage`.
- `redirectIfLoggedIn`:
  - runs `context.queryClient.ensureQueryData(sessionQuery)`;
  - a session (any non-null value, with or without a key) throws `redirect({ to: "/dashboard" })`. A user without a key then goes on to `/connect` through the `/_app` guard, as today;
  - `null` (a 401) returns, so the page renders;
  - a rejected check returns, so the page renders. It doesn't throw.
- The session result is cached under `["session"]`, as today. Going from `/` to `/login` or `/register` reuses it, with no second call within `staleTime`.
- While the check runs, the router's default pending behaviour applies (`FullPageLoader` after the default delay), as on `/login`.
- The page makes no other API call.

### Page structure

One page, in this order, inside `<header>`, `<main>` and `<footer>` landmarks. One `<h1>` (the hero headline). Each section has an `<h2>`.

1. **Header:** the `brand` wordmark (as in `PublicLayout`), the language switch, and two buttons: "Log in" (default) and "Create account" (primary). From 768px all four sit on one row. Below 768px the wordmark and the language switch share the first row, and the two buttons take a second row. Every target stays 44px tall. No burger menu. *(Amended 2026-11-09: the first version asked for one "Log in" link on one row. The built header, `LandingHeader.tsx` with `.landing__header` in `app.css`, has both buttons and wraps to two rows on phones. The user accepted it.)*
2. **Hero:** headline, one-sentence subhead, a short read-only reassurance line with a lock icon, and two CTAs: "Create account" (`PrimaryButton`, links to `/register`) and "Log in" (secondary, links to `/login`). Next to it on wide screens, below it on phones: the decorative label-card illustration (D7), `aria-hidden`.
3. **What you get:** four items, each an icon, a title and one or two sentences:
   - Dashboard: total balance in USD, the change since yesterday, this month's spending by category, and your top holdings.
   - Label your spending: say what each payment was for with a category and a reason, straight from the dashboard.
   - Movements: the full history of deposits, withdrawals, Pay, P2P and Convert, with filters, search and CSV export.
   - Assets: every coin across Spot and Funding, with its balance history.
4. **How it works:** three numbered steps:
   1. Create an account with your email and a password.
   2. Create a read-only API key in Binance and paste it in. billetera checks it with Binance and refuses it if it can do more than read.
   3. See your money. The first sync brings your last 90 days of movements, and billetera keeps syncing every hour.
5. **Security:** a heading such as "Your money stays where it is", and these points, each with an icon:
   - Read-only, enforced: a key that can trade, withdraw or transfer is refused when you save it. billetera can't move your funds.
   - Encrypted at rest: your key and secret are encrypted with AES-256-GCM, and never shown back after you save them.
   - Restrict it further: in Binance you can limit the key to an IP address. Settings tells you whether yours is limited.
   - You stay in control: remove the key at any time, and syncing stops. Disabling the key in Binance also cuts access.
6. **FAQ:** a Mantine `Accordion`, all items closed at first, any number open at once:
   - Can billetera move or withdraw my money? No: read-only, enforced as above.
   - What counts as spending? Money leaving Binance: withdrawals, P2P sales and Pay transfers you send. Converting one coin to another isn't spending, and deposits aren't counted.
   - How far back does it go? 90 days of movements on the first sync. Balance history starts the day you connect.
   - How often does it update? Every hour on its own, or now with Sync.
   - Where do the USD values come from? Binance's public prices at the minute of each movement. Some coins have no price, and the app says so instead of guessing.
   - What happens if I remove my key? Syncing stops. Your balances, movements and labels stay.
7. **Final call to action:** one line ("Ready to see where your money goes?") and the "Create account" button.
8. **Footer:** the wordmark, "Log in" and "Create account" links, and "billetera is an independent project and isn't affiliated with Binance." The language switch isn't repeated.

Copy above is the English intent. The implementer writes the final English and Spanish strings in the existing tone: short sentences, second person, informal Spanish (`tú`), as in `auth` and `binance.connect` in `es.json`.

### Layout and theme

- Mobile first. Sections stack in one column below 768px. From 768px, the hero is two columns (text, illustration), "What you get" is a 2x2 grid, the steps sit in a row of three, the security points in a 2x2 grid.
- Content width at most 1120px, centred, with `md` side padding at phone width. No fixed widths that cause horizontal scroll.
- Colours, fonts and radii come from `theme.ts` and the existing CSS variables. No new hex values except inside the inline SVG, which uses the theme tokens' values from App Foundation.
- Cards and step blocks use the surface colour (`dark.6`), like `PublicLayout`'s `Paper`.
- Interactive targets are at least 44px tall. Every link and button has a visible focus style.
- Styles go in `app.css` under a `landing` prefix (such as `.landing__hero`), following the `.dash` pattern, or as Mantine props.

### Language

- All text comes from a new `landing` block in `src/locales/en.json` and `es.json`, with the same keys in both (the existing `locales.test.ts` checks this).
- Existing keys are reused where the text is the same: `common.appName`, `auth.loginSubmit` ("Log in"), `auth.registerSubmit` ("Create account").
- Switching language changes every string on the page at once, with no reload. `<html lang>` follows, as today.

### SEO and link previews (`index.html`)

- `<title>`: "billetera: your Binance money, in USD".
- `<meta name="description">`: one sentence, about 150 characters, such as "Track your Binance balances and spending in USD. Connect a read-only API key, label where your money went, and see your history."
- Open Graph: `og:type` `website`, `og:site_name` `billetera`, `og:title`, `og:description`, `og:url` `https://billetera.william-vegas.com/`, `og:image` `https://billetera.william-vegas.com/assets/billetera-logo-white.png`.
- `twitter:card` `summary` (the image is square).
- `<meta name="theme-color" content="#0F2A26">`.
- Limitation, recorded here: the tags are the same for every path and are English only. Crawlers that don't run JavaScript see an empty `#root`.

## Acceptance Criteria

- **Given** no session, **when** the visitor opens `/`, **then** the landing page shows, the URL stays `/`, and no API request other than `GET /binance/credentials` is sent.
- **Given** a session with a Binance key, **when** the user opens `/`, **then** they land on `/dashboard`.
- **Given** a session without a key, **when** the user opens `/`, **then** they land on `/connect`.
- **Given** the session check fails with a network error or a 5xx, **when** the visitor opens `/`, **then** the landing page shows, with no error page and no toast.
- **Given** the landing page, **when** the visitor clicks "Create account", **then** `/register` opens; **when** they click "Log in", **then** `/login` opens, with no `redirect` search param.
- **Given** the session check on `/` answered 401, **when** the visitor opens `/login` from the page, **then** no second session request is sent.
- **Given** the visitor clicks ES, **then** every string on the page is in Spanish, `<html lang="es">` is set, and after a reload the page is still in Spanish.
- **Given** a 375px wide screen, **when** the page opens, **then** there's no horizontal scroll, both hero CTAs are visible without scrolling, and every target is at least 44px tall.
- **Given** a 1440px wide screen, **then** the hero has two columns and "What you get" is a 2x2 grid.
- **Given** a keyboard user, **when** they tab through the page, **then** focus is visible on every link, button and FAQ item, and each FAQ item opens with Enter or Space.
- **Given** the page's text, **then** it has no price, user count, testimonial or statistic, and every product claim is in "Facts the Page May State".
- **Given** the built `dist/index.html`, **then** it has the title, the description, the six Open Graph tags and `twitter:card`.
- **Given** `pnpm test`, **then** `redirectIfLoggedIn` is covered: a session redirects to `/dashboard`, `null` doesn't, and a failed check doesn't.

## Out of Scope

- A light theme, or a theme toggle.
- Translated or per-route meta tags, prerendering or server-side rendering, `robots.txt` and a sitemap.
- Privacy policy and terms pages (see Open Questions).
- Screenshots of the app.
- Changing `/login`, `/register` or `PublicLayout`.
- A way for a logged-in user to see the landing page.
- Route-level code splitting. The router plugin's `autoCodeSplitting` is still off. *(Updated 2026-11-09: the chart is already split out: `BalanceChart` is loaded with `React.lazy` by the Dashboard and Assets, so the landing page doesn't download the chart library.)*

## Open Questions

1. **Light theme.** The brief asked for light and dark "with the existing theme", but the app is dark only. Default: dark only (D5). Is a light theme wanted, for the landing page or the whole app?
2. **Sync interval in production.** The page says "every hour", the backend default. Is `SNAPSHOT_CRON_INTERVAL` unset (1h) on the production API?
3. **Server IP for the restriction tip.** The security section says a key can be IP-restricted, but doesn't give the API server's outbound IP. Should the page (or the planned Binance key guide) publish it, so users can actually restrict their key?
4. **Privacy policy and terms.** Strangers will store an encrypted exchange key and their financial history. Should there be a privacy page before inviting sign-ups? There's also no way to delete an account; the FAQ avoids promising one.
5. **Price.** The page says nothing about cost. Should it say the app is free, or stay silent?
6. **Source code link.** If the repositories are public, a "Source code" link in the footer would add trust. Are they, and should it be linked?
7. **Link preview image.** `og:image` uses the square logo. Is a 1200x630 preview image wanted? It would be a new file in `public/assets/`, made by the user.
8. **Wordmark link on login and register.** `PublicLayout`'s wordmark isn't a link. Should it go to `/`, so a visitor can get back to the landing page? It's out of scope by default because it changes the form pages.
