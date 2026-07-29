import { describe, expect, it } from "vitest";
import {
  EMPTY_SETTINGS,
  loadSettings,
  mergeSettings,
  normalizeSettings,
  type SyncedSettings,
} from "./settings";

// A fake storage getter over a plain map, for testing loadSettings without a DOM.
const fakeGet = (store: Record<string, string>) => (k: string) =>
  k in store ? store[k] : null;

describe("normalizeSettings", () => {
  it("returns empty settings for junk / missing input", () => {
    expect(normalizeSettings(null)).toEqual(EMPTY_SETTINGS);
    expect(normalizeSettings({})).toEqual(EMPTY_SETTINGS);
    expect(normalizeSettings("nonsense")).toEqual(EMPTY_SETTINGS);
  });

  it("keeps and dedupes string starforged entries", () => {
    const s = normalizeSettings({ starforged: ["A", "B", "A", 3, null] });
    expect(s.starforged.sort()).toEqual(["A", "B"]);
  });

  it("clamps transcendence levels to 1–3 and drops zero/invalid", () => {
    const s = normalizeSettings({
      transcendenceLevels: { A: 2, B: 5, C: 0, D: -1, E: "x", F: 3 },
    });
    expect(s.transcendenceLevels).toEqual({ A: 2, B: 3, F: 3 });
  });
});

describe("mergeSettings", () => {
  it("unions starforged and lets b win per-item transcendence", () => {
    const a: SyncedSettings = {
      starforged: ["A", "B"],
      transcendenceLevels: { X: 1, Y: 2 },
    };
    const b: SyncedSettings = {
      starforged: ["B", "C"],
      transcendenceLevels: { Y: 3, Z: 1 },
    };
    const m = mergeSettings(a, b);
    expect(m.starforged.sort()).toEqual(["A", "B", "C"]);
    expect(m.transcendenceLevels).toEqual({ X: 1, Y: 3, Z: 1 });
  });
});

describe("loadSettings", () => {
  it("returns empty when storage is empty", () => {
    expect(loadSettings(fakeGet({}))).toEqual(EMPTY_SETTINGS);
  });

  it("reads the combined blob when present", () => {
    const store = {
      "st-settings": JSON.stringify({
        starforged: ["A"],
        transcendenceLevels: { B: 2 },
      }),
    };
    expect(loadSettings(fakeGet(store))).toEqual({
      starforged: ["A"],
      transcendenceLevels: { B: 2 },
    });
  });

  it("migrates the legacy per-feature keys when the blob is absent", () => {
    const store = {
      "sf-unlocked": JSON.stringify(["Sword A", "Shield B"]),
      "transcendence-levels": JSON.stringify({ "Sword A": 3 }),
    };
    const s = loadSettings(fakeGet(store));
    expect(s.starforged.sort()).toEqual(["Shield B", "Sword A"]);
    expect(s.transcendenceLevels).toEqual({ "Sword A": 3 });
  });

  it("prefers the combined blob over legacy keys", () => {
    const store = {
      "st-settings": JSON.stringify({ starforged: ["new"], transcendenceLevels: {} }),
      "sf-unlocked": JSON.stringify(["old"]),
    };
    expect(loadSettings(fakeGet(store)).starforged).toEqual(["new"]);
  });

  it("survives corrupt JSON", () => {
    expect(loadSettings(fakeGet({ "st-settings": "{not json" }))).toEqual(
      EMPTY_SETTINGS,
    );
  });
});
