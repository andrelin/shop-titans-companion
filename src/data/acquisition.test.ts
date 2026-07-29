import { describe, expect, it } from "vitest";
import type { Blueprint } from "./types";
import { acquisitionBadge } from "./acquisition";

// Minimal blueprint with only the acquisition fields that matter here.
function bp(overrides: Partial<Blueprint>): Blueprint {
  return {
    name: "X",
    type: "Sword",
    tier: 15,
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
    ...overrides,
  };
}

const NOW = Date.parse("2026-07-29T00:00:00Z");

describe("acquisitionBadge", () => {
  it("returns null for freely craftable items", () => {
    expect(acquisitionBadge(bp({ premium: false }), NOW)).toBeNull();
    expect(acquisitionBadge(bp({}), NOW)).toBeNull();
  });

  it("flags a premium pack item still before its antique date", () => {
    const b = bp({
      premium: true,
      unlockPrerequisite: "7th Anniversary Superior Pack",
      antiqueFrom: "December 20, 2026",
    });
    expect(acquisitionBadge(b, NOW)?.state).toBe("premium");
  });

  it("flips to 'antiques' once the rotation date has passed", () => {
    const b = bp({
      premium: true,
      unlockPrerequisite: "Cinderlake Volcano Superior Pack II",
      antiqueFrom: "May 17, 2026",
    });
    expect(acquisitionBadge(b, NOW)?.state).toBe("antiques");
  });

  it("flags chest drops that haven't rotated to antiques", () => {
    const b = bp({ premium: true, unlockPrerequisite: "Divine Chest", antiqueFrom: null });
    expect(acquisitionBadge(b, NOW)?.state).toBe("chest");
  });

  it("prioritises 'antiques' over 'chest' when both apply", () => {
    const b = bp({
      premium: true,
      unlockPrerequisite: "Some Chest",
      antiqueFrom: "May 17, 2026",
    });
    expect(acquisitionBadge(b, NOW)?.state).toBe("antiques");
  });

  it("treats the antique date as UTC midnight (timezone-independent boundary)", () => {
    const b = bp({
      premium: true,
      unlockPrerequisite: "A Pack",
      antiqueFrom: "July 29, 2026",
    });
    // At exactly UTC midnight of the 29th it has rotated; one hour before, not.
    expect(acquisitionBadge(b, Date.parse("2026-07-29T00:00:00Z"))?.state).toBe(
      "antiques",
    );
    expect(acquisitionBadge(b, Date.parse("2026-07-28T23:00:00Z"))?.state).toBe(
      "premium",
    );
  });
});
