---
title: Card Spend Detection
spec_type: tech
type: feature
status: draft
domain: Portfolio
issue: none
created: 2026-11-13
updated: 2026-11-13
sdd_version: 7.3.0
---

# Card Spend Detection

## Problem

Binance Card purchases and Copy Trading moves aren't in any Binance API the backend reads, so they never appear in Movements, and spending is under-counted. The backend change `../backend/specs/2026-11-13-card-spend-detection/SPEC.md` detects them from balance drops and gains between snapshots that no known movement explains. It stores them as movements with `source = "detector"`, a new kind, and a `review_status`. This change shows them in the app and lets the user review them: confirm a card spend, call it copy trading or another transfer, or dismiss it. Card spends count as spending. Copy trading and transfers don't.

## Backend dependency

This needs the backend change built through its Phase 7, then `pnpm api:generate`. Exact rules are in the backend SPEC. In short:

- `Movement.kind` gains `card_spend`, `copy_trading` and `transfer`. `source` can be `"detector"`.
- Every movement has `review_status`: `"suspected" | "confirmed" | "dismissed" | null` (null for Binance rows). It also has `detection`, which is `null` for Binance rows, or:
  `{ suggested_kind, rule: "unexplained_drop"|"round_amount"|"copy_pair"|"unexplained_gain", confidence: "low"|"medium"|"high", wallet: "spot"|"funding"|"both", window_start, window_end, spot_change, funding_change, explained_change, paired_movement_id: number|null, conflict: boolean }`. The changes are signed decimal strings.
- Detected rows are `status: "completed"`, `occurred_at = window_end`, priced like any movement (so `usd_value` may be `null` with `usd_price_status: "pending"` for a while).
- Filters on `GET /movements`, `/totals` and `/export`: `kind` accepts the three new kinds. `review` takes a comma list of `none,suspected,confirmed,dismissed`. **Without `review`, dismissed rows are excluded.** `none` means rows from Binance.
- `PATCH /movements/:id` takes `kind` (one of the three, which also confirms) and `review` (`confirmed` | `dismissed` | `suspected`). `suspected` restores the row and sets its kind back to `detection.suggested_kind`. Confirming or dismissing clears `conflict`. Either key on a Binance row is 422 `movement is not detected`. They combine with `reason`, `category_id` and `tags` in one call.
- `POST /binance/movements/sync` gains `detection: { status, windows, created, updated, retracted, conflicts }`. This change doesn't use it (see Out of scope).
- The CSV gains four columns at the end. Nothing to do here, since the export is a file download.

## Current state

- Kinds: `MOVEMENT_KINDS` in `src/modules/movements/search.ts`, `KIND_KEYS` in `labels.ts`, and `kindKey` in `src/modules/dashboard/movementText.ts`. `KIND_KEYS` is a `Record<MovementKind, string>`, so the build fails until the new kinds are added.
- Spending: `SPENDING_KINDS = withdrawal, p2p, pay`, `SPENDING_FILTER` (direction out, completed), `isSpending` and `needsLabel` in `src/modules/movements/spending.ts`. The dashboard label queue (`LabelQueue.tsx`, `LabelCard.tsx`, `labelPatch.ts`, `queries.ts`) shows this month's spending with no category. Picking a category is optimistic, with an Undo toast.
- Movements: `MovementsPage.tsx` holds the opened movement as an object (`opened`) and renders `MovementDrawer`. `MovementsTable.tsx` and `MovementCards.tsx` show `StatusBadge` (`MovementParts.tsx`). `MovementFilters.tsx` has chip groups for kind and status. Active filters show as chips (`chips.ts`, `FilterChips.tsx`). The URL is the filter state (`parseMovementsSearch`, `toMovementsQuery`).
- `useUpdateMovement` invalidates every movements and tags query on settle.
- Money is a decimal string (`shared/money.ts`, `shared/format.ts`). Amounts go through `Sensitive` for Hide Balances.
- The fake API (`scripts/fake-api.mjs`) mirrors the backend for manual checks, with account kinds selected by flags.

## Scope

1. Types and the new kinds everywhere kinds are named.
2. Spending includes card spends.
3. Movements: badges, filters (kind and review), and a detection section with quick actions in the drawer.
4. Dashboard: quick actions on label cards for possible card spends, a link to everything still to review, and a note on the spending card.
5. Fake API support.
6. EN and ES strings.

## Behaviour

### B1: Kinds and labels

