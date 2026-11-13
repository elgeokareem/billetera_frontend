import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { movementKeys } from "../movements/hooks";
import { createTag, deleteTag, fetchTags, updateTag } from "./api";
import { tagColorLookup } from "./colors";
import type { Tag, TagColor } from "./types";

export const tagKeys = {
  all: ["tags"] as const,
};

/** The known tags, which feed the autocomplete of every tags input and the color lookup of every pill. */
export function useTags() {
  return useQuery({
    queryKey: tagKeys.all,
    queryFn: fetchTags,
  });
}

/** A name-to-color lookup over the cached tags. A tag that isn't loaded yet draws gray. */
export function useTagColors() {
  const tags = useTags();
  return useMemo(() => tagColorLookup(tags.data), [tags.data]);
}

/** Creating a tag changes no movement, so only the tag list is refetched. */
export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createTag(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tagKeys.all }),
  });
}

/** Renaming changes the name on every movement at once, so movement lists and totals are refetched too. */
export function useRenameTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateTag(id, { name }),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: tagKeys.all }),
        queryClient.invalidateQueries({ queryKey: movementKeys.all }),
      ]),
  });
}

/**
 * Recoloring writes the new color into the cached list at once, and puts the old list back if the call fails. The caller
 * shows the error toast. On settle the list is refetched either way.
 */
export function useRecolorTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, color }: { id: number; color: TagColor }) => updateTag(id, { color }),
    onMutate: async ({ id, color }) => {
      await queryClient.cancelQueries({ queryKey: tagKeys.all });
      const previous = queryClient.getQueryData<Tag[]>(tagKeys.all);
      queryClient.setQueryData<Tag[]>(tagKeys.all, (tags) =>
        tags?.map((tag) => (tag.id === id ? { ...tag, color } : tag)),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(tagKeys.all, context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: tagKeys.all }),
  });
}

/** Deleting removes the tag from every movement that had it, so movement lists and totals are refetched too. */
export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteTag(id),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: tagKeys.all }),
        queryClient.invalidateQueries({ queryKey: movementKeys.all }),
      ]),
  });
}
