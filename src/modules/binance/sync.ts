import { getApiErrorKey } from "../shared/api-errors";

/**
 * The error a pair of syncs reports: the first failure that isn't "already in progress", else the first failure, else
 * undefined. The promises don't reject with undefined in practice (axios rejects with an error object).
 */
export function syncFailure(
  results: readonly PromiseSettledResult<unknown>[],
): unknown {
  let firstFailure: PromiseRejectedResult | undefined;

  for (const result of results) {
    if (result.status !== "rejected") {
      continue;
    }
    firstFailure ??= result;
    if (getApiErrorKey(result.reason) !== "errors.syncInProgress") {
      return result.reason;
    }
  }

  return firstFailure?.reason;
}
