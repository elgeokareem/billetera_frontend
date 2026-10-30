# Roadmap

Started on 2026-10-30, after the backend MVP was finished. The API contract is in [`../backend/README.md`](../../backend/README.md).

## Steps

To be planned.

## Later

- **Catalog deposits:** let the user give deposits a category and reason, and see income by category, as they do for spending. The backend already supports this: `PATCH /movements/:id` works on any movement, and `GET /movements/totals` filters by `direction=in`. In the MVP, deposits aren't in the labelling cards or the spending totals.
