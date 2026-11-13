---
title: "Implementation Plan: Movement Splits"
change: movement-splits-1
type: feature
spec: ./SPEC.md
issue: none
created: 2026-11-13
updated: 2026-11-13
sdd_version: 7.3.0
---

# Implementation Plan: Movement Splits

**Spec:** [SPEC.md](./SPEC.md). The behaviour (B1 to B8), the design tables, the translations, the acceptance criteria and the unit tests are there. This plan gives the order, the files and the checks.

Rules for every phase:
- Never commit. Never open, read, `cat`, `grep` or print `.env` or any `.env.*` file. Tell every subagent this.
- Money stays a decimal string. Math goes through `shared/money.ts` or big.js, formatting through `shared/format.ts`, never `Number(...)`. The one exception is the bar's CSS width, from `percentOf`. Wrap every new amount in `Sensitive`.
- Don't touch `specs/INDEX.md` or `specs/ROADMAP.md` (the orchestrator does).
- No new dependency.
- Each phase ends with `pnpm lint && pnpm test && pnpm build`, all passing, and `git status --short` in the report. Phases after a backend schema change run `pnpm api:generate` first, then `pnpm api:check`. If something outside the phase's file list seems to need a change, stop and say so.
- Keep each phase under about 400 changed lines (the generated `api-schema.d.ts` excluded) and 15 files.
- Record files, results and drift from the SPEC under Implementation State.

## Dependency

- **Frontend** `2026-11-13-card-spend-detection` must be fully built first (it edits `MovementDrawer.tsx`, `MovementsTable.tsx`, `MovementCards.tsx`, `LabelCard.tsx`, `movementText.ts`, `spending.ts`, `api-errors.ts`, `helpers.test.ts`, the locales and `fake-api.mjs`).
- **Backend** `../backend/specs/2026-11-13-movement-splits/` through its Phase 3 for the types (Phase 1 here), and through Phase 5 for AC16. Phase 1 starts with `pnpm api:generate`: if `movements.MovementResponse` has no `splits`, `split_status` or `split_rest_usd`, or `movements.UpdateMovementRequest` has no `splits`, stop.
- Phase 2 (fake API) doesn't need the backend and may run before Phase 1, but only after card-spend's fake API phase.

## Phases

### Phase 1: Types and pure split logic

**Outcome:** the app builds with the new schema; the split helpers, the draft and patch changes, `needsLabel` and the error map exist and are unit-tested; every string is in both locales. No visible UI change.

| File | Change |
|------|--------|
| `src/modules/shared/api-schema.d.ts` | `pnpm api:generate` |
| `src/modules/movements/types.ts` | `Split`, `SplitStatus`, `SplitRequest` |
| `src/modules/movements/splits.ts` + `splits.test.ts` | New (SPEC Data layer) |
| `src/modules/movements/patch.ts` + `patch.test.ts` | `splits` in the draft and the patch |
| `src/modules/movements/spending.ts` + `spending.test.ts` | `needsLabel`, comments (SPEC B5, B6) |
| `src/modules/dashboard/movementText.ts` + test | Split filing |
| `src/modules/shared/api-errors.ts`, `helpers.test.ts` | Two texts |
| `src/locales/en.json`, `es.json` | SPEC translations table |

Fix any test fixture that builds a `Movement` by hand (the three new required fields). **Size:** about 380 changed lines, 14 files. If fixtures push it past 15 files, move `movementText` to Phase 4.

### Phase 2: Fake API

**Outcome:** `pnpm fake-api` answers like the backend change, with the `splits` account (SPEC Fake API).

Only `scripts/fake-api.mjs`. Check by hand with `curl`: the $100 sale lists its parts and `split_rest_usd: "50"`; `PATCH` with `usd_amount: 20` (a number) is 400 `invalid split`; 21 parts is 400 `too many splits`; parts on the unpriced row are 422 `movement is not priced`; `totals?group_by=category` with the spending filter gives Supermarket, Transport and Food as in SPEC AC8; `category_id=none` excludes the fully split row.

**Size:** about 300 changed lines, 1 file.