| `kind` | Label (en) | Label (es) |
|--------|------------|------------|
| `card_spend` | Card spend | Gasto con tarjeta |
| `copy_trading` | Copy trading | Copy trading |
| `transfer` | Other transfer | Otra transferencia |

These appear in the kind filter chips (8 kinds now), the active-filter chips, the table's kind column, card titles and drawer titles (through `kindKey` and `movementTitle`).

### B2: Spending

- `SPENDING_KINDS` becomes `withdrawal, p2p, pay, card_spend`. `SPENDING_FILTER` follows, so the Spending card, the label queue, its count, the "Needs a label" preset and the Categories page totals all include card spends, suspected and confirmed (backend Q1 default). Dismissed rows are excluded by the backend default.
- `isSpending` also requires `review_status !== "dismissed"`, so a dismissed row opened by a direct filter is never labelled as needing a label.
- Copy trading and transfers are never spending, whatever their direction.

### B3: Review badge

`ReviewBadge` (in `MovementParts.tsx`) is shown next to `StatusBadge` in the table, the cards, the dashboard label card and Recent movements. It shows at most one badge, chosen in this order:

| Condition | Text (en) | Color |
|-----------|-----------|-------|
| `detection.conflict` | Check this | red |
| `review_status = "dismissed"` | Dismissed | gray |
| suspected `card_spend` | Possible card spend | yellow |
| suspected `copy_trading` | Possible copy trading | yellow |
| suspected `transfer` | Unexplained change | yellow |
| confirmed, or a Binance row | no badge | |

Badges use `variant="light"`, `radius="sm"`, `size="sm"` and `tt="none"`, like `StatusBadge`.

### B4: Movements filters

