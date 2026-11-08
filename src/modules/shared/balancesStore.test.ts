import { describe, expect, it, vi } from "vitest";
import { balancesStore, connectBalancesSync, createBalancesStore } from "./balancesStore";
import { BALANCES_STORAGE_KEY, type BalancesStorage } from "./privacy";

/** An in-memory stand-in for localStorage. */
function fakeStorage(entries: Record<string, string> = {}) {
  const map = new Map(Object.entries(entries));
  const storage: BalancesStorage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
  return { map, getStorage: () => storage };
}

/** A storage that throws on every access, as a blocked one does. */
const blocked = () => {
  throw new Error("blocked");
};

/** A storage event as another tab's write dispatches it. Node has no StorageEvent, so the fields go on a plain Event. */
function storageEvent(key: string | null, newValue: string | null = null) {
  return Object.assign(new Event("storage"), { key, newValue });
}

function pageshowEvent(persisted: boolean) {
  return Object.assign(new Event("pageshow"), { persisted });
}

describe("the initial state", () => {
  it("is hidden when nothing is saved", () => {
    expect(createBalancesStore(fakeStorage().getStorage).getState().shown).toBe(false);
  });

  it("is shown when the saved text is true", () => {
    const { getStorage } = fakeStorage({ [BALANCES_STORAGE_KEY]: "true" });
    expect(createBalancesStore(getStorage).getState().shown).toBe(true);
  });

  it("is hidden when the saved text is false, or anything else", () => {
    for (const saved of ["false", "garbage", ""]) {
      const { getStorage } = fakeStorage({ [BALANCES_STORAGE_KEY]: saved });
      expect(createBalancesStore(getStorage).getState().shown, JSON.stringify(saved)).toBe(false);
    }
  });

  it("is hidden when the storage throws", () => {
    expect(createBalancesStore(blocked).getState().shown).toBe(false);
  });

  it("is hidden in Node, where the app's store has no saved choice and no window", () => {
    expect(balancesStore.getState().shown).toBe(false);
  });
});

describe("toggle", () => {
  it("shows from hidden, and saves true", () => {
    const { map, getStorage } = fakeStorage();
    const store = createBalancesStore(getStorage);

    store.getState().toggle();

    expect(store.getState().shown).toBe(true);
    expect(map.get(BALANCES_STORAGE_KEY)).toBe("true");
  });

  it("hides again, and saves false", () => {
    const { map, getStorage } = fakeStorage();
    const store = createBalancesStore(getStorage);

    store.getState().toggle();
    store.getState().toggle();

    expect(store.getState().shown).toBe(false);
    expect(map.get(BALANCES_STORAGE_KEY)).toBe("false");
  });

  it("a new store on the same storage starts with the last value", () => {
    const { getStorage } = fakeStorage();
    createBalancesStore(getStorage).getState().toggle();
    expect(createBalancesStore(getStorage).getState().shown).toBe(true);

    createBalancesStore(getStorage).getState().toggle();
    expect(createBalancesStore(getStorage).getState().shown).toBe(false);
  });

  it("still flips the state, without throwing, when the storage getter throws", () => {
    const store = createBalancesStore(blocked);

    expect(() => store.getState().toggle()).not.toThrow();
    expect(store.getState().shown).toBe(true);

    store.getState().toggle();
    expect(store.getState().shown).toBe(false);
  });

  it("still flips the state, without throwing, when the write throws", () => {
    const broken: BalancesStorage = { getItem: () => null, setItem: blocked };
    const store = createBalancesStore(() => broken);

    expect(() => store.getState().toggle()).not.toThrow();
    expect(store.getState().shown).toBe(true);
  });
});

describe("connectBalancesSync", () => {
  it("shows when another tab saves true under our key", () => {
    const target = new EventTarget();
    const { getStorage } = fakeStorage();
    const store = createBalancesStore(getStorage);
    connectBalancesSync(store, target, getStorage);

    target.dispatchEvent(storageEvent(BALANCES_STORAGE_KEY, "true"));

    expect(store.getState().shown).toBe(true);
  });

  it("hides when another tab saves false", () => {
    const target = new EventTarget();
    const { getStorage } = fakeStorage({ [BALANCES_STORAGE_KEY]: "true" });
    const store = createBalancesStore(getStorage);
    connectBalancesSync(store, target, getStorage);

    target.dispatchEvent(storageEvent(BALANCES_STORAGE_KEY, "false"));

    expect(store.getState().shown).toBe(false);
  });

  it("hides when another tab removes our key", () => {
    const target = new EventTarget();
    const { getStorage } = fakeStorage({ [BALANCES_STORAGE_KEY]: "true" });
    const store = createBalancesStore(getStorage);
    connectBalancesSync(store, target, getStorage);

    target.dispatchEvent(storageEvent(BALANCES_STORAGE_KEY, null));

    expect(store.getState().shown).toBe(false);
  });

  it("hides when another tab clears all storage", () => {
    const target = new EventTarget();
    const { getStorage } = fakeStorage({ [BALANCES_STORAGE_KEY]: "true" });
    const store = createBalancesStore(getStorage);
    connectBalancesSync(store, target, getStorage);

    target.dispatchEvent(storageEvent(null));

    expect(store.getState().shown).toBe(false);
  });

  it("changes nothing for another key", () => {
    const target = new EventTarget();
    const { getStorage } = fakeStorage({ [BALANCES_STORAGE_KEY]: "true" });
    const store = createBalancesStore(getStorage);
    connectBalancesSync(store, target, getStorage);

    target.dispatchEvent(storageEvent("billetera.language", "es"));

    expect(store.getState().shown).toBe(true);
  });

  it("stops listening after the unsubscribe function runs", () => {
    const target = new EventTarget();
    const { map, getStorage } = fakeStorage();
    const store = createBalancesStore(getStorage);
    const unsubscribe = connectBalancesSync(store, target, getStorage);

    unsubscribe();
    target.dispatchEvent(storageEvent(BALANCES_STORAGE_KEY, "true"));
    expect(store.getState().shown).toBe(false);

    map.set(BALANCES_STORAGE_KEY, "true");
    target.dispatchEvent(pageshowEvent(true));
    expect(store.getState().shown).toBe(false);
  });

  it("re-reads storage on a page restored from the back/forward cache", () => {
    const target = new EventTarget();
    const { map, getStorage } = fakeStorage();
    const store = createBalancesStore(getStorage);
    connectBalancesSync(store, target, getStorage);

    // Written while the page was frozen, so no storage event reached it.
    map.set(BALANCES_STORAGE_KEY, "true");
    target.dispatchEvent(pageshowEvent(true));

    expect(store.getState().shown).toBe(true);
  });

  it("doesn't re-read storage on an ordinary pageshow", () => {
    const target = new EventTarget();
    const { map, getStorage } = fakeStorage();
    const store = createBalancesStore(getStorage);
    connectBalancesSync(store, target, getStorage);

    map.set(BALANCES_STORAGE_KEY, "true");
    target.dispatchEvent(pageshowEvent(false));

    expect(store.getState().shown).toBe(false);
  });

  it("never writes to storage when it reacts to an event", () => {
    const target = new EventTarget();
    const setItem = vi.fn();
    const store = createBalancesStore(() => ({ getItem: () => null, setItem }));
    connectBalancesSync(store, target, () => ({ getItem: () => null, setItem }));

    target.dispatchEvent(storageEvent(BALANCES_STORAGE_KEY, "true"));
    target.dispatchEvent(storageEvent(null));
    target.dispatchEvent(pageshowEvent(true));

    expect(setItem).not.toHaveBeenCalled();
  });
});
