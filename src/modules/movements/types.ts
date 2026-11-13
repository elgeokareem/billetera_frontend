// The movements the API returns, derived from backend/docs/openapi/openapi.json. Every amount and USD value is a decimal
// string with every digit, and never a number.

import type { Schemas } from "../shared/api-types";

type MovementResponse = Schemas["movements.MovementResponse"];

export type MovementKind = MovementResponse["kind"];
export type MovementDirection = MovementResponse["direction"];
export type MovementStatus = MovementResponse["status"];
export type UsdPriceStatus = MovementResponse["usd_price_status"];

/** The user's decision on a detected movement, or null for a row that came from Binance. */
export type ReviewStatus = MovementResponse["review_status"];
/** The detector's evidence for a movement, or null for a row that came from Binance. */
export type Detection = NonNullable<MovementResponse["detection"]>;
export type DetectionRule = Detection["rule"];
export type DetectionWallet = Detection["wallet"];
/** The kinds a detected movement can be. */
export type DetectionKind = Detection["suggested_kind"];

export type Movement = MovementResponse;

/** GET /movements. next_cursor is null on the last page. */
export type MovementsPage = Schemas["movements.ListResponse"];

/**
 * One row of the assets totals. It's one coin in one direction, so direction is always there, and so are the USD fields.
 * usd_value is the sum of the priced movements, or null when none of them is priced. unpriced_count is how many movements of
 * the row have no price.
 */
export type AssetTotalRow = Schemas["movements.AssetTotalRow"];

/** One row of the fees totals. It has no direction, and its USD fields mean the same as in an asset row. */
export type FeeTotalRow = Schemas["movements.FeeTotalRow"];

/** One row of the counter totals, the other side of a movement. It has a direction, but no USD fields, since that side isn't priced. */
export type CounterTotalRow = Schemas["movements.CounterTotalRow"];

/** GET /movements/totals */
export type MovementTotals = Schemas["movements.TotalsResponse"];

/** The body of PATCH /movements/:id. A key left out keeps its value, and null clears it. */
export type MovementPatch = Schemas["movements.UpdateMovementRequest"];
