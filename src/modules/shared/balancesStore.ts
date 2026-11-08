import { createStore, type StoreApi } from "zustand/vanilla";
import { loadBalancesShown, saveBalancesShown, shownFromStorageEvent, type BalancesStorage } from "./privacy";

export type BalancesState = {
  /** Whether money shows on every page. */
  shown: boolean;
  /** Flips the choice and saves it. */
  toggle: () => void;
};

/**
 * The show or hide state of the money, one per browser, starting from the saved choice. The state changes even when the save
 * fails, so a blocked storage still lets the user show and hide within the session.
 */
export function createBalancesStore(getStorage?: () => BalancesStorage | undefined) {
  return createStore<BalancesState>()((set, get) => ({
    shown: loadBalancesShown(getStorage),
    toggle: () => {
      const next = !get().shown;
      saveBalancesShown(next, getStorage);
      set({ shown: next });
    },
  }));
}

/** The part of an event target that the sync listens on. */
type SyncTarget = Pick<EventTarget, "addEventListener" | "removeEventListener">;

/**
 * Keeps the store in step with a choice that changes outside it. Another tab's write arrives as a storage event. A page restored
 * from the back/forward cache re-reads the saved choice, since it missed the events while it was frozen. The sync only reads
 * storage, so it never writes back. Returns the function that stops it.
 */
export function connectBalancesSync(
  store: StoreApi<BalancesState>,
  target: SyncTarget,
  getStorage?: () => BalancesStorage | undefined,
): () => void {
  const onStorage = (event: Event) => {
    const shown = shownFromStorageEvent(event as StorageEvent);
    if (shown !== undefined && shown !== store.getState().shown) {
      store.setState({ shown });
    }
  };
  const onPageShow = (event: Event) => {
    if ((event as PageTransitionEvent).persisted) {
      store.setState({ shown: loadBalancesShown(getStorage) });
    }
  };
  target.addEventListener("storage", onStorage);
  target.addEventListener("pageshow", onPageShow);
  return () => {
    target.removeEventListener("storage", onStorage);
    target.removeEventListener("pageshow", onPageShow);
  };
}

/** The app's one store, read through useBalancesHidden and written by the toggle. */
export const balancesStore = createBalancesStore();

// Registered once, for the life of the page. Without a window (Node, in tests) there's nothing to listen to.
if (typeof window !== "undefined") {
  connectBalancesSync(balancesStore, window);
}
