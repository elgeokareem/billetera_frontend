// Hiding balances. The choice is one setting per browser, saved in localStorage under BALANCES_STORAGE_KEY and held in memory
// by the store in balancesStore.ts. It never goes in the URL, so browser history can't change it. Only the exact text "true"
// shows balances; anything else hides them. The storage can be passed in, so these can be tested in Node.

/** The localStorage key of the saved choice. It shares the billetera. prefix with billetera.language. */
export const BALANCES_STORAGE_KEY = "billetera.showBalances";

/** The part of localStorage that the choice needs. */
export type BalancesStorage = Pick<Storage, "getItem" | "setItem">;

/** The one stored value that shows balances. */
const SHOWN = "true";
/** The stored value for a hidden choice. Missing and any other text also hide. */
const HIDDEN = "false";

/** The browser's localStorage. Reading it can throw, since some browsers block storage, so callers reach it inside a try. */
function browserStorage(): BalancesStorage | undefined {
  return globalThis.localStorage;
}

/**
 * Whether the saved choice shows balances. No storage, no saved value, "false", any other text or an exception all hide them,
 * so a missing or stray value can't reveal anything.
 */
export function loadBalancesShown(getStorage: () => BalancesStorage | undefined = browserStorage): boolean {
  try {
    return getStorage()?.getItem(BALANCES_STORAGE_KEY) === SHOWN;
  } catch {
    return false;
  }
}

/** Saves the choice. A failed write is ignored, so the choice then lasts only for this session. */
export function saveBalancesShown(shown: boolean, getStorage: () => BalancesStorage | undefined = browserStorage): void {
  try {
    getStorage()?.setItem(BALANCES_STORAGE_KEY, shown ? SHOWN : HIDDEN);
  } catch {
    // The choice just won't survive a reload.
  }
}

/**
 * What a storage event from another tab says about the choice. Our key gives true or false, and a removal (no new value) reads
 * as hidden. A cleared storage (no key) hides. Any other key gives undefined, which the store ignores.
 */
export function shownFromStorageEvent(event: { key: string | null; newValue: string | null }): boolean | undefined {
  if (event.key === BALANCES_STORAGE_KEY) {
    return event.newValue === SHOWN;
  }
  return event.key === null ? false : undefined;
}

/** What a hidden value shows: four bullets (U+2022), the same in every language. */
export const MASK = "••••";

/** The text of a value, or the mask in its place while balances are hidden. */
export function maskText(text: string, hidden: boolean): string {
  return hidden ? MASK : text;
}
