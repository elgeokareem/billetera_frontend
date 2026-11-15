---
title: Split Editor Usability
spec_type: tech
type: feature
status: draft
domain: Portfolio
issue: none
created: 2026-11-15
updated: 2026-11-15
sdd_version: 7.3.0
---

# Split Editor Usability

## Problem

User feedback on the movement drawer (`src/modules/movements/MovementDrawer.tsx`, `src/modules/movements/SplitSection.tsx`):

1. **"Add a part" is easy to miss.** With one part or more, the only way to add another is a text-only `subtle` button below the last part's "Tags of this part" field. Users miss it and assume a movement splits into one category only. The parts also run together, with nothing between one part's tags and the next part's category.
2. **Saving closes the drawer.** `save` calls `onClose()` on success and when there is nothing to save. The user wants to stay in the drawer after a save, for example to keep adjusting parts.

### Current state

- `MovementDrawer` is opened only from `MovementsPage`, which keeps the opened movement in `opened` state, a snapshot taken when the drawer opened, so a refetch can't close it. The dashboard doesn't use the drawer: `LabelQueue` has its own inline form, and `RecentMovements` doesn't open it.
- `DrawerForm` is keyed by `movement.id`. Its `draft` is built once with `draftOf(movement)`. Dirtiness is computed inline: `changed` (a non-empty `patchFor(movement, draft)`), a typed tag (`tagText`), and `splitPending` (the normalised parts differ from the saved ones, or a part has typed tag text or an incomplete row). Save is disabled when none of these holds, or while a category is being created. Every field is disabled while the save runs.
- `useUpdateMovement` invalidates `movementKeys.all` and `tagKeys.all` on settle. `updateMovement` returns the saved `Movement`, but `save` throws it away.
- `DetectionSection` already keeps the drawer open after a review action: it passes the PATCH response to `onUpdated`, and `MovementsPage` puts it in `opened`. The draft isn't reset, so typed values stay. Dismiss calls `onDismissed`, and the page closes the drawer and shows the Undo toast.
- The only caller that relies on close-after-save is `MovementsPage`, through `onClose={() => setOpened(null)}`. No test asserts it: there are no component tests, and `patch.test.ts` covers only `patchFor` and `draftOf`.

## Behaviour

### Saving keeps the drawer open

**B1. Dirty check.** A pure `hasUnsavedChanges(movement, draft, tagText): boolean` in `src/modules/movements/patch.ts` replaces the inline `changed || tagText || splitPending` logic in `DrawerForm`, with the same result. Save's `disabled` uses it (still also disabled while a category is being created).

**B2. Success.** `save` keeps the PATCH response (`updated`) and then, in this order:
- It calls `onUpdated(updated)`. `MovementsPage` puts it in `opened` (no change there), so the title, the details list, the split bar and the `exceeds` alert show the server's data.
- It resets the form from `updated`: `draft = draftOf(updated)`, `tagText = ""`, and no tag, part-tag or split errors. Parts, amounts as the server formats them, tags, the rest category and the bar come from the response. Blank parts disappear.
- The `movements.drawer.saved` toast shows, as today.
- It doesn't call `onClose`.

