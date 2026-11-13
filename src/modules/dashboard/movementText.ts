import { needsLabel } from "../movements/spending";
import { splitSegments, type SplitSegment } from "../movements/splits";
import type { Movement } from "../movements/types";
import { formatUsd } from "../shared/format";

export type Translate = (key: string, options?: Record<string, string>) => string;

/** A movement's filing line: the text, and the split segments when it has parts, so the caller can mask amounts. */
export interface MovementFiling {
  text: string;
  needsLabel: boolean;
  /** The split segments shown in the text. */
  segments?: SplitSegment[];
  /** Further segments the text leaves out after the one shown. */
  more?: number;
}

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
    case "card_spend":
      return "movements.kinds.cardSpend";
    case "copy_trading":
      return "movements.kinds.copyTrading";
    case "transfer":
      return "movements.kinds.transfer";
    default:
      // A kind this build doesn't know yet still gets a label, never a blank line.
      return "movements.kinds.other";
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
 * What a movement is filed under, in one short line. A movement whose parts apply shows its segments, one shown and
 * "+n" for the rest, with the amounts formatted. A category shows its name, and one whose name didn't load says so.
 * Spending with no category says it needs a label. Anything else, a deposit or a Convert with no category, shows its kind
 * instead.
 */
export function movementFiling(
  movement: Movement,
  categoryName: string | undefined,
  t: Translate,
  categoryNameOf?: (categoryId: number | null) => string,
): MovementFiling {
  if (
    movement.split_status === "applied" ||
    movement.split_status === "exceeds"
  ) {
    const nameOf =
      categoryNameOf ??
      ((categoryId: number | null) => {
        if (categoryId === null) {
          return t("movements.noCategory");
        }
        return categoryId === movement.category_id && categoryName !== undefined
          ? categoryName
          : t("movements.categoryUnknown");
      });
    const all = splitSegments(movement, nameOf);
    const total = all.segments.length + all.more;
    const segments = all.segments.slice(0, 1);
    const more = total - segments.length;
    const text = [
      ...segments.map((segment) => `${segment.name} ${formatUsd(segment.usd)}`),
      ...(more > 0 ? [t("movements.split.more", { count: String(more) })] : []),
    ].join(" · ");
    return { text, needsLabel: needsLabel(movement), segments, more };
  }
  if (movement.category_id !== null && categoryName !== undefined) {
    return { text: categoryName, needsLabel: false };
  }
  if (movement.category_id !== null) {
    return { text: t("movements.categoryUnknown"), needsLabel: false };
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
