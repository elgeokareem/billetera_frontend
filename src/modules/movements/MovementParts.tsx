import { Badge, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { priceNote, statusNote } from "../dashboard/movementText";
import { Sensitive } from "../shared/components/Sensitive";
import { formatQuantity, formatUsd } from "../shared/format";
import { abs } from "../shared/money";
import { signOf } from "./labels";
import type { Movement } from "./types";

/** A pending or failed movement carries a badge. A completed one has none. */
export function StatusBadge({ movement }: { movement: Movement }) {
  const { t } = useTranslation();
  const note = statusNote(movement, t);
  if (!note) {
    return null;
  }
  return (
    <Badge variant="light" color={movement.status === "failed" ? "red" : "yellow"} radius="sm" size="sm">
      {note}
    </Badge>
  );
}

/**
 * The amount in the coin, with its sign and code, such as -54 USDT. The sign and the number are the amount, so the mask takes
 * them; the code stays, since a coin code isn't sensitive.
 */
function SignedCoinAmount({ movement }: { movement: Movement }) {
  return (
    <>
      <Sensitive>{`${signOf(movement)}${formatQuantity(abs(movement.amount))}`}</Sensitive> {movement.asset}
    </>
  );
}

/** The amount in the coin, with its sign, such as -54 USDT. */
export function CoinAmount({ movement }: { movement: Movement }) {
  return (
    <Text component="span" fz="sm" fw={500} style={{ whiteSpace: "nowrap" }}>
      <SignedCoinAmount movement={movement} />
    </Text>
  );
}

/**
 * The USD value, with its sign. A null value shows the coin amount instead, and why there's no value: "Pricing" while the
 * price is still to be looked up, "No price" when Binance has none. The Dashboard follows the same rule.
 */
export function UsdValue({ movement, align = "right" }: { movement: Movement; align?: "left" | "right" }) {
  const { t } = useTranslation();
  const note = priceNote(movement, t);

  return (
    <>
      <Text component="span" fz="sm" fw={500} display="block" ta={align} style={{ whiteSpace: "nowrap" }}>
        {movement.usd_value === null ? (
          <SignedCoinAmount movement={movement} />
        ) : (
          <Sensitive>{`${signOf(movement)}${formatUsd(abs(movement.usd_value))}`}</Sensitive>
        )}
      </Text>
      {note && (
        <Text component="span" fz="xs" c="dimmed" display="block" ta={align}>
          {note}
        </Text>
      )}
    </>
  );
}
