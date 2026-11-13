import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Sensitive } from "../shared/components/Sensitive";
import { formatUsd } from "../shared/format";
import { splitSegments } from "./splits";
import type { Movement } from "./types";

interface SplitSegmentsProps {
  movement: Movement;
  /** The name of a part's category; null is "No category". */
  nameOf: (categoryId: number | null) => string;
  /** The most segments to show before the "+n". The table and cards show two, Recent movements one. */
  max?: number;
}

/**
 * A split movement's parts and rest as a line: "{name} {usd}" for the first segments, then "+n" for the others. Every
 * amount is in Sensitive, so Hide Balances masks it, and none reaches an aria-label. Plain text, for the table, the cards
 * and Recent movements.
 */
export function SplitSegments({ movement, nameOf, max = 2 }: SplitSegmentsProps) {
  const { t } = useTranslation();
  const all = splitSegments(movement, nameOf);
  const total = all.segments.length + all.more;
  if (total === 0) {
    return null;
  }
  const segments = all.segments.slice(0, max);
  const more = total - segments.length;

  return (
    <>
      {segments.map((segment, index) => (
        <Fragment key={`${segment.name}-${index}`}>
          {index > 0 ? " · " : null}
          {segment.name} <Sensitive>{formatUsd(segment.usd)}</Sensitive>
        </Fragment>
      ))}
      {more > 0 && (
        <>
          {segments.length > 0 ? " · " : null}
          {t("movements.split.more", { count: more })}
        </>
      )}
    </>
  );
}
