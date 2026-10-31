import { needsLabel } from "../movements/spending";
import type { Movement } from "../movements/types";

export type Translate = (key: string, options?: Record<string, string>) => string;

/** The translation key of a movement's kind. A P2P trade is a sale when crypto leaves Binance, and a purchase otherwise. */
export function kindKey(movement: Pick<Movement, "kind" | "direction">) {
  switch (movement.kind) {
    case "deposit":
      return "movements.kinds.deposit";
    case "withdrawal":
      return "movements.kinds.withdrawal";
    case "pay":
      return "movements.kinds.pay";
    case "convert":
      return "movements.kinds.convert";
    case "p2p":
      return movement.direction === "out"
        ? "movements.kinds.p2pSale"
        : "movements.kinds.p2pPurchase";
  }
}

/** A movement's title: its reason when it has one, otherwise its kind. A Convert also names both coins. */
export function movementTitle(movement: Movement, t: Translate) {
  if (movement.reason) {
    return movement.reason;
  }
  const kind = t(kindKey(movement));
  if (movement.kind === "convert" && movement.counter_asset) {
    return t("dashboard.recent.convert", {
      kind,
      from: movement.asset,
      to: movement.counter_asset,
    });
  }
  return kind;
}

/**
 * What a movement is filed under, in one short line. A category shows its name. Spending with no category says it needs a
 * label. Anything else, a deposit or a Convert with no category, shows its kind instead.
 */
export function movementFiling(
  movement: Movement,
  categoryName: string | undefined,
  t: Translate,
) {
  if (movement.category_id !== null && categoryName !== undefined) {
    return { text: categoryName, needsLabel: false };
  }
  if (needsLabel(movement)) {
    return { text: t("dashboard.recent.needsLabel"), needsLabel: true };
  }
  return { text: t(kindKey(movement)), needsLabel: false };
}

/** The status of a movement that isn't completed, for a row that shows it. Completed movements have none. */
export function statusNote(movement: Movement, t: Translate) {
  switch (movement.status) {
    case "pending":
      return t("dashboard.recent.pending");
    case "failed":
      return t("dashboard.recent.failed");
    default:
      return null;
  }
}

/**
 * The note in place of a missing USD value. "Pricing" while the price is still to be looked up, "No price" when Binance has
 * none. A movement with a value, or a status this doesn't name, has no note.
 */
export function priceNote(movement: Movement, t: Translate) {
  if (movement.usd_value !== null) {
    return null;
  }
  switch (movement.usd_price_status) {
    case "pending":
      return t("dashboard.recent.pricing");
    case "unavailable":
      return t("dashboard.recent.noPrice");
    default:
      return null;
  }
}
