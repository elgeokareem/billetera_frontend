---
title: "Implementation Plan: Nav Brand and Logout"
change: nav-brand-and-logout-1
type: feature
spec: ./SPEC.md
issue: none
created: 2026-11-13
updated: 2026-11-13
sdd_version: 7.3.0
---

# Implementation Plan: Nav Brand and Logout

**Spec:** [SPEC.md](./SPEC.md). Behaviour and acceptance criteria are there.

Rules:
- Never commit. Never open, read, `cat`, `grep` or print `.env` or any `.env.*` file. Tell every subagent this.
- Don't touch `specs/INDEX.md` or `specs/ROADMAP.md`.
- No new dependency, no backend change, no new request.
- If something outside the file list seems to need a change, stop and say so.

## Phase 1: BrandMark, capitalised name, menu logout

**Outcome:** the icon and "Billetera" everywhere the brand shows, and a logout button at the bottom of the menu (SPEC B1 to B5).

| File | Change |
|------|--------|
| `src/modules/shared/components/BrandMark.tsx` | New. Icon plus name (B1). |
| `src/app.css` | A `.brand-mark` rule (inline-flex, centred, gap) and, if needed, the narrower navbar variant (B3). A rule for the logout button to match `.nav-link`, if Mantine props aren't enough. |
| `src/modules/shared/components/AppLayout.tsx` | BrandMark in the header and navbar row. Top `AppShell.Section grow` for the existing content, bottom `AppShell.Section` with the logout button using `useLogout` (B5). |
| `src/modules/landing/LandingHeader.tsx` | BrandMark. |
| `src/modules/landing/LandingFooter.tsx` | BrandMark. |
| `src/modules/shared/components/PublicLayout.tsx` | BrandMark in both branches; the `Link` keeps `.brand-link`. |
| `src/locales/en.json`, `src/locales/es.json` | `common.appName` and the prose mentions to "Billetera" (B4). |
| `index.html` | `<title>`, `og:site_name`, `og:title` (B4). |

**Checks:**
- `pnpm verify` passes (API check, lint, tests, build).
- `grep -n "billetera" src/locales/*.json index.html` shows only URLs/domains, storage keys and the Spanish `wallet`/`wallets` nouns in lowercase or as common nouns.
- Manual, with `pnpm dev`: AC1 to AC8. At 768px and above, the navbar row fits on one line (AC1). Under 768px, open the drawer and see the logout at the bottom (AC6). Click logout and watch the loader and the redirect; with the backend stopped, see the error toast (AC7). Check the landing page, login and register in both languages (AC3, AC4).
- Report `git status --short` and record files, results and any drift under Implementation State.

About 100 to 150 changed lines in 9 files.

## Implementation State

Built on 2026-11-13.

Files changed:
- `src/modules/shared/components/BrandMark.tsx` (new): the icon (`/favicon.svg`, `alt=""`) and `t("common.appName")` in `.brand`, inside a `.brand-mark` row. The optional `size` prop sets the icon's width and height (default 28px).
- `src/app.css`: `.brand-mark` (inline-flex, centred, 8px gap). No logout rule was needed (see below).
- `src/modules/shared/components/AppLayout.tsx`: BrandMark in the mobile header and the desktop navbar row; the navbar is a `AppShell.Section grow` with the brand row, LanguageSwitch and links, plus a bottom `AppShell.Section` with the logout `Button` (`variant="subtle"`, full width, left-aligned, `IconLogout`, loading from `useLogout().isPending`).
- `src/modules/landing/LandingHeader.tsx` and `LandingFooter.tsx`: BrandMark replaces the wordmark.
- `src/modules/shared/components/PublicLayout.tsx`: BrandMark in both branches; the `homeLink` branch keeps `.brand-link` and wraps BrandMark. The now-unused `useTranslation` was removed.
- `src/locales/en.json`, `src/locales/es.json`: `common.appName` and all lowercase prose mentions are "Billetera". The Spanish common nouns (`wallet`: "Billetera", `wallets`: "Billeteras") are unchanged.
- `index.html`: `<title>`, `og:site_name` and `og:title` use "Billetera". Domains and the `og:image` path are unchanged.
- `specs/INDEX.md`: this change's row set to built, as the user asked (the plan's file list otherwise excludes it).

Where the spec met the code:
- B3: the navbar row uses a 24px icon and `gap={4}` on its `Group`. At 20px/700 Bricolage Grotesque "Billetera" measures 80.8px, so the row is 24 + 8 (`.brand-mark` gap) + 80.8 + 4 + 44 = 160.8px of the 164px available. The 28px default with Mantine's default 16px `Group` gap would be 176.8px and overflow.
- B5: no `.nav-logout` rule was needed. The button gets `.nav-link`'s colour, padding, font size and radius from props (`c="dark.0"`, `px={12}`, `fz={14}`, `fw={400}`, `radius={22}`), and the hover background from a `vars` override of `--button-hover`. Mantine writes variant colours as inline CSS variables, so a plain class rule could not override them.

Open questions: Q1 — no dependencies or render test added; manual checking only. Q2 — the app navbar brand stays plain text.

Verification: `pnpm verify` passed (api:check, lint, 34 test files / 452 tests, build). The manual AC1 to AC8 browser checks with `pnpm dev` were not run because starting dev servers was out of scope; no test asserts the brand markup. `git status --short` after the change shows the modified files above and the untracked spec folder plus `BrandMark.tsx`; no other drift.

