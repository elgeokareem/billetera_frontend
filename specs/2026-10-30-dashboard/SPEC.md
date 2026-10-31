---
title: Dashboard
spec_type: tech
type: feature
status: draft
domain: Portfolio
issue: none
created: 2026-10-30
updated: 2026-10-30
sdd_version: 7.3.0
---

# Dashboard

## Overview

Replaces the hardcoded dashboard with real data, in the layout of direction C on the [design canvas](https://claude.ai/artifact/FsQ18XGCvVr8NVMPaaj89B). Its main job is getting outgoing movements labelled. Depends on [App Foundation](../2026-10-30-app-foundation/SPEC.md) and [Binance Connection](../2026-10-30-binance-connection/SPEC.md).

## Definitions

- **Spending:** completed movements leaving Binance: `kind=withdrawal,p2p,pay&direction=out`. Convert and deposits don't count. A withdrawal to the user's own wallet counts, because the backend can't tell the difference. The user can file those under a category such as "Transfer".
- **Needs a label:** spending with `category_id=none`. A reason alone doesn't count as labelled.
- **Fees:** not included in spending totals in the MVP.

## Layout

| Column | Content |
|--------|---------|
| Left, wider | Headline, label cards, then October spending and Holdings side by side |
| Right | Balance card, Recent movements |

Below 768px, the order is: headline and label cards, balance card, Recent movements, spending, Holdings.

## Requirements

### Label cards

- The queue covers the current calendar month only, in the browser's timezone, so a new user isn't met with 90 days of decisions. `from` and `to` below are that month.
- Headline count: the sum of `count` from `GET /movements/totals?kind=withdrawal,p2p,pay&direction=out&category_id=none&from=...&to=...`.
- Cards: `GET /movements?kind=withdrawal,p2p,pay&direction=out&status=completed&category_id=none&limit=3&from=...&to=...`.
- A quiet "See older" link, with no count, opens Movements with the "Needs a label" preset and no date filter. It shows in every state, including "All labelled".
- Each card shows kind, date, amount, USD value, counterparty when present, category buttons, New category and an optional reason.
- Clicking a category sends `PATCH /movements/:id` with `category_id`, plus `reason` when it's filled in. The card leaves right away and comes back with an error if the call fails. A toast offers Undo, which sends `{"category_id": null}`.
- With more than 6 categories, the 5 most used this month show as buttons, with the rest in a select.
- New category opens a small input: `POST /categories`, then the movement gets the new category. Handle 409 `category already exists` and 400 `invalid name`.
- When more than 3 need a label this month, a "Review all" link opens Movements with those filters, including the month.
- **None left:** the headline becomes "All labelled" and the cards are replaced with a single line.

### Balance card

- Total and latest time: `GET /snapshots/latest`.
- Comparison: the last point of `GET /snapshots?from=<now-48h>&to=<now-24h>&bucket=hour`. No point in that range hides the comparison.
- The comparison is labelled as a balance change, because it includes deposits and withdrawals, not just price moves.
- Sparkline: `GET /snapshots` for the last 30 days, with `tz` set to the browser's timezone. Fewer than 2 points hides it.
- `unpriced_count` above 0 shows a note that some coins have no price.
- **Sync:** a button sends `POST /binance/sync` and `POST /binance/movements/sync`, then refreshes all dashboard data. 409 `sync already in progress` shows as an info message, not an error.

### Recent movements

- `GET /movements?limit=5`, all kinds.
- Each row: title, date, category or "Needs a label", USD value and sign.
- "Needs a label" shows only on movements matching the definition above. A deposit or Convert with no category shows its kind instead.
- Reason is the title when set, otherwise the translated kind. A Convert shows both coins.
- A null `usd_value` shows the coin amount, with "No price" when `usd_price_status` is `unavailable` and "Pricing" when it's `pending`.
- "View all" links to Movements.

### October spending

- Current calendar month in the browser's timezone. `from` and `to` encode `+` as `%2B`, or use `Z` times.
- `GET /movements/totals?kind=withdrawal,p2p,pay&direction=out&group_by=category&from=...&to=...&tz=...`.
- Rows arrive per asset and category. Sum `usd_value` per category with `money.ts`. Names come from `GET /categories`.
- A stacked bar and a list, largest first, with "No category" last.
- `unpriced_count` above 0 shows "N movements not priced", so the total isn't taken as complete.
- **Empty:** "No spending this month".

### Holdings

- From `GET /snapshots/latest`. Rows per wallet are merged per coin.
- Sorted by USD value, unpriced coins last. Shows up to 5, and a link to Assets.

### States

- Each section loads and fails on its own, with a skeleton and a retry button.
- **No snapshot yet:** `GET /snapshots/latest` answers 404. Show a prompt to sync, not an error.

## Acceptance Criteria

- **Given** 2 unlabelled spending movements, **when** the dashboard opens, **then** the headline says 2 and shows both.
- **Given** unlabelled spending only from last month, **then** the headline says "All labelled", and "See older" lists those movements.
- **Given** a Convert with no category, **then** it isn't counted, gets no card, and isn't marked "Needs a label".
- **Given** the user clicks Food on a card, **then** the card leaves, the count drops, Recent movements and October spending update, and Undo restores it.
- **Given** the PATCH fails, **then** the card comes back with an error, and any typed reason is kept.
- **Given** a spending movement with no price, **then** the note shows and the total isn't presented as complete.
- **Given** a month with both USDT and BTC rows in Food, **then** Food shows one summed value, with no loss of precision.
- **Given** no snapshot from 24 to 48 hours ago, **then** the balance shows without a comparison.
- **Given** a sync already running, **when** the user clicks Sync, **then** an info message shows.
- **Given** Spanish is selected, **then** all text, numbers and dates follow it, while category names and reasons stay as written.
- **Given** the page has no hardcoded sample data, **then** a new account shows only real or empty states.

## Out of Scope

Choosing a month, Analytics, labelling deposits (see [Roadmap](../ROADMAP.md)), excluding categories from spending.

## Open Questions

None. The label queue's scope is a deliberately simple first version, and the [Roadmap](../ROADMAP.md) has a later step to revisit it.
