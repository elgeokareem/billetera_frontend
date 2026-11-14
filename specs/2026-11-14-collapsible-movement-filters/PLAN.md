---
title: "Implementation Plan: Collapsible Movement Filters"
change: collapsible-movement-filters-1
type: feature
spec: ./SPEC.md
issue: none
created: 2026-11-14
updated: 2026-11-14
sdd_version: 7.3.0
---

# Implementation Plan: Collapsible Movement Filters

**Spec:** [SPEC.md](./SPEC.md). Behaviour, acceptance criteria and tests are there.

Rules:
- Never commit. Never open, read, `cat`, `grep` or print `.env` or any `.env.*` file. Tell every subagent this.
- The working tree has uncommitted changes from Nav Brand and Logout (`AppLayout.tsx`, `PublicLayout.tsx`, landing files, `app.css`, `index.html`, `BrandMark.tsx`, locale files). Don't revert or reformat them. The locale files are shared: add keys only.
- Don't touch `specs/INDEX.md` or `specs/ROADMAP.md`.
- No new dependency, no backend change.
- This change goes before Movements Chart, which reuses the pref helper and the motion hook.

## Phase 1: Collapsed filters with soft motion

**Outcome:** SPEC B1 to B7.

| File | Change |
|------|--------|
| `src/modules/shared/prefs.ts` | New. `loadPref(key, allowed, fallback, getStorage?)` / `savePref(key, value, getStorage?)`, try/catch, injectable storage as in `privacy.ts`. Key constant `FILTERS_STORAGE_KEY = "billetera.movementFilters"` lives with the page or here. |
| `src/modules/shared/prefs.test.ts` | New. Cases under Unit tests. |
| `src/modules/shared/motion.ts` | New. `MOTION_MS = 250` and `useMotionDuration()` (0 under reduced motion). |
| `src/modules/movements/MovementsPage.tsx` | Drop `useMediaQuery`/`wide`. `open` state initialised from `loadPref`, saved on toggle. Button on all widths with chevron, badge (count from `filterChips`), `aria-expanded`, `aria-controls`. `Collapse` with duration/timing from the hook. |
| `src/modules/movements/FilterChips.tsx` | Wrap the group in a `Transition` (fade, duration from the hook). |
| `src/locales/en.json`, `src/locales/es.json` | Add `movements.filters.toggleCount`. |

About 7 files, well under 400 lines.

**Checks:**
- `pnpm verify` passes.
- Manual with `pnpm dev`, at 375px and 1280px: AC1 to AC7. AC5 by making `localStorage` throw in devtools (or blocking site data). AC6 with devtools' reduced-motion emulation.
- Report `git status --short` (only the files above plus the pre-existing Nav Brand changes) and record results and any drift under Implementation State.

## Implementation State

**Built** 2026-11-14. `pnpm verify` passes: API check, lint, 461 tests, build.

Files changed:
- New `src/modules/shared/prefs.ts` and `prefs.test.ts`: `loadPref`/`savePref` with an injectable storage, try/catch on every access.
- New `src/modules/shared/motion.ts`: `MOTION_MS = 250` and `useMotionDuration()` (0 under reduced motion).
- `src/modules/movements/MovementsPage.tsx`: `useMediaQuery`/`wide` removed; `open` starts from the saved pref and is saved on toggle; Filters button on every width with badge, `aria-expanded`, `aria-controls` and a rotating chevron; `Collapse` uses the motion duration and `ease`.
- `src/modules/movements/FilterChips.tsx`: the row is a Mantine `Transition` (`fade`, duration from the hook). `exitDuration={0}` makes removal immediate, as the list is empty by then.
- `src/locales/en.json`, `src/locales/es.json`: added `movements.filters.toggleCount` only.

Drift:
- The storage key and allowed values live as private constants in `MovementsPage.tsx` (the plan allowed either place); they aren't exported, so the page keeps its single component export plus the pre-existing `SEARCH_DEBOUNCE_MS`.
- No other drift. `MovementFilters`, the search field, Export, the URL search and the chips' behaviour are untouched.

Not run: the manual AC1 to AC7 pass with a dev server, which the task forbade. The unit cases cover the pref helper; the rest is covered by types and review.
