import { useQuery } from "@tanstack/react-query";
import { fetchTags } from "./api";

export const tagKeys = {
  all: ["tags"] as const,
};

/** The known tags, which feed the autocomplete of every tags input. */
export function useTags() {
  return useQuery({
    queryKey: tagKeys.all,
    queryFn: fetchTags,
  });
}
