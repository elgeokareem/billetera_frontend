---
title: "Implementation Plan: Card Spend Detection"
change: card-spend-detection-1
type: feature
spec: ./SPEC.md
issue: none
created: 2026-11-13
updated: 2026-11-13
sdd_version: 7.3.0
---

# Implementation Plan: Card Spend Detection

**Spec:** [SPEC.md](./SPEC.md). The behaviour (B1 to B8), the design tables, the translations, the acceptance criteria and the unit tests are there. This plan gives the order, the files and the checks.

Rules for every phase:
- Never commit. Never open, read, `cat`, `grep` or print `.env` or any `.env.*` file. Tell every subagent this.
- Money stays a decimal string. Format it with `shared/format.ts`, never `Number(...)`, and wrap every new amount in `Sensitive`.
- Don't touch `specs/INDEX.md` or `specs/ROADMAP.md` (the orchestrator does).
- No new dependency. `Trans` comes from `react-i18next`, which is already installed.
- Each phase ends with `pnpm lint && pnpm test && pnpm build`, all passing, and `git status --short` in the report. Phases that follow a backend schema change run `pnpm api:generate` first, then `pnpm api:check`. If something outside the phase's file list seems to need a change, stop and say so.
- Keep each phase under about 400 changed lines (the generated `api-schema.d.ts` excluded) and 15 files.
- Record files, results and drift from the SPEC under Implementation State.

## Dependency

**Blocked on the backend** `../backend/specs/2026-11-13-card-spend-detection/` through its Phase 7: the new kinds, `review_status`, `detection`, the `review` filter and the PATCH keys in `docs/openapi/openapi.json`. That backend change is itself built after `../backend/specs/2026-11-13-tag-management/`, and this change also comes after the frontend `2026-11-13-categories-tags-page` (both edit `api-errors.ts`, `helpers.test.ts`, the locales and `fake-api.mjs`).

Phase 1 starts with `pnpm api:generate`. If the generated `movements.MovementResponse` has no `review_status` or `detection`, or its `kind` lacks `card_spend`, stop. Phase 2 (fake API) doesn't need the backend and may run first, but only after categories-tags-page's fake API phase, to avoid conflicting edits.

## Phases

### Phase 1: Types, kinds, spending and pure review logic

**Outcome:** the app builds with the new schema. Kinds, spending, the URL `review` filter and the review helpers exist and are unit-tested. Every string is in both locales. No visible UI change except the new kind labels where kinds already show.

| File | Change |
|------|--------|
| `src/modules/shared/api-schema.d.ts` | `pnpm api:generate` |
| `src/modules/movements/types.ts` | Derived types (SPEC Design) |
| `src/modules/movements/labels.ts` | `KIND_KEYS` |
| `src/modules/dashboard/movementText.ts` + test | `kindKey` cases |
| `src/modules/movements/search.ts` + test | Kinds, `review`, `REVIEW_SEARCH` |
| `src/modules/movements/spending.ts` + test | B2 |
| `src/modules/movements/review.ts` + `review.test.ts` | New (SPEC Design) |
| `src/modules/shared/api-errors.ts`, `helpers.test.ts` | The new text |
| `src/locales/en.json`, `es.json` | Every key in the SPEC translations table |

**Size:** about 350 changed lines, 14 files.

### Phase 2: Fake API

**Outcome:** `pnpm fake-api` answers like the backend change, with the `card-spends` account, so Phases 3 to 5 can be checked by hand.

Only `scripts/fake-api.mjs`, per SPEC "Fake API": the header comment (new fields, filter, PATCH keys, account kind), constants, the movement shape, the filter and its default, the PATCH rules and errors, the CSV columns, the sync `detection` object, and the `card-spends` seed.

Check by hand with `curl`: `GET /movements` excludes the dismissed row. `?review=dismissed` returns it. `?review=bad` is 400. `PATCH` on a P2P row with `{"review":"confirmed"}` is 422. `{"kind":"copy_trading"}` confirms. `{"review":"suspected"}` restores `suggested_kind`.

**Size:** about 250 changed lines, 1 file.

### Phase 3: Movements list, badges and filters

**Outcome:** SPEC B3 and B4, AC1 to AC3.

