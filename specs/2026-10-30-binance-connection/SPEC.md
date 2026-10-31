---
title: Binance Connection
spec_type: tech
type: feature
status: draft
domain: Identity, Portfolio
issue: none
created: 2026-10-30
updated: 2026-10-30
sdd_version: 7.3.0
---

# Binance Connection

## Overview

Without a Binance key the app has no data. This change adds the first-run Connect Binance step and the Settings view. Depends on [App Foundation](../2026-10-30-app-foundation/SPEC.md).

## API

| Call | Result |
|------|--------|
| `GET /binance/credentials` | `{"credentials": {"configured": false}}`, or `configured: true` with `api_key_masked`, `state` (`active`, `rejected`), `read_only`, `ip_restricted`, `validated_at`, `rejected_at`, `updated_at` |
| `PUT /binance/credentials` with `{"api_key", "api_secret"}` | 201 when new, 200 when replaced, same body as `GET` |
| `DELETE /binance/credentials` | 204, or 404 `credentials not found`. History is kept |
| `POST /binance/sync` | 201 `{"snapshot": ...}` |
| `POST /binance/movements/sync` | 200 with `kinds` and `valuation` |
| `POST /auth/logout` | 200 and clears the cookie |

`PUT` failures to translate: 400 `invalid credentials`, 422 `binance rejected the key`, 422 `key is not read-only`, 422 `key cannot read`, and `binance request failed`.

## Decisions

| # | Decision | Why |
|---|----------|-----|
| D1 | A user without a key is redirected from any protected route to `/connect`, except `/settings` | Every other view would be empty. Settings stays open so they can log out |
| D2 | `/connect` can't be skipped, but offers a logout link | There's nothing to show without a key. A user who removes their key returns here, and their history comes back once they connect again |
| D3 | After a successful connect, the frontend calls `POST /binance/sync` and `POST /binance/movements/sync`, in parallel | `PUT` only saves the key, and the cron may be off or an hour away |
| D4 | A failed first sync doesn't undo the connection | The key is saved. The dashboard offers Sync again |
| D5 | The secret is held only in form state and cleared after submit. It's never logged or stored in the browser | It's a credential |

## Requirements

### Connect view (`/connect`)

- Uses the public screen layout, with the language switch.
- Steps shown: create a key in Binance, enable read permission only, paste it here.
- Fields: API key, API secret (masked, with show/hide).
- While saving: the button shows a loading state. Validation with Binance can take a few seconds.
- On success: a "Fetching your data" state runs the two syncs, then goes to `/dashboard`.
- `key is not read-only` explains that trading, withdrawal and transfer permissions must be off.

### Settings view (`/settings`)

- **Connection card:** masked key, state, last validated time, and an IP restriction note when `ip_restricted` is false.
- **Rejected state:** when `state` is `rejected`, a warning says Binance refused the key and syncing has stopped, with a button to replace it. The same warning shows as a banner on every protected page.
- **Replace key:** the same form as Connect, in a modal.
- **Remove key:** a confirmation modal says history is kept and syncing stops. Then the user lands on `/connect`.
- **Log out:** calls `POST /auth/logout`, clears the query cache, and goes to `/login`.

## Acceptance Criteria

- **Given** a logged-in user with no key, **when** they open `/dashboard`, **then** they land on `/connect`.
- **Given** a valid read-only key, **when** it's submitted, **then** both syncs run and the user lands on `/dashboard`.
- **Given** a key with trading on, **when** it's submitted, **then** the form stays, with a message explaining the permission problem.
- **Given** a key saved but a failed first sync, **when** the user lands on the dashboard, **then** they see a retry option, not a blank page.
- **Given** a rejected key, **when** any protected page opens, **then** the banner links to Settings.
- **Given** the user removes their key and connects again, **then** their earlier movements and categories are still there.
- **Given** the form was submitted, **then** the secret is no longer in component state and appears in no log or browser storage.

## Out of Scope

Changing the password or email, deleting the account, more than one key per user.

## Open Questions

None.