- **Kind:** 8 chips, in the order deposit, withdrawal, pay, p2p, convert, card spend, copy trading, other transfer.
- **Review:** a new chip group, multi-select, written to the URL as `review` (a comma list in the API's own words): **To review** (`suspected`), **Confirmed** (`confirmed`), **Dismissed** (`dismissed`), **From Binance** (`none`). No chip selected means the backend default (everything except dismissed). `parseMovementsSearch` keeps only those four items, unique, in any order. `toMovementsQuery` passes `review` through to the list, totals and export.
- Active-filter chips show "Review: To review, Dismissed" and so on, removable like the others. Clear all removes `review`.
- `REVIEW_SEARCH = { review: "suspected" }` is exported for links.

### B5: Drawer, detection section

When `movement.detection !== null`, the drawer shows a **Detected from your balance** section above the label form:

1. **Explanation**, one sentence (`Trans`, with the amount as a `Sensitive` slot): "Your {wallet} {asset} balance went down by {amount} between {from} and {to}, and no Binance record explains it." For a gain, "went up by". `wallet` is Spot, Funding, or "Spot and Funding". `from` and `to` are `window_start` and `window_end` in the user's zone (`formatDateTime`; when both fall on the same day, `to` shows the time only). `amount` is `formatQuantity(movement.amount)`.
2. **Hint** from `rule`, dimmed:
   - `unexplained_drop`: "Binance Card purchases show up like this."
   - `round_amount`: "A round amount like this is often a copy-trading investment."
   - `copy_pair`: "A similar amount came back later, which looks like copy trading." (for a gain: "It matches an earlier copy-trading investment.")
   - `unexplained_gain`: "Money came in with no Binance record: a copy-trading close, a refund or a reward."
   - Followed by the confidence: "Low confidence", "Medium confidence" or "High confidence".
3. **Conflict** (when `detection.conflict`): a yellow `Alert`. Title "This may be counted twice". Body "A Binance record now explains this change, or it was offset later." Two buttons: **Keep it** (`{review: "confirmed"}`) and **Dismiss** (`{review: "dismissed"}`).
4. **Actions**, under "What is it?":
   - Three buttons, Card spend, Copy trading and Other transfer, 44 px tall, wrapping on narrow screens. The button for the current kind is filled when `review_status = "confirmed"` and outlined with a "?" hint when suspected.
     - Clicking the current kind while suspected sends `{review: "confirmed"}`.
     - Clicking another kind sends `{kind}`. The backend confirms it.
     - Clicking the current kind while confirmed does nothing.
   - **Dismiss** (subtle, red) sends `{review: "dismissed"}`. When the row is dismissed, it's replaced by **Restore** (`{review: "suspected"}`), and the three kind buttons are disabled.
   - Every action is its own `PATCH`, sent at once and independent of the form's Save. While one is in flight, all action buttons are disabled and the clicked one shows a loader. The form's fields stay editable. Its draft isn't lost.
   - On success, a toast says "Saved as {kind}.", "Dismissed." or "Restored.". The drawer then shows the PATCH response (`MovementsPage` replaces `opened` with the returned movement). After **Dismiss**, the drawer closes and the toast has an **Undo** button that sends `{review: "suspected"}`.
   - On failure, a red `Alert` under the actions shows `t(getApiErrorKey(error))`, the buttons are enabled again, and nothing else changes.
5. **Details** (the existing fact list) gains rows: Review (To review, Confirmed or Dismissed), Between (`from` to `to`), Wallet, Spot change and Funding change (signed `formatQuantity`, `Sensitive`), and Explained by Binance records (`explained_change`, signed, `Sensitive`). `source` shows "detector" as today.

The drawer's Save is unchanged. Setting a category in the drawer doesn't confirm a suspected row. The actions do that. (In the label card it does: B6.)

### B6: Dashboard

- **Label cards:** a possible card spend (suspected `card_spend`, out, no category) is in the queue because it's spending. Its card shows the "Possible card spend" badge and, under the category buttons, two quiet buttons: **It's copy trading** (`{kind: "copy_trading"}`) and **Not a spend** (`{review: "dismissed"}`).
  - Both follow the queue's optimistic pattern: the card leaves at once, the headline count drops, and the card comes back with the error if the save fails.
  - On success, an Undo toast ("Moved to copy trading." / "Dismissed.") sends `{review: "suspected"}`.
- **Picking a category** on a suspected card sends `labelPatch(...)` plus `review: "confirmed"`. The undo for that card sends `{category_id: null, review: "suspected"}`, and stays `{category_id: null}` for any other movement.
- **Review link:** under the queue, next to "See older", a quiet link "{count} detected balance changes to review" goes to `/movements?review=suspected`. It shows only when the count is above 0 and its query succeeded, and shows nothing while loading or on error. The count is `movementCount` of `GET /movements/totals?review=suspected` (all time, default status completed).
- **Spending card:** when this month's spending includes suspected card spends, a dimmed line under the total reads "Includes {count} unconfirmed card spends." Its count comes from totals with `SPENDING_FILTER`, `kind=card_spend`, `review=suspected` and the month range. Nothing is shown while that query loads or if it fails.
- **Recent movements:** shows `ReviewBadge`. A suspected card spend with no category reads "Needs a label", as other spending does.

### B7: States

| Where | Loading | Empty | Error |
|-------|---------|-------|-------|
| Movements list with `review` | existing skeleton | existing "Nothing matches" with Clear all | existing `SectionError` |
| Drawer actions | buttons disabled, loader on the clicked one | (n/a) | red `Alert` under the actions, mapped error |
| Label card actions | card hidden (optimistic) | queue's "All labelled" when none are left | card back with the mapped error |
| Review link, unconfirmed note | nothing | nothing (count 0) | nothing |

### B8: Privacy

Every amount added here (explanation amount, spot, funding and explained changes) is wrapped in `Sensitive`. Coin codes, wallet names, times and counts aren't masked.

## Design

### Data layer

| File | Change |
|------|--------|
| `src/modules/shared/api-schema.d.ts` | `pnpm api:generate` |
| `src/modules/movements/types.ts` | `ReviewStatus`, `Detection`, `DetectionRule`, `DetectionWallet`, all derived from the schema |
| `src/modules/movements/labels.ts` | `KIND_KEYS` for the three kinds (`movements.kinds.cardSpend`, `copyTrading`, `transfer`) |
| `src/modules/dashboard/movementText.ts` | `kindKey` cases for the three kinds |
| `src/modules/movements/search.ts` | `MOVEMENT_KINDS` (8), `REVIEW_ITEMS = ["suspected","confirmed","dismissed","none"]`, `review` in `MovementsSearch`, parse and query, `REVIEW_SEARCH` |
| `src/modules/movements/spending.ts` | `card_spend` in `SPENDING_KINDS`. `isSpending` excludes dismissed |
| `src/modules/movements/review.ts` (new) | Pure helpers: `reviewBadge(movement) → {key, color} \| null` (B3 order), `reviewActions(movement)` (B5 rules), `actionPatch(movement, action) → MovementPatch \| null`, `undoPatch(action) → MovementPatch` |
| `src/modules/movements/chips.ts` | `review` chip label |
| `src/modules/dashboard/labelPatch.ts` | Adds `review: "confirmed"` for a suspected row. `labelUndoPatch(movement)` |
| `src/modules/dashboard/queries.ts` | `reviewCount` (`{review: "suspected"}`), `unconfirmedSpending` (B6) |
| `src/modules/shared/api-errors.ts` | `"movement is not detected": "errors.movementNotDetected"` |

`useUpdateMovement` is reused for every action. No new hook is needed beyond what `LabelQueue` and the drawer already do.

### Components

- `MovementParts.tsx`: `ReviewBadge`.
- `MovementsTable.tsx`, `MovementCards.tsx`, `dashboard/RecentMovements.tsx`, `dashboard/LabelCard.tsx`: render `ReviewBadge`.
- `MovementFilters.tsx`: the Review chip group.
- `movements/DetectionSection.tsx` (new): B5 items 1 to 4. Props: `movement`, `onUpdated(movement)`, `onDismissed(movement)`.
- `MovementDrawer.tsx`: renders `DetectionSection` and the B5 fact rows. Takes `onUpdated` and passes it through. `MovementsPage.tsx` passes `setOpened`.
- `LabelCard.tsx`: two extra buttons for a suspected card spend. `LabelQueue.tsx`: their handlers, the undo, and the review link.
- `SpendingCard.tsx`: the unconfirmed line.

### Translations (en / es)

| Key | en | es |
|-----|----|----|
| `movements.kinds.cardSpend` | Card spend | Gasto con tarjeta |
| `movements.kinds.copyTrading` | Copy trading | Copy trading |
| `movements.kinds.transfer` | Other transfer | Otra transferencia |
| `movements.filters.review` | Review | Revisión |
| `movements.review.suspected` | To review | Por revisar |
| `movements.review.confirmed` | Confirmed | Confirmado |
| `movements.review.dismissed` | Dismissed | Descartado |
| `movements.review.none` | From Binance | De Binance |
| `movements.review.badge.card` | Possible card spend | Posible gasto con tarjeta |
| `movements.review.badge.copy` | Possible copy trading | Posible copy trading |
| `movements.review.badge.transfer` | Unexplained change | Cambio sin explicar |
| `movements.review.badge.dismissed` | Dismissed | Descartado |
| `movements.review.badge.conflict` | Check this | Revisar |
| `movements.detection.title` | Detected from your balance | Detectado en tu saldo |
| `movements.detection.down` | Your {{wallet}} {{asset}} balance went down by <amount/> between {{from}} and {{to}}, and no Binance record explains it. | Tu saldo de {{asset}} en {{wallet}} bajó <amount/> entre {{from}} y {{to}}, y ningún registro de Binance lo explica. |
| `movements.detection.up` | Your {{wallet}} {{asset}} balance went up by <amount/> between {{from}} and {{to}}, and no Binance record explains it. | Tu saldo de {{asset}} en {{wallet}} subió <amount/> entre {{from}} y {{to}}, y ningún registro de Binance lo explica. |
| `movements.detection.wallet.spot` / `.funding` / `.both` | Spot / Funding / Spot and Funding | Spot / Fondos / Spot y Fondos |
| `movements.detection.hint.unexplainedDrop` | Binance Card purchases show up like this. | Las compras con Binance Card aparecen así. |
| `movements.detection.hint.roundAmount` | A round amount like this is often a copy-trading investment. | Un monto redondo así suele ser una inversión de copy trading. |
| `movements.detection.hint.copyPairOut` | A similar amount came back later, which looks like copy trading. | Un monto parecido volvió después; parece copy trading. |
| `movements.detection.hint.copyPairIn` | It matches an earlier copy-trading investment. | Coincide con una inversión de copy trading anterior. |
| `movements.detection.hint.unexplainedGain` | Money came in with no Binance record: a copy-trading close, a refund or a reward. | Entró dinero sin registro de Binance: un cierre de copy trading, un reembolso o una recompensa. |
| `movements.detection.confidence.low` / `.medium` / `.high` | Low / Medium / High confidence | Confianza baja / media / alta |
| `movements.detection.question` | What is it? | ¿Qué es? |
| `movements.detection.dismiss` | Dismiss | Descartar |
| `movements.detection.restore` | Restore | Restaurar |
| `movements.detection.keep` | Keep it | Mantener |
| `movements.detection.conflictTitle` | This may be counted twice | Esto podría contarse dos veces |
| `movements.detection.conflictBody` | A Binance record now explains this change, or it was offset later. | Ahora un registro de Binance explica este cambio, o se compensó después. |
| `movements.detection.savedAs` | Saved as {{kind}}. | Guardado como {{kind}}. |
| `movements.detection.dismissed` | Dismissed. | Descartado. |
| `movements.detection.restored` | Restored. | Restaurado. |
| `movements.detection.failed` | The change wasn't saved. | No se guardó el cambio. |
| `movements.drawer.review` | Review | Revisión |
| `movements.drawer.window` | Between | Entre |
| `movements.drawer.wallet` | Wallet | Billetera |
| `movements.drawer.spotChange` | Spot change | Cambio en Spot |
| `movements.drawer.fundingChange` | Funding change | Cambio en Fondos |
| `movements.drawer.explained` | Explained by Binance records | Explicado por registros de Binance |
| `dashboard.card.copyTrading` | It's copy trading | Es copy trading |
| `dashboard.card.notSpend` | Not a spend | No es un gasto |
| `dashboard.card.movedToCopy` | Moved to copy trading. | Movido a copy trading. |
| `dashboard.queue.toReview_one` / `_other` | {{count}} detected balance change to review / {{count}} detected balance changes to review | {{count}} cambio de saldo detectado por revisar / {{count}} cambios de saldo detectados por revisar |
| `dashboard.spending.unconfirmed_one` / `_other` | Includes {{count}} unconfirmed card spend. / Includes {{count}} unconfirmed card spends. | Incluye {{count}} gasto con tarjeta sin confirmar. / Incluye {{count}} gastos con tarjeta sin confirmar. |
| `errors.movementNotDetected` | This movement wasn't detected from your balance, so it can't be reviewed. | Este movimiento no se detectó en tu saldo, así que no se puede revisar. |

"Funding" is "Fondos" because that's the name the Binance app uses in Spanish.

### Fake API (`scripts/fake-api.mjs`)

- `MOVEMENT_KINDS` has 8 kinds, and `SPENDING_KINDS` adds `card_spend`. Every movement has `review_status` and `detection` (null for Binance rows). `source` is `"detector"` for detected rows.
- `review` is in `LIST_PARAMS`, `TOTALS_PARAMS` and `EXPORT_PARAMS`, parsed like the backend (bad item is 400 `invalid review`). The default excludes dismissed. `none` means `review_status === null`.
- `PATCH /movements/:id`: `kind` and `review` per backend FR7, including 400 `invalid kind` and `invalid review` and 422 `movement is not detected`. Confirm and dismiss clear `conflict`. Restore sets the kind back to `suggested_kind`.
- CSV: the four columns appended.
- `POST /binance/movements/sync`: `detection: {status: "ok", windows: 0, created: 0, updated: 0, retracted: 0, conflicts: 0}`.
- New account kind **`card-spends`**: the `populated` account plus, this month:
  - three suspected card spends from Spot USDT with the real amounts (`4.0427944`, `5.06605855`, `20.25533879`), 2-minute windows, the second with `funding_change` 50 and `explained_change` 50;
  - a suspected copy pair (−200 USDT `copy_pair` high, +186.47 two days later);
  - a suspected `transfer` gain of 12.5 USDT;
  - a dismissed card spend of 3 USDT;
  - a confirmed card spend with a category and `conflict: true`;
  - one suspected card spend still `usd_price_status: "pending"`.

  The other accounts are unchanged, so earlier manual checks still hold.

## Acceptance criteria

All with the fake API, `account: "card-spends"`, unless stated.

- **AC1:** On `/movements`, the three suspected card spends show "Possible card spend". The copy pair shows "Possible copy trading". The gain shows "Unexplained change". The conflicting row shows "Check this". The dismissed row isn't listed.
- **AC2:** Selecting the Review chip "Dismissed" sets `?review=dismissed`, lists only the dismissed row with "Dismissed", and the active chip reads "Review: Dismissed". Clear all removes it.
- **AC3:** The Kind chip "Card spend" sets `?kind=card_spend` and lists the card spends (not the dismissed one unless Review includes Dismissed).
- **AC4:** Opening the 5.06605855 spend shows "Your Spot USDT balance went down by 5.06605855 between … and …", the hint "Binance Card purchases show up like this.", "Medium confidence", and in Details: Spot change −5.06605855, Funding change +50, Explained by Binance records +50.
- **AC5:** On that drawer, clicking **Card spend** sends one `PATCH {"review":"confirmed"}`, shows "Saved as Card spend.", the drawer stays open, the badge disappears from the drawer and the row, and the Card spend button is filled.
- **AC6:** On a suspected card spend, clicking **Copy trading** sends `PATCH {"kind":"copy_trading"}`. The row's kind becomes Copy trading, and this month's spending total on the dashboard drops by its value.
- **AC7:** Clicking **Dismiss** sends `{"review":"dismissed"}`, closes the drawer, shows "Dismissed." with Undo, and the row leaves the list. Undo sends `{"review":"suspected"}` and the row comes back with its badge.
- **AC8:** On the conflicting row, the alert shows. **Keep it** sends `{"review":"confirmed"}` and the alert and "Check this" badge go away.
- **AC9:** With `failRoute: "PATCH /movements/:id"`, an action shows the red alert with the mapped message, the buttons enable again, and the row keeps its state.
- **AC10:** On the dashboard, the label queue includes the suspected card spends with the badge. **It's copy trading** removes the card at once, the headline drops by one, and the toast "Moved to copy trading." has Undo. **Not a spend** removes it with "Dismissed.".
- **AC11:** Picking a category on a suspected card spend sends `category_id` and `review: "confirmed"` in one PATCH. Undo sends `{"category_id": null, "review": "suspected"}`.
- **AC12:** The dashboard shows "N detected balance changes to review", with N equal to the suspected rows in the account. It links to `/movements?review=suspected`. With the `populated` account it doesn't show.
- **AC13:** The Spending card includes the card spends in its total and shows "Includes 4 unconfirmed card spends." (the three plus the pending-price one). It excludes the dismissed one.
- **AC14:** With balances hidden, every amount in the detection section and the new Details rows is masked.
- **AC15:** In Spanish, every new string is translated, and `locales.test.ts` passes.
- **AC16:** Against the real backend (after its E2E), the 2026-11-09 purchases show as above, in the user's local time (06:40, 09:25 and 10:35 at UTC−4; they were hourly windows, so the "between" range is an hour).

## Unit tests (vitest)

- `review.test.ts`: `reviewBadge` for every B3 row and its precedence (conflict over dismissed over suspected). `reviewActions` for suspected, confirmed, dismissed and conflict. `actionPatch` (current kind while suspected → `{review:"confirmed"}`, other kind → `{kind}`, current kind while confirmed → `null`, dismiss and restore). `undoPatch`.
- `search.test.ts`: `review` parsing (keeps the 4 items, drops others, dedupes, drops empty), the new kinds, and `toMovementsQuery` passes `review`.
- `spending.test.ts`: `card_spend` is spending. Dismissed isn't. `copy_trading` and `transfer` out aren't.
- `movementText.test.ts`: `kindKey` for the three kinds.
- `labelPatch.test.ts`: a suspected row gets `review: "confirmed"`, a Binance row doesn't. `labelUndoPatch` for both.
- `FilterChips.test.ts`: the review chip label.
- `helpers.test.ts`: `movement is not detected` → `errors.movementNotDetected`.

## Out of scope

- Showing the sync's `detection` counts in a toast after "Sync now".
- A link to the paired movement (there's no single-movement route in the app yet). The hint text covers it.
- Grouping several coins detected in the same window.
- Net spending (refunds subtracted).

## Open questions

- **Q1 (user):** Should suspected card spends count in spending before confirmation? This SPEC follows the backend default (yes, until dismissed) and shows the "Includes N unconfirmed" note. If the answer is no, `SPENDING_FILTER` adds `review: "none,confirmed"`, the label queue needs its own filter so suspected spends still reach it, and the note goes away.
- **Q2 (user):** In the drawer, setting a category on a suspected row doesn't confirm it (only the actions do), while on the dashboard card it does. Should the drawer's Save confirm too? Default: no, so the drawer stays explicit.

## References

- Backend: `../backend/specs/2026-11-13-card-spend-detection/SPEC.md`
- [Movements and Categories](../2026-10-30-movements-categories/SPEC.md), [Dashboard](../2026-10-30-dashboard/SPEC.md), [Hide Balances](../2026-11-07-hide-balances/SPEC.md), [Categories and Tags Page](../2026-11-13-categories-tags-page/SPEC.md)
