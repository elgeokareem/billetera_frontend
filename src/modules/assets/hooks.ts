import { useQuery } from "@tanstack/react-query";
import { fetchMovements, type MovementsQuery } from "../movements/api";
import { rangeQuery } from "../shared/chartRange";
import { movementKeys } from "../movements/hooks";
import { useAssetHistory } from "../snapshots/hooks";
import { everHeldQuery } from "./queries";
import { absentCoinStatus, type CoinStatus, everHeldIn } from "./status";

/**
 * Whether a coin that the latest snapshot doesn't hold was held before. Three checks run: the coin's points for the last year,
 * one per day; its points for all time, one per month; and the movements that involve it. Each snapshot check misses a holding
 * that fell between two of its points, so a coin is Not found only when all three find nothing. The checks run only when
 * enabled, which is never for a coin the latest snapshot holds.
 */
export function useAbsentCoinCheck(code: string, now: Date, timeZone: string, enabled: boolean) {
  const year = useAssetHistory(code, rangeQuery(now, "1y", timeZone), enabled);
  const allTime = useAssetHistory(code, everHeldQuery(now), enabled);
  const movementQuery: MovementsQuery = { asset: code, asset_match: "any", limit: 1 };
  const movements = useQuery({
    queryKey: movementKeys.list(movementQuery),
    queryFn: () => fetchMovements(movementQuery),
    enabled,
  });

  const checks = [year, allTime, movements];
  const found =
    (year.data !== undefined && everHeldIn(year.data.points)) ||
    (allTime.data !== undefined && everHeldIn(allTime.data.points)) ||
    (movements.data !== undefined && movements.data.movements.length > 0);
  const status: CoinStatus | undefined = absentCoinStatus(found, checks.every((check) => check.isSuccess));

  return {
    status,
    failed: checks.some((check) => check.isError),
    error: checks.find((check) => check.isError)?.error,
    retry: () => {
      for (const check of checks) {
        if (check.isError) {
          void check.refetch();
        }
      }
    },
  };
}
