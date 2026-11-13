import { Progress, Stack, Text, Tooltip } from "@mantine/core";
import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Sensitive } from "../shared/components/Sensitive";
import { formatUsd } from "../shared/format";
import { compare, diff, percentOf } from "../shared/money";

export interface BarPart {
  key: number;
  name: string;
  /** A valid amount, already normalised. */
  amount: string;
  color: string;
}

interface SplitBarProps {
  /** The movement's exact USD value, the bar's whole. */
  value: string;
  parts: readonly BarPart[];
  /** The rest, computed from the draft. */
  rest: string;
  /** The name of the rest's category, or "No category". */
  restName: string;
  /** Set when the parts pass the limit: the summary becomes the error. */
  over?: { sum: string; limit: string };
}

// The tokens the translation keeps for the amounts, so each one can be wrapped in Sensitive. They have no user meaning and
// can't appear in a translation by accident.
const SUM_TOKEN = "\u0000split-sum\u0000";
const OVER_TOKEN = "\u0000split-over\u0000";
const VALUE_TOKEN = "\u0000split-value\u0000";
const AMOUNT_TOKEN = "\u0000split-amount\u0000";

/** The over-the-limit sentence, with every amount wrapped in Sensitive. */
function OverLine({ sum, over, limit }: { sum: string; over: string; limit: string }) {
  const { t } = useTranslation();
  const text = t("movements.split.over", {
    sum: SUM_TOKEN,
    over: OVER_TOKEN,
    value: VALUE_TOKEN,
  });
  const amounts: Record<string, string> = {
    [SUM_TOKEN]: sum,
    [OVER_TOKEN]: over,
    [VALUE_TOKEN]: limit,
  };
  const chunks = text.split(new RegExp(`(${SUM_TOKEN}|${OVER_TOKEN}|${VALUE_TOKEN})`));
  return (
    <Text size="sm" c="red">
      {chunks.map((chunk, index) =>
        chunk in amounts ? (
          <Sensitive key={index}>{formatUsd(amounts[chunk])}</Sensitive>
        ) : (
          <Fragment key={index}>{chunk}</Fragment>
        ),
      )}
    </Text>
  );
}

/** The rest's sentence, with its amount wrapped in Sensitive. */
function RestLine({ name, amount }: { name: string; amount: string }) {
  const { t } = useTranslation();
  const text = t("movements.split.rest", { name, amount: AMOUNT_TOKEN });
  const [before, after = ""] = text.split(AMOUNT_TOKEN);
  return (
    <>
      {before}
      <Sensitive>{formatUsd(amount)}</Sensitive>
      {after}
    </>
  );
}

/** A part's line in a tooltip. */
function PartLine({ name, amount }: { name: string; amount: string }) {
  return (
    <>
      {name} <Sensitive>{formatUsd(amount)}</Sensitive>
    </>
  );
}

/**
 * The stacked bar and the summary of the drawer's parts: one section per part with a valid amount, then the rest in the
 * dim tone. Over the limit, the summary is the red error instead. Amounts are masked by Sensitive.
 */
export function SplitBar({ value, parts, rest, restName, over }: SplitBarProps) {
  const { t } = useTranslation();
  const restShare = compare(rest, "0") > 0 ? percentOf(rest, value) : null;
  const lines: ReactNode[] = parts.map((part) => (
    <Fragment key={part.key}>
      <PartLine name={part.name} amount={part.amount} />
    </Fragment>
  ));

  return (
    <Stack gap="xs">
      <Progress.Root size={12} radius="xl">
        {parts.map((part) => {
          const share = percentOf(part.amount, value);
          if (share === null) {
            return null;
          }
          return (
            <Tooltip
              key={part.key}
              label={<PartLine name={part.name} amount={part.amount} />}
              withArrow
            >
              <Progress.Section
                value={Number(share)}
                color={part.color}
                withAria={false}
              />
            </Tooltip>
          );
        })}
        {restShare !== null && (
          <Tooltip
            label={<RestLine name={restName} amount={rest} />}
            withArrow
          >
            <Progress.Section
              value={Number(restShare)}
              color="dark.3"
              withAria={false}
            />
          </Tooltip>
        )}
      </Progress.Root>
      {over ? (
        <OverLine sum={over.sum} over={diff(over.sum, over.limit)} limit={over.limit} />
      ) : (
        <Text size="sm" c="dimmed" component="div">
          {lines.map((line, index) => (
            <Fragment key={index}>
              {index > 0 ? " · " : null}
              {line}
            </Fragment>
          ))}
          {lines.length > 0 ? " · " : null}
          {compare(rest, "0") > 0 ? (
            <RestLine name={restName} amount={rest} />
          ) : (
            t("movements.split.restNone")
          )}
        </Text>
      )}
    </Stack>
  );
}
