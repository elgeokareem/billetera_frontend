---
title: Nav Brand and Logout
spec_type: tech
type: feature
status: draft
domain: Platform
issue: none
created: 2026-11-13
updated: 2026-11-13
sdd_version: 7.3.0
---

# Nav Brand and Logout

## Problem

The app's menu shows the name as plain lowercase text ("billetera") and doesn't use the new icon (`public/favicon.svg`). The only ways to log out are on Settings and the connect page, so the user has to go looking for it.

## Behaviour

**B1. BrandMark.** A new shared component, `src/modules/shared/components/BrandMark.tsx`. It renders the icon (`<img src="/favicon.svg" alt="">`, decorative, 28px by default, optional `size` prop) followed by `t("common.appName")` in the existing `.brand` style, side by side and vertically centred. The name sits to the right of the logo. The icon is served from `public/`, so there's no import or new asset.

**B2. Where it's used.** BrandMark replaces every `<span className="brand">{t("common.appName")}</span>` and the `.brand brand-link` link text:
- `AppLayout`: the desktop navbar row (BrandMark on the left, BalancesToggle on the right, as today) and the mobile header.
- `LandingHeader` and `LandingFooter`.
- `PublicLayout`, both branches. With `homeLink` the `Link` keeps `.brand-link` (44px target, focus ring) and wraps BrandMark.

**B3. Navbar fit.** The navbar is 220px wide with `p="md"` and `px={12}`, so the row has about 164px for logo, gap, name and the 44px toggle. If it doesn't fit on one line without wrapping or overflow, reduce the gap or the icon size (for example 24px) in the navbar only. The name never truncates.

**B4. Capitalised name.**
- `common.appName` becomes `"Billetera"` in `en.json` and `es.json`.
- Every prose mention of the product name in both locales becomes "Billetera" (landing subtitle, steps, FAQ question and answer, affiliation). Mentions already capitalised stay as they are.
- `index.html`: `<title>`, `og:site_name` and `og:title` use "Billetera".
- Unchanged: domains and URLs (`billetera.william-vegas.com`, the `og:image` path), localStorage keys (`billetera.language`, `billetera.showBalances`) and their tests, and the Spanish common noun "Billetera"/"Billeteras" (`wallet`, `wallets` keys).

**B5. Logout in the menu.** The navbar (the desktop sidebar and the mobile drawer, which are the same `AppShell.Navbar`) is split into a top part that grows (`AppShell.Section grow`: brand row, LanguageSwitch, nav links) and a bottom `AppShell.Section` holding a logout button:
- Full width, Mantine `Button` with `variant="subtle"`, left-aligned content, `leftSection={<IconLogout />}` from `@tabler/icons-react`, label `t("auth.logout")`.
- At least 44px tall. Text colour and padding match `.nav-link`, so it reads as a menu item, not a call to action.
- `loading` while `useLogout().isPending`. Clicking calls `useLogout().mutate()`. What happens after (cache cleared, redirect to `/login`, toast on error) is what `useLogout` already does. Nothing new is needed to close the mobile drawer, since the route changes.
- The Settings and connect page logout buttons stay.

## API

`POST /auth/logout`, already called by `useLogout()` in `src/modules/shared/session.ts`. No new request.

## Acceptance criteria

- **AC1.** Given a logged-in user from 768px, when any app page loads, then the navbar's top row shows the icon then "Billetera" on the left and the balances toggle on the right, on one line.
- **AC2.** Given a viewport under 768px, then the app header shows the icon then "Billetera", and the toggle and burger on the right.
- **AC3.** Given the landing page, login or register, then the header (and the landing footer) shows the icon then "Billetera"; on login and register with `homeLink` the whole mark is the link home, with the focus ring.
- **AC4.** Given either language, then the product name appears as "Billetera" in the UI and the browser tab title; URLs and storage keys are unchanged.
- **AC5.** Given the desktop navbar, then the logout button sits at the bottom of the sidebar, below the nav links, separated by the free space.
- **AC6.** Given the mobile drawer is open, then the logout button is at the bottom of the drawer.
- **AC7.** Given the user clicks the menu logout button, when the request is in flight, then the button shows a loader; when it succeeds, then the user lands on `/login`; when it fails, then an error toast shows and the user stays.
- **AC8.** Given the icon, then a screen reader announces only "Billetera" (the image has `alt=""`).

## Tests

The test setup has no DOM environment or Testing Library (all tests are `.test.ts`, node), so a render test of BrandMark would need new dev dependencies. This change adds none (see open question Q1). Checked by `pnpm verify` and the manual checks in the plan. No existing test matches the lowercase product name; the `billetera.*` storage key tests stay as they are.

## Open questions

- **Q1.** A BrandMark render test needs `jsdom` (or `happy-dom`) and `@testing-library/react` as dev dependencies. Add them in this change, or rely on manual checks? The spec assumes no new dependencies.
- **Q2.** Should the brand in the app navbar link to `/dashboard`? The spec keeps it as plain text, as today.
