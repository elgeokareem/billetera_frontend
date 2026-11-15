import { describe, expect, it } from "vitest";
import { createSyncCooldownStore, remainingSeconds } from "./syncCooldown";

const NOW = 1_700_000_000_000;

describe("remainingSeconds", () => {
  it("is zero once the cooldown is over", () => {
    expect(remainingSeconds(NOW - 1, NOW)).toBe(0);
    expect(remainingSeconds(NOW - 60_000, NOW)).toBe(0);
  });

  it("rounds a part of a second up", () => {
    expect(remainingSeconds(NOW + 200, NOW)).toBe(1);
  });

  it("counts whole seconds", () => {
    expect(remainingSeconds(NOW + 60_000, NOW)).toBe(60);
    expect(remainingSeconds(NOW + 60_001, NOW)).toBe(61);
  });

  it("is zero when no cooldown is running", () => {
    expect(remainingSeconds(null, NOW)).toBe(0);
  });
});

describe("the sync cooldown store", () => {
  it("starts with no cooldown", () => {
    expect(createSyncCooldownStore().getState().until).toBeNull();
  });

  it("sets until from the seconds and now", () => {
    const store = createSyncCooldownStore();

    store.getState().start(60, NOW);

    expect(store.getState().until).toBe(NOW + 60_000);
  });

  it("keeps the later end when a shorter cooldown starts", () => {
    const store = createSyncCooldownStore();
    store.getState().start(60, NOW);

    store.getState().start(5, NOW);

    expect(store.getState().until).toBe(NOW + 60_000);
  });

  it("extends the end when a longer cooldown starts", () => {
    const store = createSyncCooldownStore();
    store.getState().start(5, NOW);

    store.getState().start(60, NOW);

    expect(store.getState().until).toBe(NOW + 60_000);
  });

  it("clears the cooldown on reset", () => {
    const store = createSyncCooldownStore();
    store.getState().start(60, NOW);

    store.getState().reset();

    expect(store.getState().until).toBeNull();
  });
});
