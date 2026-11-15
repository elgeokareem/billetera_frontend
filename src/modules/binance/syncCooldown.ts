import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

export type SyncCooldownState = {
  /** When the cooldown ends, as epoch milliseconds. null means no cooldown. */
  until: number | null;
  /** Starts a cooldown of `seconds` from `now`, keeping whichever end is later. */
  start: (seconds: number, now: number) => void;
  /** Clears the cooldown, as a logout does. */
  reset: () => void;
};

/** The cooldown of the manual syncs: one per tab, in memory only. A reload starts without one. */
export function createSyncCooldownStore() {
  return createStore<SyncCooldownState>()((set, get) => ({
    until: null,
    start: (seconds, now) => {
      const next = now + seconds * 1000;
      const current = get().until;
      set({ until: current === null ? next : Math.max(current, next) });
    },
    reset: () => set({ until: null }),
  }));
}

/** Whole seconds left until `until`, rounded up and never negative. No cooldown has none left. */
export function remainingSeconds(until: number | null, now: number): number {
  if (until === null) {
    return 0;
  }
  return Math.max(0, Math.ceil((until - now) / 1000));
}

/**
 * The app's one cooldown. Every SyncNow and every page reads this store, so they show the same remaining time, and a
 * logout clears it.
 */
export const syncCooldownStore = createSyncCooldownStore();

/**
 * The seconds left in the cooldown. It re-renders once a second while there are seconds left, and stops once it reaches
 * zero, so a finished cooldown costs nothing.
 */
export function useSyncCooldown(): number {
  const until = useStore(syncCooldownStore, (state) => state.until);
  const [remaining, setRemaining] = useState(() =>
    remainingSeconds(until, Date.now()),
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      const left = remainingSeconds(until, Date.now());
      setRemaining(left);
      if (left > 0) {
        timer = setTimeout(tick, 1000);
      }
    };
    tick();
    return () => clearTimeout(timer);
  }, [until]);

  return remaining;
}
