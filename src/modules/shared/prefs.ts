// Small saved choices, one per browser. Each is a string in localStorage under a billetera. key, read back only when it's one
// of the values the choice allows. The storage can be passed in, so these can be tested in Node.

/** The part of localStorage that a saved choice needs. */
export type PrefsStorage = Pick<Storage, "getItem" | "setItem">;

/** The browser's localStorage. Reaching it can throw, since some browsers block storage, so callers do it inside a try. */
function browserStorage(): PrefsStorage | undefined {
  return globalThis.localStorage;
}

/**
 * The saved value of a choice. Missing, any value that isn't allowed, an exception and no storage all give the fallback, so a
 * stray value can't leave the app in a state it doesn't know.
 */
export function loadPref<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
  getStorage: () => PrefsStorage | undefined = browserStorage,
): T {
  try {
    const value = getStorage()?.getItem(key);
    return allowed.includes(value as T) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Saves a choice. A failed write is ignored, so the choice then lasts only for this session. */
export function savePref(
  key: string,
  value: string,
  getStorage: () => PrefsStorage | undefined = browserStorage,
): void {
  try {
    getStorage()?.setItem(key, value);
  } catch {
    // The choice just won't survive a reload.
  }
}