| File | Change |
|------|--------|
| `src/modules/movements/MovementParts.tsx` | `ReviewBadge` |
| `src/modules/movements/MovementsTable.tsx`, `MovementCards.tsx` | Render it |
| `src/modules/movements/MovementFilters.tsx` | Review chip group |
| `src/modules/movements/chips.ts`, `FilterChips.test.ts` | Review chip label |
| `src/modules/dashboard/RecentMovements.tsx` | Render `ReviewBadge` |

**Size:** about 150 changed lines, 7 files.

### Phase 4: Drawer detection section and actions

**Outcome:** SPEC B5, AC4 to AC9 and AC14.

| File | Change |
|------|--------|
| `src/modules/movements/DetectionSection.tsx` | New: explanation (`Trans` with a `Sensitive` amount slot), hint and confidence, conflict alert, actions, error alert |
| `src/modules/movements/MovementDrawer.tsx` | Renders it. New fact rows. `onUpdated` and `onDismissed` props |
| `src/modules/movements/MovementsPage.tsx` | `onUpdated = setOpened`. `onDismissed` closes the drawer and shows the Undo toast |

Actions use `useUpdateMovement().mutateAsync` and `actionPatch` from `review.ts`. The drawer's form draft must survive an action: `DrawerForm` is keyed by `movement.id`, so replacing `opened` with the response keeps the key and the draft. Check this by hand (type a reason, click Card spend, and the reason is still typed).

**Size:** about 300 changed lines, 3 files.

### Phase 5: Dashboard

**Outcome:** SPEC B6, AC10 to AC13.

| File | Change |
|------|--------|
| `src/modules/dashboard/labelPatch.ts` + test | `review: "confirmed"` for a suspected row. `labelUndoPatch` |
| `src/modules/dashboard/LabelCard.tsx` | `ReviewBadge`, the two buttons and their props |
| `src/modules/dashboard/LabelQueue.tsx` | Handlers through the existing optimistic `save`, Undo with `undoPatch`, the review link with its count query |
| `src/modules/dashboard/queries.ts` | `reviewCount`, `unconfirmedSpending` |
| `src/modules/dashboard/SpendingCard.tsx` | The unconfirmed line |

**Size:** about 200 changed lines, 6 files.

### Phase 6: Manual check and review

With the fake API (`pnpm fake-api`, then `VITE_BACKEND_ENDPOINT=http://localhost:8099 pnpm dev`, log in as `test@example.com` / `password`, flag `{"account": "card-spends"}`):

1. Go through AC1 to AC15 at 1280 px and 390 px, in English and Spanish, with balances shown and hidden.
2. With `{"account": "populated"}`, the dashboard and Movements look as before, apart from the new kind chips (no review link, no unconfirmed note).
3. Against the real backend once its E2E is done: AC16.

Review: no `Number(` on an amount, every new amount in `Sensitive`, no hard-coded text, and the 44 px minimum on the new buttons and chips.

## Expected Files

### Create
- `src/modules/movements/review.ts`, `review.test.ts`
- `src/modules/movements/DetectionSection.tsx`

### Modify
- `src/modules/shared/api-schema.d.ts` (generated), `api-errors.ts`, `helpers.test.ts`
- `src/modules/movements/types.ts`, `labels.ts`, `search.ts`, `search.test.ts`, `spending.ts`, `spending.test.ts`, `chips.ts`, `FilterChips.test.ts`, `MovementParts.tsx`, `MovementsTable.tsx`, `MovementCards.tsx`, `MovementFilters.tsx`, `MovementDrawer.tsx`, `MovementsPage.tsx`
- `src/modules/dashboard/movementText.ts`, `movementText.test.ts`, `labelPatch.ts`, `labelPatch.test.ts`, `LabelCard.tsx`, `LabelQueue.tsx`, `queries.ts`, `SpendingCard.tsx`, `RecentMovements.tsx`
- `src/locales/en.json`, `es.json`
- `scripts/fake-api.mjs`

## Risks

| Risk | Mitigation |
|------|------------|
| `Record<MovementKind, …>` and exhaustive `switch`es break the build after `api:generate` | Expected. Phase 1 fixes every one |
| The drawer shows stale review state after an action | `onUpdated` replaces `opened` with the PATCH response (Phase 4 check) |
| Spending totals jump once suspected card spends are counted | That's the point of the change. The unconfirmed note explains it, and Q1 can flip the rule |
| Conflicts with categories-tags-page in shared files | Build after it (Dependency) |
| Badge text upper-cased by Mantine | `tt="none"` |

## Implementation State

Not started.
