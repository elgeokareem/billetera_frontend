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

## Later

- **Catalog deposits:** let the user give deposits a category and reason, and see income by category, as they do for spending. The backend already supports this: `PATCH /movements/:id` works on any movement, and `GET /movements/totals` filters by `direction=in`. In the MVP, deposits aren't in the labelling cards or the spending totals.
- **Older unlabelled movements:** the Dashboard's label queue only covers the current month, with a "See older" link to Movements. Design a better way to work through a backlog without overwhelming the user.
- **Landing page:** a real public page. Until then, `/` redirects to `/dashboard`.
- **Analytics:** spending over time and richer breakdowns, built on `GET /movements/totals` with `period`.