### Phase 3: Drawer editor

**Outcome:** SPEC B1 to B3 in the drawer.

| File | Change |
|------|--------|
| `src/modules/movements/SplitSection.tsx` | New |
| `src/modules/movements/SplitBar.tsx` | New |
| `src/modules/movements/MovementDrawer.tsx` | Draft parts, "Category of the rest", save checks, part tag folding |

**Checks:** the phase commands; by hand with the fake API: AC1 to AC5, AC9, AC10, AC12, AC13 at 1280 px and 390 px. **Size:** about 380 changed lines, 3 files.

### Phase 4: List, cards and dashboard

**Outcome:** SPEC B4 and B5 outside the drawer.

| File | Change |
|------|--------|
| `src/modules/movements/SplitSegments.tsx` | New |
| `src/modules/movements/MovementsTable.tsx` | Segments instead of the `Select` for split rows; waiting note |
| `src/modules/movements/MovementCards.tsx` | Segments filing line |
| `src/modules/dashboard/LabelCard.tsx` | Rest line |
| `src/modules/dashboard/RecentMovements.tsx` | Only if `movementFiling`'s new text needs `Sensitive` there |

**Checks:** the phase commands; by hand: AC6 to AC8, AC11. **Size:** about 200 changed lines, 5 files.

### Phase 5: Manual check and review

With the fake API (`pnpm fake-api`, then `VITE_BACKEND_ENDPOINT=http://localhost:8099 pnpm dev`, log in as `test@example.com` / `password`, flag `{"account": "splits"}`):

1. AC1 to AC15 at 1280 px and 390 px, in English and Spanish, with balances shown and hidden.
2. With `{"account": "populated"}` and `{"account": "card-spends"}`, the app looks as before.
3. Against the real backend after its E2E: AC16.

Review: no `Number(` on an amount except the bar width, every new amount in `Sensitive`, no hard-coded text, 44 px minimum on the new buttons, no amounts in `aria-label`s.

## Expected Files

### Create
- `src/modules/movements/splits.ts`, `splits.test.ts`
- `src/modules/movements/SplitSection.tsx`, `SplitBar.tsx`, `SplitSegments.tsx`

### Modify
- `src/modules/shared/api-schema.d.ts` (generated), `api-errors.ts`, `helpers.test.ts`
- `src/modules/movements/types.ts`, `patch.ts`, `patch.test.ts`, `spending.ts`, `spending.test.ts`, `MovementDrawer.tsx`, `MovementsTable.tsx`, `MovementCards.tsx`
- `src/modules/dashboard/movementText.ts`, `movementText.test.ts`, `LabelCard.tsx`, maybe `RecentMovements.tsx`
- `src/locales/en.json`, `es.json`
- `scripts/fake-api.mjs`

## Risks

| Risk | Mitigation |
|------|------------|
| The drawer's draft gets large and Save logic tangled | All rules are pure in `splits.ts`/`patch.ts` and unit-tested; the components only render |
| Drawer rest differs from the backend's by a rounding detail | The drawer's rest is display only; the sub-cent rule is mirrored and tested; the response is the truth after save |
| Fake API portion math drifts from the backend | Built from the backend FR3 text with the existing decimal helpers; AC16 against the real backend |
| Conflicts with card-spend-detection in shared files | Build after it (Dependency) |
| Hand-built `Movement` fixtures break on the new fields | Phase 1 fixes them |

## Implementation State

Built. All phases done; the manual browser check (Phase 5) was skipped as instructed, and the review points were checked in code.

### Decisions recorded in the SPEC

- **Dismissal:** dismissing a detected movement keeps its parts; restoring it brings them back. No frontend special case was needed, since a dismissed row's portions count nowhere meanwhile.
- **Hide Balances:** the USD inputs stay usable while editing parts; every read-only amount is masked. Q1 is recorded as resolved.

### Phases

