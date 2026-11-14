---
title: Collapsible Movement Filters
spec_type: tech
type: feature
status: draft
domain: Portfolio
issue: none
created: 2026-11-14
updated: 2026-11-14
sdd_version: 7.3.0
---

# Collapsible Movement Filters

## Problem

On the Movements page (`src/modules/movements/MovementsPage.tsx`) the filters `Paper` sits in `<Collapse expanded={wide || panelOpen}>`. It is always open from 48em (`useMediaQuery`), and the "Filters" button shows only below `sm`. On a wide screen the panel pushes the list down even when the user isn't filtering, and the open/close has no tuned motion.

## Behaviour

**B1. Collapsed by default, all widths.** The panel starts closed on every width, unless the viewer saved it open (B3). The `wide` media query and its comment are removed from the page.

**B2. Toggle on all widths.** The "Filters" button (`movements.filters.toggle`) drops `hiddenFrom="sm"`. It keeps `mih={44}`, `radius="xl"`, `variant="default"`, the `IconAdjustmentsHorizontal` left icon, and `aria-expanded={open}`. It also gets `aria-controls` pointing at the panel's `id`. A right `IconChevronDown` (aria-hidden) turns 180deg when open.

**B3. Remembered per viewer.** The open state is saved in localStorage under `billetera.movementFilters` (`"open"` / `"closed"`). Missing, any other value, or a storage exception reads as closed. A failed write is ignored. Reads and writes are wrapped in try/catch, through a small shared helper with an injectable storage (same pattern as `src/modules/shared/privacy.ts`), so it is testable in node. No cross-tab sync.

**B4. Count badge.** While the panel is closed and at least one filter is active, the button shows a Mantine `Badge` (size sm, circle) with the number of active filters. The count is `filterChips(search, …).length` (`src/modules/movements/chips.ts`), so it matches the chips under the panel (each list item counts). The button's accessible name includes the count, e.g. "Filters, 3 active" (`movements.filters.toggleCount`). No badge while open, or when nothing is filtered.

**B5. Soft motion.** The panel `Collapse` uses `transitionDuration={250}` and `transitionTimingFunction="ease"`. The chevron rotates with `transition: transform 250ms ease`. `FilterChips` fades in when chips appear (Mantine `Transition`, `fade`, 250ms); removal is immediate (the chip list is already empty by then).

**B6. Reduced motion.** With `prefers-reduced-motion: reduce` (`useReducedMotion` from `@mantine/hooks`) every duration above is 0 and the chevron has no transition. The shared duration is one exported constant plus a hook, e.g. `useMotionDuration()` returning 0 or 250, so the chart panel of the Movements Chart change reuses it.

**B7. Unchanged.** `MovementFilters`, the search field, Export, the URL search and the chips' behaviour don't change.

## i18n

`movements.filters.toggleCount` in `en.json` and `es.json` ("Filters, {{count}} active" / "Filtros, {{count}} activos"). The existing toggle label stays.

## Acceptance criteria

- **AC1.** Given a viewer with no saved choice, when they open Movements at any width, then the filters panel is closed and the Filters button is visible.
- **AC2.** Given the panel is closed, when the viewer presses Filters, then the panel expands over about 250ms, the chevron turns, `aria-expanded` is `true`, and after a reload the panel is open.
- **AC3.** Given the panel is open, when the viewer presses Filters, then it collapses, and after a reload it stays closed.
- **AC4.** Given the panel is closed and the URL has `kind=p2p,pay&direction=out`, then the button shows a badge with 3 and its accessible name says 3 active. When the panel is opened, the badge goes away.
- **AC5.** Given localStorage throws on read and write, when the page loads and the viewer toggles, then the panel starts closed, toggles in the session, and nothing errors.
- **AC6.** Given `prefers-reduced-motion: reduce`, when the panel toggles, then it opens and closes without animation, and the chevron jumps.
- **AC7.** Given no filters, when the viewer picks one, then the chips row fades in.

## Unit tests (node, TZ America/Santiago)

- The pref helper: missing, `"open"`, `"closed"`, garbage, getItem throwing, setItem throwing, no storage.
- Count: 0 with no filters, one per list item, direction and date range counted once each (through `filterChips`, already covered; add a case only if a new count helper is added).
