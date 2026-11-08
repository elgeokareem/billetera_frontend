import { describe, expect, it } from "vitest";
import {
  BALANCES_STORAGE_KEY,
  type BalancesStorage,
  loadBalancesShown,
  MASK,
  maskText,
  saveBalancesShown,
  shownFromStorageEvent,
} from "./privacy";

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

describe("maskText", () => {
  it("shows the text when balances are shown", () => {
    expect(maskText("$1,233.90", false)).toBe("$1,233.90");
  });

  it("shows four bullets in place of the text when balances are hidden", () => {
    expect(maskText("$1,233.90", true)).toBe(MASK);
    expect(MASK).toBe("••••");
  });
});

describe("loadBalancesShown", () => {
  it("reads the billetera.showBalances key", () => {
    expect(BALANCES_STORAGE_KEY).toBe("billetera.showBalances");
  });

  it("shows balances only for the saved text true", () => {
    expect(loadBalancesShown(fakeStorage({ [BALANCES_STORAGE_KEY]: "true" }).getStorage)).toBe(true);
  });

  it("hides balances when nothing is saved, or the saved text isn't exactly true", () => {
    for (const saved of ["false", "", "TRUE", "1", " true", "yes"]) {
      expect(loadBalancesShown(fakeStorage({ [BALANCES_STORAGE_KEY]: saved }).getStorage), JSON.stringify(saved)).toBe(false);
    }
    expect(loadBalancesShown(fakeStorage().getStorage)).toBe(false);
  });

  it("hides balances when there's no storage", () => {
    expect(loadBalancesShown(() => undefined)).toBe(false);
  });

  it("hides balances when the storage getter throws", () => {
    expect(loadBalancesShown(blocked)).toBe(false);
  });

  it("hides balances when reading the storage throws", () => {
    const broken: BalancesStorage = { getItem: blocked, setItem: () => {} };
    expect(loadBalancesShown(() => broken)).toBe(false);
  });
});

describe("saveBalancesShown", () => {
  it("writes true, then false, under the key, and each one reads back", () => {
    const { map, getStorage } = fakeStorage();

    saveBalancesShown(true, getStorage);
    expect(map.get(BALANCES_STORAGE_KEY)).toBe("true");
    expect(loadBalancesShown(getStorage)).toBe(true);

    saveBalancesShown(false, getStorage);
    expect(map.get(BALANCES_STORAGE_KEY)).toBe("false");
    expect(loadBalancesShown(getStorage)).toBe(false);
  });

  it("doesn't throw when the storage getter throws", () => {
    expect(() => saveBalancesShown(true, blocked)).not.toThrow();
  });

  it("doesn't throw when the write throws", () => {
    const broken: BalancesStorage = { getItem: () => null, setItem: blocked };
    expect(() => saveBalancesShown(true, () => broken)).not.toThrow();
  });
});

describe("shownFromStorageEvent", () => {
  it("reads our key: true shows, and false, a removal or any other text hides", () => {
    expect(shownFromStorageEvent({ key: BALANCES_STORAGE_KEY, newValue: "true" })).toBe(true);
    expect(shownFromStorageEvent({ key: BALANCES_STORAGE_KEY, newValue: "false" })).toBe(false);
    expect(shownFromStorageEvent({ key: BALANCES_STORAGE_KEY, newValue: null })).toBe(false);
    expect(shownFromStorageEvent({ key: BALANCES_STORAGE_KEY, newValue: "yes" })).toBe(false);
  });

  it("hides when the storage was cleared (no key)", () => {
    expect(shownFromStorageEvent({ key: null, newValue: null })).toBe(false);
  });

  it("ignores another key", () => {
    expect(shownFromStorageEvent({ key: "billetera.language", newValue: "es" })).toBeUndefined();
  });
});
