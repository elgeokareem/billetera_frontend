---
title: Movements and Categories
spec_type: tech
type: feature
status: draft
domain: Portfolio
issue: none
created: 2026-10-30
updated: 2026-10-30
sdd_version: 7.3.0
---

# Movements and Categories

## Overview

Adds the full movement history, and category management. Depends on [Dashboard](../2026-10-30-dashboard/SPEC.md), which adds the data layer.

## Requirements

### Movements view (`/movements`)

**List**

- `GET /movements`, 50 per page, with a "Load more" button that passes `next_cursor`. The button disappears when it's `null`.
- Desktop: a table with date, kind, category, reason, amount and USD value. Below 768px: a list of cards.
- Pending and failed movements carry a status badge.
- Null USD values follow the rules in the Dashboard spec.

**Filters**, kept in URL search params so a filtered view can be shared and survives a reload:

| Filter | Param | Notes |
|--------|-------|-------|
| Search | `q` | 1 to 100 characters, debounced 300ms. Matches reason or counterparty |
| Kind | `kind` | Multi-select |
| Direction | `direction` | In, out, or both |
| Status | `status` | Multi-select |
| Asset | `asset`, `asset_match=any` | Includes the other side of a Convert |
| Category | `category_id` | Multi-select, including `none` |
| Dates | `from`, `to` | Presets: this month, last month, 90 days. `to` is exclusive |
| Has reason | `has_reason` | Yes, no, or both |

- A "Needs a label" preset sets the spending filter plus `category_id=none`, with no date filter. The Dashboard's "See older" link uses it, and its "Review all" link adds the current month.
- Active filters appear as removable chips, with Clear all.

**Editing**

- Clicking a row opens a detail drawer: all movement fields, category, reason (500 characters at most).
- Saving sends `PATCH /movements/:id` with only the changed keys. A cleared field sends `null`.
- Category can also be set inline in the table.
- The detail view shows `counterparty` because it's the user's own data. It's never logged.

**Export**

- A button downloads `GET /movements/export` with the current filters, through the browser, keeping the file name from `Content-Disposition`.
- 422 `too many rows, narrow the filters` becomes a translated message.

**States**

- **Empty, no filters:** "No movements yet", with a sync button.
- **Empty, with filters:** "Nothing matches", with Clear all.
- **Sync:** the same button and rules as the Dashboard.

### Categories view (`/categories`)

- `GET /categories`, in the order the backend returns them.
- Each row shows the name, this month's spending, and rename and delete actions. Spending comes from the same totals call as the Dashboard.
- Create: `POST /categories`. Rename: `PATCH /categories/:id`, inline. Names are 1 to 64 characters.
- Handle 409 `category already exists`, 400 `invalid name` and 404 `category not found`.
- Delete asks for confirmation, and says movements keep their reason but lose this category and will need a label again.
- **Empty:** a prompt to create a first category, with suggestions such as Food, Rent, Travel and Transfer. Clicking one creates it. Suggestions follow the active language.
- Clicking a category opens Movements filtered by it.

## Acceptance Criteria

- **Given** filters are set, **when** the page reloads, **then** the same filters and results show.
- **Given** a filtered list, **when** the user loads more, **then** the same filters go with the cursor, and no rows repeat.
- **Given** a `+` in a date offset, **then** it's sent as `%2B`, or the date is sent in `Z` time.
- **Given** a movement with a reason, **when** only its category changes, **then** the request doesn't contain `reason`.
- **Given** an active filter, **when** Export is clicked, **then** the CSV matches the filter, and has the backend's file name.
- **Given** a user creates `food` when `Food` exists, **then** they see a translated "already exists" error.
- **Given** a category is deleted, **then** its movements show as needing a label when they meet the definition, and the Dashboard count updates.

## Out of Scope

Bulk editing, merging categories, category colors, custom date grouping, labelling deposits in any dedicated flow. A deposit's category can still be set from its drawer, since the backend allows it.

## Open Questions

None.
