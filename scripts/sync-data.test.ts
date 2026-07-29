import { describe, expect, it } from "vitest";
import {
  buildSummary,
  diffBlueprints,
  type ParsedBlueprint,
} from "./sync-data";

// Minimal ParsedBlueprint factory — only the fields a test cares about need to
// be passed; the rest get inert defaults.
function bp(partial: Partial<ParsedBlueprint> & { name: string }): ParsedBlueprint {
  return {
    type: "Sword",
    tier: 1,
    airshipPower: 0,
    atk: 0,
    def: 0,
    hp: 0,
    eva: 0,
    crit: 0,
    elementalAffinity: [],
    spiritAffinity: [],
    builtInElement: [],
    builtInSpirit: [],
    craftingUpgrades: [],
    starforgedMilestones: [],
    ascensionUpgrades: [],
    hasAirshipPowerUpgrade: false,
    airshipPowerUpgradeBonus: 0,
    ...partial,
  };
}

describe("diffBlueprints", () => {
  it("detects added, removed, and unchanged items", () => {
    const prev = [bp({ name: "Alpha" }), bp({ name: "Beta" })];
    const next = [bp({ name: "Alpha" }), bp({ name: "Gamma" })];
    const d = diffBlueprints(prev, next);
    expect(d.added.map((b) => b.name)).toEqual(["Gamma"]);
    expect(d.removed).toEqual(["Beta"]);
    expect(d.changed).toEqual([]);
  });

  it("reports AP-relevant field changes with before → after text", () => {
    const prev = [bp({ name: "Alpha", airshipPower: 100, atk: 50 })];
    const next = [bp({ name: "Alpha", airshipPower: 120, atk: 55 })];
    const d = diffBlueprints(prev, next);
    expect(d.changed).toHaveLength(1);
    expect(d.changed[0].name).toBe("Alpha");
    expect(d.changed[0].changes).toContain("airshipPower 100 → 120");
    expect(d.changed[0].changes).toContain("atk 50 → 55");
  });

  it("renders array and object fields readably", () => {
    const prev = [bp({ name: "Alpha", elementalAffinity: [] })];
    const next = [
      bp({
        name: "Alpha",
        elementalAffinity: ["Fire", "Dark"],
        starforgedStatBoosts: { atk: 0.25, def: 0.25, hp: 0.25 },
      }),
    ];
    const d = diffBlueprints(prev, next);
    const changes = d.changed[0].changes.join(" | ");
    expect(changes).toContain("elementalAffinity — → Fire/Dark");
    expect(changes).toContain('starforgedStatBoosts — → {"atk":0.25,"def":0.25,"hp":0.25}');
  });

  it("ignores non-ranker fields like crafting upgrade lists", () => {
    const prev = [bp({ name: "Alpha", craftingUpgrades: ["a"] })];
    const next = [bp({ name: "Alpha", craftingUpgrades: ["a", "b"] })];
    expect(diffBlueprints(prev, next).changed).toEqual([]);
  });
});

describe("buildSummary", () => {
  it("produces a headline with version, date, and ±counts", () => {
    const diff = diffBlueprints(
      [bp({ name: "Old" }), bp({ name: "Same" })],
      [bp({ name: "Same" }), bp({ name: "New" })],
    );
    const { headline, entry } = buildSummary({
      date: "2026-07-29T06:00:00.000Z",
      prevVersion: "v26.7.0",
      version: "v26.8.0",
      prevCount: 2,
      nextCount: 2,
      diff,
    });
    expect(headline).toBe("data: sync v26.8.0 (2026-07-29) — +1 −1 ~0 items");
    expect(entry).toContain("## 2026-07-29 — v26.8.0");
    expect(entry).toContain("Sheet version: v26.7.0 → v26.8.0");
    expect(entry).toContain("### Added (1)");
    expect(entry).toContain("- New (Sword T1)");
    expect(entry).toContain("### Removed (1)");
    expect(entry).toContain("- Old");
  });

  it("notes a version-only change when no items differ", () => {
    const diff = diffBlueprints([bp({ name: "A" })], [bp({ name: "A" })]);
    const { entry } = buildSummary({
      date: "2026-07-29T06:00:00.000Z",
      prevVersion: "v26.7.0",
      version: "v26.8.0",
      prevCount: 1,
      nextCount: 1,
      diff,
    });
    expect(entry).toContain("version/metadata only");
  });

  it("caps very long change lists", () => {
    const prev = Array.from({ length: 200 }, (_, i) =>
      bp({ name: `Item${i}`, airshipPower: 1 }),
    );
    const next = prev.map((b) => bp({ ...b, airshipPower: 2 }));
    const diff = diffBlueprints(prev, next);
    const { entry } = buildSummary({
      date: "2026-07-29T06:00:00.000Z",
      prevVersion: "v1",
      version: "v1",
      prevCount: 200,
      nextCount: 200,
      diff,
    });
    expect(entry).toContain("### Changed (200)");
    expect(entry).toContain("…and 120 more");
  });
});
