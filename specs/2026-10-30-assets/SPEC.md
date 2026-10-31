---
title: Assets
spec_type: tech
type: feature
status: draft
domain: Portfolio
issue: none
created: 2026-10-30
updated: 2026-10-30
sdd_version: 7.3.0
---

# Assets

## Overview

Shows what the user holds, by coin and wallet, with history. Depends on [Dashboard](../2026-10-30-dashboard/SPEC.md), which adds the data layer.

## Requirements

### Assets view (`/assets`)

- Source: `GET /snapshots/latest`. Each row has `wallet_type`, `asset`, `free`, `locked`, `freeze`, `usd_value` and `priced`.
- **Summary:** total, Spot and Funding USD values, and the snapshot's time.
- **Balance history:** `GET /snapshots`, with presets of 7 days, 30 days, 90 days and 1 year, and `tz` set to the browser's. The backend picks the bucket.
- **Coin list:** one row per coin, merged across wallets, with amount, USD value and share of the total. Sorted by USD value, unpriced coins last. Below 768px: cards.
- Amounts stay full precision, with trailing zeros trimmed.

### Coin detail (`/assets/$asset`)

- `GET /snapshots/assets/:asset`, with the same presets.
- Chart of `usd_value`, with a switch to `amount`.
- A null `usd_value` point shows as a gap, not a zero.
- Current Spot and Funding split, and free, locked and frozen amounts.
- A link to Movements filtered with `asset=<coin>&asset_match=any`.

### States

- Loading skeletons, and an error with retry, per section.
- **No snapshot:** the same sync prompt as the Dashboard.
- A coin no longer held shows zero amounts and its history. An invalid coin code shows "Not found", with a link back.
- A range with one point or fewer shows "Not enough history yet".

## Acceptance Criteria

- **Given** BTC in both Spot and Funding, **then** the list shows one BTC row, with the summed amount and value, with no loss of precision.
- **Given** a coin with no price, **then** it sits last, with "No price", and a note that the total excludes it.
- **Given** a coin's history has unpriced points, **then** the chart shows gaps.
- **Given** the user picks 1 year, **then** the chart loads without a `range too large for bucket` error.
- **Given** a coin detail page, **when** the user opens its movements, **then** the filter includes Converts into that coin.

## Out of Scope

Profit and loss, cost basis, price alerts, comparing coins.

## Open Questions

None.
