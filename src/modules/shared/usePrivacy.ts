import { useStore } from "zustand";
import { balancesStore } from "./balancesStore";

/**
 * Whether money is hidden. It reads the one store, so a shared component such as the chart gets the same answer on every page,
 * and nothing about the route matters.
 */
export function useBalancesHidden(): boolean {
  return useStore(balancesStore, (state) => !state.shown);
}
