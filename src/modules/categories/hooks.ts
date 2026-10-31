import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { movementKeys } from "../movements/hooks";
import { createCategory, deleteCategory, fetchCategories, renameCategory } from "./api";

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

export function useRenameCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      renameCategory(id, name),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
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
