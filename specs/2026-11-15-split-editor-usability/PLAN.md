---
title: "Implementation Plan: Split Editor Usability"
change: split-editor-usability-1
type: feature
spec: ./SPEC.md
issue: none
created: 2026-11-15
updated: 2026-11-15
sdd_version: 7.3.0
---

# Implementation Plan: Split Editor Usability

**Spec:** [SPEC.md](./SPEC.md). Behaviour, acceptance criteria and tests are there.

Rules:
- Never commit. Never open, read, `cat`, `grep` or print `.env` or any `.env.*` file. Tell every subagent this.
- Don't touch `specs/INDEX.md` or `specs/ROADMAP.md`.
- No new dependency (`@tabler/icons-react` is already installed). The locale files are shared: only add or remove the listed keys.
- Each phase ends with `pnpm verify` (API check, lint, tests, build) passing.

## Phase 1: Save keeps the drawer open

**Outcome:** SPEC B1 to B7, with unit tests. The split section looks the same as before.

| File | Change |
|------|--------|
| `src/modules/movements/patch.ts` | `hasUnsavedChanges(movement, draft, tagText)`, moving `DrawerForm`'s inline `changed` and `splitPending` logic into it. |
| `src/modules/movements/patch.test.ts` | The SPEC's `hasUnsavedChanges` cases. |
| `src/modules/movements/MovementDrawer.tsx` | Save's `disabled` uses the helper. `save` keeps the response, calls `onUpdated`, resets the draft and errors, shows the toast, and doesn't close. The no-change path folds and stays open. Focus is restored as B3 says (remember the active element at submit, restore it in an effect after `update.isPending` turns false). The created-category hint shows only while unsaved. The `onUpdated` doc comment is updated. |

3 files, roughly 120 to 160 changed lines, about half of them tests. `MovementsPage.tsx` doesn't change.

**Check:** AC5 to AC12 against the fake API (account `splits`), with the old split layout.

## Phase 2: Split section layout

**Outcome:** SPEC B8 to B14, and AC1 to AC4 and AC13.

| File | Change |
|------|--------|
| `src/modules/movements/SplitSection.tsx` | Header row with the "Add a part" button (`IconPlus`) and the limit note. The empty state's button and the bottom button are removed. Each part is a bordered block with its label row (color dot, "Part N", trash). The new part's category select gets focus through a pending-focus key ref. |
| `src/locales/en.json`, `src/locales/es.json` | Add `movements.split.part`, remove `movements.split.start`. |

3 files, roughly 100 to 140 changed lines.

**Check:** all of the SPEC's manual checks, at 1280 px and 375 px, in en and es, by keyboard and by mouse. Before removing `movements.split.start`, `grep` for it to confirm nothing else uses it.

## After

- Report the result so the orchestrator can update `specs/INDEX.md`.
- Answer the SPEC's Q1 and Q2 before Phase 2, or build them with the planned answers.

## Implementation State

Built 2026-11-15. Both phases are implemented. Q1 and Q2 were resolved in the SPEC before Phase 2: the header button is the only add control, and a save keeps the scroll position.

### Files

- Modified: `src/modules/movements/patch.ts` (`hasUnsavedChanges`), `src/modules/movements/patch.test.ts` (9 cases), `src/modules/movements/MovementDrawer.tsx` (save stays open, response resyncs the draft, focus restore, created-category hint only while unsaved), `src/modules/movements/SplitSection.tsx` (header button, part blocks, focus of a new part), `src/locales/en.json`, `src/locales/es.json` (`movements.split.part`, removed `movements.split.start`), `specs/2026-11-15-split-editor-usability/SPEC.md` (resolved questions), `specs/INDEX.md`.
- `src/modules/movements/MovementsPage.tsx` didn't change: it already puts `onUpdated` in `opened`.
- No new dependency. `grep` confirmed `movements.split.start` had no other use before it was removed.

### Commands

| Command | Result |
|---|---|
| `pnpm verify` | ok: API check, lint, 528 tests in 37 files, build |
| `pnpm test` | 528 passed, 0 failed (37 files), 9 of them new `hasUnsavedChanges` cases |
| `node scripts/fake-api.mjs` + `VITE_BACKEND_ENDPOINT=http://localhost:8099 pnpm dev --port 5173 --strictPort` | manual checks in headless Chrome (system Chrome through an existing Playwright install, not added to the project) |
| fake API state | `{"account":"splits","moreCategories":true}`; login and read-only Binance key set through the API |

### Manual checks

113 scripted browser assertions, all passing. Screenshots: `/tmp/opencode/split-editor-desktop.png`, `/tmp/opencode/split-editor-mobile.png`, `/tmp/opencode/split-editor-mobile-parts.png`.

- AC1: one "Add a part" button, with `IconPlus`, in the header next to "Split this movement"; no button under the parts and no "Split this movement" button in the empty state.
- AC2: three adds produced Part 3, Part 4 and Part 5 at the end; each new category select had focus and was scrolled into view. Also checked for Part 1 through Part 20 on a no-parts movement.
- AC3: at 20 parts the header button was disabled and "Up to 20 parts" showed.
- AC4: a movement with no parts showed the intro and the header button, which added "Part 1".
- AC5: after saving, the drawer stayed open, "Movement saved." showed, the five parts and the bar showed the response values (the blank sixth part was gone), and Save was disabled.
- AC6: after editing an amount, Save enabled and the second PATCH sent only `splits`, with the new amount.
- AC7: a blank part added before the save was gone from the response and the drawer.
- AC8: typing `trip-2026`, already on the movement, then saving sent no request, kept the drawer open, cleared the text and disabled Save.
- AC9: with PATCH failing as 500, the drawer stayed open with the red alert and the typed amount.
- AC10: on `{"account":"card-spends"}`, picking a kind kept the drawer open; Dismiss closed it and showed the Undo toast.
- AC11: a category created in the drawer showed the hint while unsaved; after the save the hint was gone and the category stayed selected.
- AC12: after closing, the row's split label was "Split into 6: Supermarket, Transport, +4"; reopening showed the five saved parts, the saved amount and `Verification`, with Save disabled.
- AC13: at 375 px in Spanish, "Dividir este movimiento" and "Agregar una parte" didn't overflow (`scrollWidth` 375), "Parte 1"/"Parte 2" showed, and every part control's visible field was at least 44 px tall.
- Focus: the fallback after a mouse save landed on the reason field; a keyboard save (Enter in the USD input) returned focus to that input. Both used `preventScroll`, and the drawer's `scrollTop` was unchanged across both saves (Q2).
- Console: no unexpected errors; the deliberate 401 before login and 500 from AC9 were the only ones.

### Deviations from the plan

- The SPEC's keyboard check says "Enter in the reason field", but the reason is a `Textarea`, where Enter inserts a newline. The keyboard save was checked with Enter in the USD input; the mouse save was checked with the Save button, whose focus falls back to the reason field as B3 says.
- AC10 needs a detected movement, which the `splits` account doesn't seed, so it was checked with `{"account":"card-spends"}` (as the fake API documents); all other manual checks used `splits`.
- AC4, AC3 and AC8 share a priced Pay transfer with the `trip-2026` tag and no parts, so they could be checked without saving the 20-part draft.
- AC13's "every part control is at least 44 px tall" was measured on the visible field wrappers: Mantine's tags input has a 44 px wrapper around its 25.6 px inner input, which is the control a user taps.
- The app is dark-only, so the screenshots are dark.
