# Roadmap

Started on 2026-10-30, after the backend MVP was finished. The API contract is in [`../backend/README.md`](../../backend/README.md).

## Steps

Each step depends on the ones before it.

1. [App Foundation](2026-10-30-app-foundation/SPEC.md): session, theme, layout, language, helpers, login and register
2. [Binance Connection](2026-10-30-binance-connection/SPEC.md): first-run key setup and Settings
3. [Dashboard](2026-10-30-dashboard/SPEC.md): label cards, balance, spending, holdings, recent movements
4. [Movements and Categories](2026-10-30-movements-categories/SPEC.md): full history, filters, editing, export, category management
5. [Assets](2026-10-30-assets/SPEC.md): holdings by coin and wallet, with history
6. Backend integration: run every view against the real backend, including its cookie and origin checks. Until this step, views are checked against a fake API built from `../backend/README.md`

## Open fixes

- **[Chart Time Axis](2026-11-08-chart-time-axis/SPEC.md):** every balance chart's time axis spans the selected range, with clock-aligned ticks; Assets gets 24h and sees a Sync's snapshot without a reload. Tests run in a pinned zone, `America/Santiago`. Planned.
- **[Review Fixes](2026-11-09-review-fixes/SPEC.md):** six bugs from a spec-versus-code audit: cached data surviving a session change, the Binance key format message, the search box undoing Clear all, a 409 hiding a sync failure, a leftover `asset_match`, and sections hidden when categories fail to load. Planned.

## Later

- **Catalog deposits:** let the user give deposits a category and reason, and see income by category, as they do for spending. The backend already supports this: `PATCH /movements/:id` works on any movement, and `GET /movements/totals` filters by `direction=in`. In the MVP, deposits aren't in the labelling cards or the spending totals.
- **Older unlabelled movements:** the Dashboard's label queue only covers the current month, with a "See older" link to Movements. Design a better way to work through a backlog without overwhelming the user.
- **[Landing Page](2026-11-07-landing-page/SPEC.md):** a real public page at `/` for logged-out visitors. Logged-in users still go to `/dashboard`.
- **Analytics:** spending over time and richer breakdowns, built on `GET /movements/totals` with `period`.
- **Binance key guide:** a short EN/ES tutorial, shown as a panel next to the key form on the Connect page and in Settings, on creating a key in Binance: API Management, a system-generated key, copying the secret (Binance shows it only once), leaving only "Enable Reading" on, and restricting access to the server's IP. The read-only check already exists: the backend rejects a key with any other permission (422 `key is not read-only`) and the app shows a translated error. Possible addition: name the permissions to turn off, from the list `checkReadOnly` already finds in `../backend/modules/binance/credentials.go`.
- **[Movement Tags](2026-11-07-movement-tags/SPEC.md):** free labels on movements, as pills, for filtering and grouping. Category alone still drives totals. Built on the backend and the frontend.
- **[Hide Balances](2026-11-07-hide-balances/SPEC.md):** an eye toggle in the app header that masks every amount and USD value. Hidden is the default. The choice is one global setting saved in the browser (`localStorage`), not in the URL, so Back/Forward and shared links never change it; logging out keeps it and open tabs stay in sync.
- **[Dashboard Balance Chart](2026-11-07-dashboard-balance-chart/SPEC.md):** the total balance over time under the Balance card, with 24h, 7d, 30d, 90d and 1y ranges in the URL. Reuses the Assets chart, moved to shared. Honours Hide Balances. The value axis fits the data instead of starting at $0, on every balance chart (on trial).
