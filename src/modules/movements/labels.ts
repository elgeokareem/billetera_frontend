import { formatDate } from "../shared/format";
import type { Movement, MovementKind } from "./types";

/** The translation of each kind as a filter names it. P2P is one filter for both directions. */
export const KIND_KEYS: Record<MovementKind, string> = {
  deposit: "movements.kinds.deposit",
  withdrawal: "movements.kinds.withdrawal",
  pay: "movements.kinds.pay",
  p2p: "movements.kinds.p2p",
  convert: "movements.kinds.convert",
  card_spend: "movements.kinds.cardSpend",
  copy_trading: "movements.kinds.copyTrading",
  transfer: "movements.kinds.transfer",
};

/** The accent colour the Dashboard uses for the "Needs a label" text. */
export const ACCENT = "accent.6";

/**
 * The label of a custom date range, such as "Oct 1, 2026 – Oct 31, 2026". The end is exclusive in the search, so the label
 * shows the day before it.
 */
export function rangeLabel(from: string, to: string) {
  const last = new Date(Date.parse(to) - 1);
  return `${formatDate(from)} – ${formatDate(last.toISOString())}`;
}

/** + for money in, - for money out. */
export function signOf(movement: Pick<Movement, "direction">) {
  return movement.direction === "in" ? "+" : "-";
}