Since `draftOf(updated)` matches `updated`, `hasUnsavedChanges` is false and Save turns disabled. A part whose category was deleted still counts as needing a fix (B1 keeps today's rule), so Save stays enabled for that movement, as it does when the drawer opens.

**B3. Focus after success.** While the save runs every field is disabled, so the browser drops focus. When the save finishes, focus goes back to the element that had it when the save started, if it's still in the drawer and enabled. Otherwise, as when Save was clicked and is now disabled, it goes to the reason field. Either way it uses `focus({ preventScroll: true })`, so the drawer doesn't scroll.

**B4. Nothing to save.** `save` sends nothing and stays open when the body turns out empty. This happens only when Save was enabled by typed tag text that folds into tags already there. The folded tags and parts go into the draft and `tagText` is cleared, so Save turns disabled. No toast. Implicit submission (Enter in a field) does nothing while Save is disabled, as today.

**B5. Failure.** Unchanged: the drawer stays open with the red alert, and the typed values stay.

**B6. Created category hint.** `movements.drawer.createdHint` ("Save changes to file this movement under it") shows only while the selected created category is unsaved, meaning `draft.category` differs from the saved `category_id`. The `created` list is kept, so the option stays in the select until the categories query refetches it.

**B7. Detection and closing.** Unchanged: kind, keep and restore keep the drawer open through `onUpdated`, and dismiss closes it through `onDismissed`. The drawer still closes with its close button, Escape and the overlay. The `onUpdated` prop's doc comment changes to "a PATCH response from a save or a review action".

### Split section

**B8. Header button.** When the movement can be split (`canSplit`), the section's header is a row (`Group justify="space-between" wrap="wrap"`) with the title on the left and an "Add a part" button on the right: `variant="light"`, `radius="xl"`, `mih={44}`, `leftSection` set to Tabler `IconPlus` at 18 px (`aria-hidden`). It shows with no parts too, and then it adds the first part. It's disabled while the form is busy, and when there are `MAX_SPLITS` (20) parts. At the limit, the existing `movements.split.limit` note ("Up to 20 parts") shows under the header. At mobile width the button wraps under the title when the row is too narrow.

**B9. Empty state.** With no parts, the intro text (`movements.split.intro`) stays, and the old "Split this movement" button is removed. The header button is the only way to add a part.

**B10. Bottom button removed.** The `subtle` "Add a part" button under the parts is removed.

**B11. Where a new part goes.** It's appended. Position order is the order in which the parts count against the value (`exceeds`) and the order of the bar's colors. After it's added, its category select gets focus, which scrolls it into view. The focus is set in an effect once the row is mounted, for that row's key only.

**B12. Part blocks.** Each part is a bordered block (`Paper withBorder radius="md" p="sm"`):
- A label row: a 10 px dot in the part's bar color (`SPLIT_COLORS[index % length]`, `aria-hidden`), then "Part N" (`movements.split.part`, `size="sm" fw={600}`), then, on the right, the existing trash `ActionIcon` (44 px, `aria-label` "Remove part N").
- The category select and the USD input: one row on desktop. On a narrow screen the select takes the full width and the amount goes under it, as today.
- The part's tags field.

The blocks are separated by the stack's gap (`md`). The parts' `aria-label`s ("Category N", "USD N") are unchanged.

**B13. Read-only parts.** No change to the unpriced or zero-value view: it shows no header button and no blocks.

**B14. Texts.**

| Key | en | es |
|-----|----|----|
| `movements.split.part` | `Part {{n}}` | `Parte {{n}}` |

`movements.split.start` is no longer used and is removed from both locales. `movements.split.add` is reused for the header button.

## API

No new call. `PATCH /movements/:id` as today. Its response (`movements.MovementEnvelope.movement`) now resyncs the drawer.

## Acceptance Criteria

- **AC1:** Given a movement with one part, when the drawer opens, then an "Add a part" button with a plus icon shows next to the "Split this movement" title, and none shows under the parts.
- **AC2:** Given two parts, when the user clicks "Add a part", then a third "Part 3" block appears at the end, and its category select has focus and is visible.
- **AC3:** Given 20 parts, then "Add a part" is disabled and "Up to 20 parts" shows.
- **AC4:** Given a movement with no parts, then the intro text and the header button show, and the button adds "Part 1".
- **AC5:** Given changed parts, when the user saves and it succeeds, then the drawer stays open, "Movement saved." shows, the parts and the bar match the server's response, and Save is disabled.
- **AC6:** Given a save that succeeded, when the user changes a part's amount, then Save enables again, and a second save sends only the `splits` key.
- **AC7:** Given a blank part was added and other changes were saved, then after the save the blank part is gone.
- **AC8:** Given the user typed a tag already on the movement and pressed Save, then no request is sent, the drawer stays open, the typed text is cleared, and Save is disabled.
- **AC9:** Given a failed save, then the drawer stays open with the red alert and the typed values, as today.
- **AC10:** Given a suspected movement, when the user picks a kind, then the drawer stays open. When the user dismisses it, then the drawer closes and the Undo toast shows.
- **AC11:** Given a category created in the drawer and saved, then the "Save changes to file this movement under it" hint is gone, and the category stays selected.
- **AC12:** Given the movements list behind the drawer, after a save then a close, then the row shows the saved values.
- **AC13:** At 375 px in Spanish, the header ("Dividir este movimiento" and "Agregar una parte") doesn't overflow, every part control is at least 44 px tall, and the "Parte N" labels show.

## Unit tests

| File | Cases |
|------|-------|
| `src/modules/movements/patch.test.ts` | `hasUnsavedChanges`: `draftOf(m)` with empty `tagText` → false, for a movement with no parts and for one with parts whose amounts are `"12.50"` and `"3"` (the server's format round-trips); a changed reason, category or tag → true; typed `tagText` → true; a part's `tagText` → true; an added blank part → false; an incomplete part (category but no amount) → true; a saved part with a deleted category (`category_id: null`) → true, as today. After save: given a draft with changed parts and a response movement with those parts, `hasUnsavedChanges(response, draftOf(response), "")` → false. |

The focus, scroll and layout behaviour isn't unit-tested (Vitest runs in node, with no DOM).

Manual checks against the fake API (`node scripts/fake-api.mjs`, account `splits`): AC1 to AC13, at 1280 px and 375 px, in English and Spanish, by keyboard (Tab to the header button, Enter, focus lands on the new select; save with Enter in the reason field, focus returns to it) and by mouse. The app is dark-only, so there's no light-theme pass.

## Decisions

| ID | Decision | Rejected |
|----|----------|----------|
| D1 | Append new parts and focus the new category select | Prepend: it would reorder the parts, which changes the `exceeds` counting order and the bar colors |
| D2 | One add control, in the header, with or without parts | Keep the bottom button as well, or keep the empty state's own "Split this movement" button: two controls for one action, and the bottom one is the one users missed |
| D3 | Bordered block per part, with a "Part N" label, a color dot and the trash icon | Divider only: weaker grouping, and the trash icon would stay crowded next to the amount on mobile |
| D4 | Resync the whole draft from the response | Keep the draft and only update `movement`: blank parts and differently formatted amounts would make Save look dirty again |
| D5 | Reuse `onUpdated` for the save response | A new prop: `MovementsPage.onUpdated` already does exactly this |
| D6 | Focus returns to where it was, else to the reason field without scrolling | Focusing the close button: Enter would then close the drawer |

## Resolved Questions

- **Q1 (resolved 2026-11-15, yes).** The header "Add a part" button is the only add control. The bottom button and the empty state's "Split this movement" button are removed, with the then-unused `movements.split.start` key, as D2 and B9/B10 plan.
- **Q2 (resolved 2026-11-15, stay).** A successful save keeps the scroll position. The drawer doesn't scroll to the top.
