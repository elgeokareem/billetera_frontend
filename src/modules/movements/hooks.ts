import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchMovementTotals,
  fetchMovements,
  type MovementsQuery,
  type TotalsQuery,
  updateMovement,
} from "./api";
import type { Movement, MovementPatch, MovementsPage } from "./types";

/** How many movements one page of the list holds. The API's default is the same. */
export const MOVEMENTS_PAGE_SIZE = 50;

/**
 * The movements of the loaded pages, in order, with each ID once. Pages come from keyset cursors, so they don't overlap,
 * but the list is kept free of repeats even if the data changed between two pages.
 */
export function feedRows(pages: readonly MovementsPage[]): Movement[] {
  const seen = new Set<number>();
  const rows: Movement[] = [];
  for (const page of pages) {
    for (const movement of page.movements) {
      if (!seen.has(movement.id)) {
        seen.add(movement.id);
        rows.push(movement);
      }
    }
  }
  return rows;
}

export const movementKeys = {
  all: ["movements"] as const,
  list: (query: MovementsQuery) => ["movements", "list", query] as const,
  // The paged list of the Movements view. Its own key, so it can't share cache entries with the single pages above.
  feed: (query: Omit<MovementsQuery, "limit" | "cursor">) =>
    ["movements", "feed", query] as const,
  totals: (query: TotalsQuery) => ["movements", "totals", query] as const,
};

export function useMovementsList(query: MovementsQuery) {
  return useQuery({
    queryKey: movementKeys.list(query),
    queryFn: () => fetchMovements(query),
  });
}

/**
 * The movements that match the filters, a page at a time. Load more passes the cursor of the last page with the same
 * filters, so the pages never overlap.
 */
export function useMovementsFeed(query: Omit<MovementsQuery, "limit" | "cursor">) {
  return useInfiniteQuery({
    queryKey: movementKeys.feed(query),
    queryFn: ({ pageParam }) =>
      fetchMovements({ ...query, limit: MOVEMENTS_PAGE_SIZE, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
}

export function useMovementTotals(query: TotalsQuery) {
  return useQuery({
    queryKey: movementKeys.totals(query),
    queryFn: () => fetchMovementTotals(query),
  });
}

/**
 * PATCH /movements/:id. Every movement list and total is refetched once the call settles, so the views agree with the
 * server. Callers that want an optimistic change set it before they call mutate.
 */
export function useUpdateMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: MovementPatch }) =>
      updateMovement(id, body),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: movementKeys.all }),
  });
}