- **Phase 1: types and pure split logic.** Files: `src/modules/movements/types.ts`, new `splits.ts` + `splits.test.ts`, `patch.ts` + `patch.test.ts`, `spending.ts` + `spending.test.ts`, `src/modules/dashboard/movementText.ts` + `movementText.test.ts`, `src/modules/shared/api-errors.ts`, `helpers.test.ts`, `src/locales/en.json`, `es.json`, plus the new required fields in the `Movement` fixtures of `movements/hooks.test.ts` and `movements/review.test.ts`. `pnpm api:check` passed against the generated `api-schema.d.ts` (not edited by hand). Result: lint, test (447) and build passed.
- **Phase 2: fake API.** `scripts/fake-api.mjs`: the three response keys on every movement, `splits` in PATCH with the backend's validation order and texts, portions for the list, export, totals and tag counts, the CSV's three new columns, part category/tag maintenance, and the `splits` account (plus Supermarket and Transport). Checked with `curl`: `splits` and `split_rest_usd` on the $100 sale, `usd_amount` as a number is 400 `invalid split`, 21 parts is 400 `too many splits`, parts on the unpriced row is 422 `movement is not priced`, over-value parts is 422 `splits exceed movement value`, an unknown category is 404, the Supermarket filter lists the three AC11 movements, `category_id=none` excludes the fully split row, `group_by=category` puts the parts and rests in their categories with distinct counts, `DELETE /categories/:id` nulls parts and `DELETE /tags/:id` clears part tags. Result: lint, test (447) and build passed.
- **Phase 3: drawer editor.** New `movements/SplitSection.tsx` and `movements/SplitBar.tsx`; `MovementDrawer.tsx` holds `draft.splits`, the "Category of the rest" label, the save checks, part-tag folding and the first-error focus. Result: lint, test (447) and build passed.
- **Phase 4: list, cards and dashboard.** New `movements/SplitSegments.tsx`; `MovementsTable.tsx` (segments, the exceeds icon and the waiting note), `MovementCards.tsx` (segments filing and the waiting note), `dashboard/LabelCard.tsx` (the split rest line) and `dashboard/RecentMovements.tsx` (one segment plus `+n`, amounts masked). No code change in `spendingBreakdown`, `SpendingCard` or `CategoriesPage`; the two `spending.ts` comments from B6 are in Phase 1. Result: lint, test (447) and build passed.
- **Phase 5: manual check and review.** Skipped as instructed. Static review: no `Number(` on an amount except the bar's CSS width (`SplitBar.tsx`); every read-only amount is in `Sensitive`; no new hard-coded text (the amount placeholder is `0.00`); new buttons use `mih={44}` or `size={44}`; aria labels carry no amounts; the USD inputs are not masked (recorded decision). `specs/INDEX.md` was set to `built`; `specs/ROADMAP.md` was left alone.

### Drift from the PLAN

- `SplitDraft` gained an optional `missingCategory: true`, set by `splitDraftsOf` for a part whose category was deleted. Without it the part's Select would only show "Pick a category" after a save, while B2/AC12 require it as soon as the drawer opens. It's cleared when a category is picked and ignored by `normalisedSplits`/`sameSplits`.
- `movementFiling` gained an optional `categoryNameOf` argument and returns optional `segments`/`more`, because Recent movements must resolve the part categories and mask the amounts. The function still returns `{text, needsLabel}` as before.
- The first-error focus uses a `focusNonce` prop and a `SplitSection` effect rather than an imperative ref; the PLAN didn't name the mechanism.
- In the fake API's `splits` account, the `exceeds` and `unpriced` parts use Transport rather than Supermarket, so the Supermarket filter lists exactly the three movements AC11 names. The $60 fully split movement still uses Supermarket and Transport.
- The bar sections use `withAria={false}`, so the percentages (derived from masked amounts) aren't exposed as ARIA values; the visible summary and the tooltips carry the data.
- The fake API computes statuses, rests and portions with exact decimal helpers, adding `subDec`, `roundDec` and `divRoundDec`; `Number` is never used for money.

### Final checks

`pnpm lint`, `pnpm test` (447 tests, 33 files) and `pnpm build` all passed after Phase 4 and after the final SPEC/PLAN/INDEX edits. `git status --short` shows only the files above plus the generated `src/modules/shared/api-schema.d.ts`; nothing is committed.
