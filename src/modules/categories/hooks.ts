import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { movementKeys } from "../movements/hooks";
import { createCategory, deleteCategory, fetchCategories, updateCategory } from "./api";

export const categoryKeys = {
  all: ["categories"] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: fetchCategories,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createCategory(name),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: { name?: string; counts_as_spending?: boolean };
    }) => updateCategory(id, body),
    // A rename changes a label. The spending flag changes the totals of every view, so they refetch too, even after a
    // failed save: the switch then shows the value the server still has.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
        queryClient.invalidateQueries({ queryKey: movementKeys.all }),
      ]),
  });
}

/**
 * Deletes a category. Its movements lose it, so every movement list and total refetches: a spending movement that's now
 * unlabelled counts again on the Dashboard.
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
        queryClient.invalidateQueries({ queryKey: movementKeys.all }),
      ]),
  });
}
