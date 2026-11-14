import { describe, expect, it } from "vitest";
import { loadPref, type PrefsStorage, savePref } from "./prefs";

const KEY = "billetera.test";
const ALLOWED = ["open", "closed"] as const;

/** An in-memory stand-in for localStorage. */
function fakeStorage(entries: Record<string, string> = {}) {
  const map = new Map(Object.entries(entries));
  const storage: PrefsStorage = {
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

describe("loadPref", () => {
  it("reads a saved value that the choice allows", () => {
    expect(loadPref(KEY, ALLOWED, "closed", fakeStorage({ [KEY]: "open" }).getStorage)).toBe("open");
  });

  it("gives the fallback when nothing is saved", () => {
    expect(loadPref(KEY, ALLOWED, "closed", fakeStorage().getStorage)).toBe("closed");
  });

  it("gives the fallback for a value the choice doesn't allow", () => {
    for (const saved of ["", "OPEN", "hidden", " open"]) {
      expect(loadPref(KEY, ALLOWED, "closed", fakeStorage({ [KEY]: saved }).getStorage), JSON.stringify(saved)).toBe(
        "closed",
      );
    }
  });

  it("gives the fallback when there's no storage", () => {
    expect(loadPref(KEY, ALLOWED, "closed", () => undefined)).toBe("closed");
  });

  it("gives the fallback when the storage getter throws", () => {
    expect(loadPref(KEY, ALLOWED, "closed", blocked)).toBe("closed");
  });

  it("gives the fallback when reading the storage throws", () => {
    const broken: PrefsStorage = { getItem: blocked, setItem: () => {} };
    expect(loadPref(KEY, ALLOWED, "closed", () => broken)).toBe("closed");
  });
});

describe("savePref", () => {
  it("writes the value under the key, and it reads back", () => {
    const { map, getStorage } = fakeStorage();

    savePref(KEY, "open", getStorage);
    expect(map.get(KEY)).toBe("open");
    expect(loadPref(KEY, ALLOWED, "closed", getStorage)).toBe("open");

    savePref(KEY, "closed", getStorage);
    expect(map.get(KEY)).toBe("closed");
    expect(loadPref(KEY, ALLOWED, "closed", getStorage)).toBe("closed");
  });

  it("doesn't throw when there's no storage, or the getter throws", () => {
    expect(() => savePref(KEY, "open", () => undefined)).not.toThrow();
    expect(() => savePref(KEY, "open", blocked)).not.toThrow();
  });

  it("doesn't throw when the write throws", () => {
    const broken: PrefsStorage = { getItem: () => null, setItem: blocked };
    expect(() => savePref(KEY, "open", () => broken)).not.toThrow();
  });
});
