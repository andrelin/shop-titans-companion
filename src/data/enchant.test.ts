import { describe, expect, it } from "vitest";
import type { Blueprint } from "./types";
import {
  ELEMENT_TABLE,
  SPIRIT_TABLE,
  applyArtifactStatMods,
  bestEnchantPlan,
  computePower,
} from "./enchant";

function bp(overrides: Partial<Blueprint>): Blueprint {
  return {
    name: "Test Item",
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

const commonOpts = {
  quality: "Common" as const,
  enchanted: true,
  affinityMatched: true,
  includeAirshipUpgrade: true,
  includeStarforgedStatBoosts: false,
  maxEnchantTier: 14,
};

// ---------------------------------------------------------------------------
// Base AP — verified against the canonical Blueprints column
// ---------------------------------------------------------------------------

describe("base AP formula", () => {
  it("crit multiplies the entire stat sum (Twin Fangs: atk + 5% crit)", () => {
    const b = bp({ atk: 1160, crit: 0.05, tier: 14 });
    expect(computePower(b, { ...commonOpts, enchanted: false })).toBe(1392);
  });

  it("eva multiplies the entire stat sum (Sia's base)", () => {
    const b = bp({ def: 670, eva: 0.05, tier: 15, type: "Light Armor" });
    expect(computePower(b, { ...commonOpts, enchanted: false })).toBe(1206);
  });

  it("atk+def combine linearly (Frogsong's base)", () => {
    const b = bp({ atk: 1770, def: 443, tier: 15 });
    // 0.8·1770 + 1.2·443 = 1947.6 → round 1948 (matches Blueprints column)
    expect(computePower(b, { ...commonOpts, enchanted: false })).toBe(1948);
  });
});

// ---------------------------------------------------------------------------
// T14 verified in-game data points (Common quality)
// ---------------------------------------------------------------------------

describe("T14 enchanted AP — verified in-game", () => {
  it("Sia's Fancy Outfit + Tornado (Air match) + Behemoth (non-match) = 1695 (±1)", () => {
    // Sole exception to round-half-up: the raw value is 1695.6 but the
    // user's in-game reading is 1695, not 1696. Re-verified on a freshly
    // crafted Common Sia (2026-06-06) — genuinely 1695. Every other
    // verified item with a .6 fractional rounds up; Slathered Slippers
    // (same item slot, eva 7%) gives 1880.88 → 1881 cleanly. No formula
    // tweak fits both Sia and Slathered, so this stays a ±1 tolerance —
    // likely a subtle interaction between Sia's specific eva value and
    // the in-game rounding chain we haven't yet reverse-engineered.
    const b = bp({
      name: "Sia's Fancy Outfit",
      type: "Light Armor",
      tier: 15,
      def: 670,
      eva: 0.05,
      elementalAffinity: ["Air"],
    });
    const got = computePower(b, commonOpts);
    expect(Math.abs(got - 1695)).toBeLessThanOrEqual(1);
  });

  it("Frogsong Gong + Gaia (Earth match) + Griffin (non-match) = 2602", () => {
    const b = bp({
      name: "Frogsong Gong",
      type: "Instrument",
      tier: 15,
      atk: 1770,
      def: 443,
      elementalAffinity: ["Earth", "Water"],
    });
    expect(computePower(b, commonOpts)).toBe(2602);
  });

  it("Mundra's Decree + Oblivion (non-match) + Mundra (built-in, 0 AP) = 2596", () => {
    const b = bp({
      name: "Mundra's Decree",
      type: "Spell",
      tier: 15,
      atk: 2205,
      def: 475,
      builtInSpirit: ["Mundra's Spirit"],
    });
    expect(computePower(b, commonOpts)).toBe(2596);
  });

  it("Titan Admiral Arms + Apotheosis (Light match) + Titan (match) = 2443", () => {
    // Raw 2442.6 → round 2443 ✓ matches game.
    const b = bp({
      name: "Titan Admiral Arms",
      type: "Dual Wield",
      tier: 15,
      atk: 1630,
      hp: 51,
      elementalAffinity: ["Light", "Water"],
      spiritAffinity: ["Titan Solemnity"],
    });
    expect(computePower(b, commonOpts)).toBe(2443);
  });

  it("Slathered Slippers + Gaia (Earth match) + Bahamut (non-match) = 1881", () => {
    // Raw 1880.88 → round 1881 ✓ matches game.
    const b = bp({
      name: "Slathered Slippers",
      type: "Light Footwear",
      tier: 15,
      def: 650,
      eva: 0.07,
      elementalAffinity: ["Earth", "Water"],
    });
    expect(computePower(b, commonOpts)).toBe(1881);
  });
});

// ---------------------------------------------------------------------------
// Open data points — model doesn't match in-game; needs more readings to
// figure out which value is right
// ---------------------------------------------------------------------------

describe("hp enchant cap at base hp", () => {
  // Malady's Robe (def 630 + hp 39, both T14 matches): the hp_match=49 stat
  // is capped at the item's base hp 39 → game 1732.
  it("Malady's Robe + Apotheosis + Ouroboros = 1732", () => {
    const b = bp({
      name: "Malady's Robe",
      type: "Clothes",
      tier: 15,
      def: 630,
      hp: 39,
      elementalAffinity: ["Light"],
      spiritAffinity: ["Ouroboros Eternity"],
    });
    expect(computePower(b, commonOpts)).toBe(1732);
  });

  // Potion of Renewal T7 hp 32, no affinities, T14 Tornado + Behemoth applied.
  // Both T14 enchants non-match. Per slot: hp_base 33 stat capped at 32 → 32 hp.
  // Gain = 2 × 32 × 5 = 320. AP = 160 + 320 = 480.
  it("Potion of Renewal + Tornado + Behemoth (T14 enchants on T7 item) = 480", () => {
    const b = bp({
      name: "Potion of Renewal",
      type: "Potion",
      tier: 7,
      hp: 32,
    });
    expect(computePower(b, commonOpts)).toBe(480);
  });

  // Squire Sword T1 atk 16 with T14 Oblivion + T14 Griffin (both non-match)
  // gave 38 in-game. Confirms (a) T1 items can be enchanted at all, and
  // (b) atk has the same per-slot cap at the item's base stat as hp:
  // atk added per slot = min(164, 16) = 16; total atk 48; AP 0.8·48 = 38.4
  // → floor 38.
  it("Squire Sword + Oblivion + Griffin (T14 enchants on T1 item) = 38", () => {
    const b = bp({
      name: "Squire Sword",
      type: "Sword",
      tier: 1,
      atk: 16,
    });
    expect(computePower(b, commonOpts)).toBe(38);
  });

  // Imbued Blade T4 atk 104 def 26, "All" elemental affinity (matches any
  // element), no spirit affinity. T14 Oblivion (match via "All") + T14
  // Griffin (non-match): both stats capped at the item's base values per
  // slot. atk: 104 + min(246,104) + min(164,104) = 312. def: 26 + min(163,26)
  // + min(109,26) = 78. AP = 0.8·312 + 1.2·78 = 343.2 → 343. Confirms def
  // has the same cap shape as atk and hp.
  it("Imbued Blade + Oblivion + Griffin (T14 on T4 item) = 343", () => {
    const b = bp({
      name: "Imbued Blade",
      type: "Sword",
      tier: 4,
      atk: 104,
      def: 26,
      elementalAffinity: ["All"],
    });
    expect(computePower(b, commonOpts)).toBe(343);
  });

  // Cursed King's Aegis T14 Shield (def 615 + hp 45, Dark affinity, +25%
  // Airship Power upgrade) with Oblivion (T14 Dark match) + Bahamut
  // (T14 non-match) = 2099 in-game. Confirms (a) the hp cap kicks in
  // (45 < 49) and (b) the +25% upgrade multiplier is applied to the
  // unfloored enchanted AP before the final floor: 1679.4 × 1.25 =
  // 2099.25 → 2099.
  it("Cursed King's Aegis + Oblivion + Bahamut (+25% upgrade) = 2099", () => {
    const b = bp({
      name: "Cursed King's Aegis",
      type: "Shield",
      tier: 14,
      def: 615,
      hp: 45,
      elementalAffinity: ["Dark"],
      hasAirshipPowerUpgrade: true,
      airshipPowerUpgradeBonus: 0.25,
    });
    expect(computePower(b, commonOpts)).toBe(2099);
  });

  // Wyrmbane Cannon (T14 Gun, atk 1600 hp 50, Bahamut Sovereignty spirit
  // affinity) carries Meirika's Secret artifact skill (+20% airship power).
  // The canonical Blueprints sheet doesn't list artifact skills, so we
  // hardcode the bonus at sync time. Model: 1530 + 738 (atk 410 + hp 82
  // capped at 50 — 49 < 50 so no cap) = 2268; × 1.2 = 2721.6 → floor 2721;
  // in-game 2722 (the usual +1 rounding direction).
  it("Wyrmbane Cannon + Maelstrom + Bahamut (artifact +20%) = 2722", () => {
    const b = bp({
      name: "Wyrmbane Cannon",
      type: "Gun",
      tier: 14,
      atk: 1600,
      hp: 50,
      spiritAffinity: ["Bahamut Sovereignty"],
      hasAirshipPowerUpgrade: true,
      airshipPowerUpgradeBonus: 0.2,
    });
    // Raw 2721.6 → round 2722 ✓ matches game.
    expect(computePower(b, commonOpts)).toBe(2722);
  });

  // Ghost Trap (T15 Spell, atk 2190 hp 75, no affinities) with T14
  // Blistering (Fire non-match) + T14 Griffin (non-match): both slots
  // give T14 base values. atk += 164+164 = 328. hp += min(33,75)+min(33,75)
  // = 66. Final: atk 2518, hp 141. AP = 0.8·2518 + 5·141 = 2719.4 → floor
  // 2719. In-game 2719 — exact match.
  it("Ghost Trap + Blistering + Griffin = 2719", () => {
    const b = bp({
      name: "Ghost Trap",
      type: "Spell",
      tier: 15,
      atk: 2190,
      hp: 75,
    });
    expect(computePower(b, commonOpts)).toBe(2719);
  });

  // XL Magic Potion (T5 Potion, hp 24, no affinity) with only Xolotl Spirit
  // (T5, the only T5 enchant) applied — no element. In-game 145, base 120,
  // gain 25 = 5 (T5 hp_base stat) × 5 (hp weight). Confirms T5 hp_base = 5.
  // We can't run this through computePower directly because computePower
  // assumes both slots are filled for max AP — pin the T5 hp_base value
  // on the bestEnchantPlan output at maxEnchantTier=5 instead.
  // Rock Stompers (T14 Heavy Footwear, def 680 hp 42, Earth affinity) carries
  // Urist's Sturdiness: +250 Defense, +25% Defense, eva fixed at 0. Modified
  // def = (680 + 250) × 1.25 = 1162.5. With T14 Gaia match + T14 spirit
  // non-match, the model predicts ~2306 AP (vs 1727 without the artifact).
  // Awaiting in-game verification — see docs/data-points.md.
  it("Rock Stompers + Urist's Sturdiness modifies def to 1162.5", () => {
    const b = bp({
      name: "Rock Stompers",
      tier: 14,
      def: 680,
      hp: 42,
      eva: 0,
      elementalAffinity: ["Earth"],
      artifactSkillName: "Urist's Sturdiness",
      artifactStatMods: { defAdd: 250, defMult: 1.25, evaSet: 0 },
    });
    const modded = applyArtifactStatMods(b);
    expect(modded.def).toBe(1162.5);
    expect(modded.hp).toBe(42);
    expect(modded.eva).toBe(0);
  });

  // Lone Wolf Cowl (T9 Rogue Hat, def 230 hp 19, Wolf spirit) carries
  // Savard's Aloofness: +40% Attack, +40% Defense. Modified def = 230 × 1.4
  // = 322. Atk stays 0 (×1.4 = 0). hp unchanged. Model prediction with T14
  // enchants applied: ~933 AP (vs 823 without).
  it("Lone Wolf Cowl + Savard's Aloofness multiplies atk/def by 1.4", () => {
    const b = bp({
      name: "Lone Wolf Cowl",
      tier: 9,
      def: 230,
      hp: 19,
      spiritAffinity: ["Wolf Ferocity"],
      artifactSkillName: "Savard's Aloofness",
      artifactStatMods: { atkMult: 1.4, defMult: 1.4 },
    });
    const modded = applyArtifactStatMods(b);
    expect(modded.atk).toBe(0);
    expect(modded.def).toBeCloseTo(322);
    expect(modded.hp).toBe(19);
  });

  // Torc of Peace (T14 Amulet, atk 180 def 720, Light affinity) carries
  // Myrthee's Left Hook: +20% Health, +10% Evasion. The big effect is on
  // eva — base 0 → 0.10, doubling the (1 + 10·eva) multiplier from 1 to 2.
  // Model prediction with T14 Apotheosis match + T14 spirit non-match:
  // ~3219 AP (vs 1610 without). Hp stays at 0 since it's a multiplier on 0.
  it("Torc of Peace + Myrthee's Left Hook adds 0.10 to eva", () => {
    const b = bp({
      name: "Torc of Peace",
      tier: 14,
      atk: 180,
      def: 720,
      hp: 0,
      eva: 0,
      elementalAffinity: ["Light"],
      artifactSkillName: "Myrthee's Left Hook",
      artifactStatMods: { hpMult: 1.2, evaAdd: 0.1 },
    });
    const modded = applyArtifactStatMods(b);
    expect(modded.atk).toBe(180);
    expect(modded.def).toBe(720);
    expect(modded.hp).toBe(0);
    expect(modded.eva).toBeCloseTo(0.1);
  });

  // Rock Stompers (T14 Heavy Footwear, def 680 hp 42, Earth affinity, with
  // Urist's Sturdiness artifact skill) + Gaia (Earth match) + Bahamut
  // (non-match) = 1727 in-game. This matches the model *without* the
  // artifact stat boost applied — confirming the stat-boost artifact skills
  // affect the wearer hero's stats, not the item's airship contribution.
  // `applyArtifactStatMods` exists for future tools (hero / quest planners)
  // but computePower deliberately doesn't apply it.
  it("Rock Stompers + Gaia + Bahamut = 1727 (Urist's doesn't affect AP)", () => {
    const b = bp({
      name: "Rock Stompers",
      tier: 14,
      def: 680,
      hp: 42,
      elementalAffinity: ["Earth"],
      artifactStatMods: { defAdd: 250, defMult: 1.25, evaSet: 0 },
    });
    expect(computePower(b, commonOpts)).toBe(1727);
  });

  // Torc of Peace (T14 Amulet, atk 180 def 720, Light affinity, with
  // Myrthee's Left Hook) + Apotheosis (Light match) + Griffin (non-match)
  // = 1610 in-game. Matches the model without Myrthee's applied:
  //   atk +180+164 (both capped at base 180), def +163+109, hp+0+0
  //   final 524 atk + 992 def = 419.2 + 1190.4 = 1609.6 → 1610.
  // Second confirmation that stat-boost artifacts don't affect AP.
  // Tower of Thorns (T9 Mace, atk 400 def 100, Earth affinity) with T14
  // Gaia (Earth match) + T14 Bahamut (non-match) = 1008 in-game. The def
  // cap at 100 kicks in for both slots (T14 def_match 163 → 100; T14
  // def_base 109 → 100), so def += 200 even though the table says 272.
  // Final atk 810 + def 300 → 0.8·810 + 1.2·300 = 1008 exact.
  it("Tower of Thorns + Gaia + Bahamut = 1008 (def cap at 100 on both slots)", () => {
    const b = bp({
      name: "Tower of Thorns",
      tier: 9,
      atk: 400,
      def: 100,
      elementalAffinity: ["Earth"],
    });
    expect(computePower(b, commonOpts)).toBe(1008);
  });

  // Tower of Thorns + T14 Oblivion (Dark non-match) + T9 Mammoth (T9 spirit
  // non-match) = 768 in-game. Computed directly from ENCHANT_TABLE rather
  // than via computePower, because bestEnchantPlan would pick T14+T14 (the
  // higher-AP plan) — the reading specifically pins the mixed-tier case.
  // Verifies T9 non-match stat values (atk_base 48, def_base 32) and the
  // def cap at base def 100 per slot. Final atk 612 + def 232 = 768.
  // Tower of Thorns + Primeval (T12 Earth match) + Carbuncle (T12 non-match
  // spirit) = 836 in-game. Pins the new T12 atk/def stat values.
  //   atk: 400 + 148 (match) + 99 (base) = 647
  //   def: 100 + min(99, 100) + min(66, 100) = 100 + 99 + 66 = 265
  //   AP : 0.8·647 + 1.2·265 = 517.6 + 318 = 835.6 → 836 ✓
  it("Tower of Thorns + Primeval + Carbuncle = 836 (T12 stat values)", () => {
    const b = bp({
      name: "Tower of Thorns",
      tier: 9,
      atk: 400,
      def: 100,
      elementalAffinity: ["Earth"],
    });
    expect(computePower(b, { ...commonOpts, maxEnchantTier: 12 })).toBe(836);
  });

  it("Tower of Thorns + T14 non-match + T9 non-match formula gives 768", () => {
    const baseAtk = 400, baseDef = 100;
    // Oblivion is a T14 element; Mammoth is a T9 spirit (both non-match).
    const atkAdd =
      ELEMENT_TABLE.atk[14].base + SPIRIT_TABLE.atk[9].base;
    const defAdd =
      Math.min(ELEMENT_TABLE.def[14].base, baseDef) +
      Math.min(SPIRIT_TABLE.def[9].base, baseDef);
    const ap = 0.8 * (baseAtk + atkAdd) + 1.2 * (baseDef + defAdd);
    expect(Math.round(ap)).toBe(768);
  });

  it("Torc of Peace + Apotheosis + Griffin = 1610 (Myrthee's doesn't affect AP)", () => {
    const b = bp({
      name: "Torc of Peace",
      tier: 14,
      atk: 180,
      def: 720,
      hp: 0,
      elementalAffinity: ["Light"],
      artifactStatMods: { hpMult: 1.2, evaAdd: 0.1 },
    });
    expect(computePower(b, commonOpts)).toBe(1610);
  });

  it("T5 hp_base = 5 (XL Magic Potion + Xolotl = 145 confirms)", () => {
    const b = bp({
      name: "XL Magic Potion",
      type: "Potion",
      tier: 5,
      hp: 24,
    });
    const plan = bestEnchantPlan(b, "Common", true, 5);
    expect(plan.spirit?.statsAdded.hp).toBe(5);
    // Plus the actual gain: 5 hp × 5 weight = 25 power per slot.
    expect(plan.spirit?.gain).toBe(25);
  });
});

// Bottled Mirth (T7 Potion, hp 46, built-in Holy Element → element slot locked
// at 0 AP). No spirit affinity, so the spirit slot is a generic non-match at
// the player's tier. The two in-game readings differ only by which spirit was
// applied, so they pin the spirit hp_base at two tiers — set maxEnchantTier to
// the tier of the applied spirit:
//   Walrus (T9 spirit) → spirit hp_base 10 → 230 + 10·5 = 280
//   Horse  (T7 spirit) → spirit hp_base  8 → 230 + 8·5  = 270
// (base 230 = 46 hp × 5; the locked Holy element adds nothing.)
describe("Bottled Mirth — built-in element + generic spirit at the player tier", () => {
  const bottledMirth = bp({
    name: "Bottled Mirth",
    type: "Potion",
    tier: 7,
    hp: 46,
    builtInElement: ["Holy Element"],
  });

  it("+ Holy (built-in) + Walrus (T9 spirit) = 280", () => {
    expect(computePower(bottledMirth, { ...commonOpts, maxEnchantTier: 9 })).toBe(280);
  });

  it("+ Holy (built-in) + Horse (T7 spirit) = 270", () => {
    expect(computePower(bottledMirth, { ...commonOpts, maxEnchantTier: 7 })).toBe(270);
  });
});

// ---------------------------------------------------------------------------
// Built-in enchant mechanics
// ---------------------------------------------------------------------------

describe("built-in enchants", () => {
  it("built-in spirit locks the spirit slot with 0 gain", () => {
    const b = bp({
      atk: 1000,
      def: 200,
      tier: 15,
      builtInSpirit: ["Mundra's Spirit"],
    });
    const plan = bestEnchantPlan(b, "Common", true);
    expect(plan.spirit?.locked).toBe(true);
    expect(plan.spirit?.gain).toBe(0);
  });

  it("built-in element locks the element slot with 0 gain", () => {
    const b = bp({
      atk: 1000,
      tier: 15,
      builtInElement: ["Oblivion Element"],
    });
    const plan = bestEnchantPlan(b, "Common", true);
    expect(plan.element?.locked).toBe(true);
    expect(plan.element?.gain).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Spirit slot tradeoff
// ---------------------------------------------------------------------------

describe("spirit slot picks the best of {match at spirit tier, generic at item tier}", () => {
  it("T14 item with only a T9 spirit affinity uses generic T14", () => {
    const b = bp({
      atk: 1300,
      tier: 14,
      spiritAffinity: ["Bear Vitality"],
    });
    const plan = bestEnchantPlan(b, "Common", true);
    expect(plan.spirit?.tier).toBe(14);
    expect(plan.spirit?.match).toBe(false);
  });

  it("T14 item with a T14 spirit affinity matches that spirit", () => {
    const b = bp({
      atk: 1300,
      tier: 14,
      spiritAffinity: ["Bahamut Sovereignty"],
    });
    const plan = bestEnchantPlan(b, "Common", true);
    expect(plan.spirit?.match).toBe(true);
    expect(plan.spirit?.family).toBe("Bahamut");
  });

  it("T9 item with a T9 spirit affinity matches when player is capped at T9", () => {
    // When max enchant tier is T9, the player can't apply a generic T14
    // spirit, so the matching Bear (T9) wins the spirit slot.
    const b = bp({
      atk: 400,
      tier: 9,
      spiritAffinity: ["Bear Vitality"],
    });
    const plan = bestEnchantPlan(b, "Common", true, 9);
    expect(plan.spirit?.match).toBe(true);
    expect(plan.spirit?.family).toBe("Bear");
  });

  it("T9 item with a T9 spirit affinity loses to a generic T14 spirit when player has T14", () => {
    // With T14 unlocked, the player applies a T14 non-matching spirit
    // (164 atk_base × 0.8 = 131 power) instead of the affinity-matched Bear
    // T9 (73 atk_match × 0.8 = 58 power).
    const b = bp({
      atk: 400,
      tier: 9,
      spiritAffinity: ["Bear Vitality"],
    });
    const plan = bestEnchantPlan(b, "Common", true, 14);
    expect(plan.spirit?.match).toBe(false);
    expect(plan.spirit?.tier).toBe(14);
  });
});

// ---------------------------------------------------------------------------
// Quality multiplier
// ---------------------------------------------------------------------------

describe("quality multiplier scales the final AP linearly", () => {
  it("Superior ≈ 1.25 × Common (within 1 AP rounding)", () => {
    const b = bp({ atk: 1770, def: 443, tier: 15 });
    const common = computePower(b, { ...commonOpts, quality: "Common", enchanted: false });
    const superior = computePower(b, { ...commonOpts, quality: "Superior", enchanted: false });
    expect(Math.abs(superior - common * 1.25)).toBeLessThanOrEqual(1);
  });

  it("Legendary ≈ 3 × Common (within 1 AP rounding)", () => {
    const b = bp({ atk: 1770, def: 443, tier: 15 });
    const common = computePower(b, { ...commonOpts, quality: "Common", enchanted: false });
    const legendary = computePower(b, { ...commonOpts, quality: "Legendary", enchanted: false });
    expect(Math.abs(legendary - common * 3)).toBeLessThanOrEqual(1);
  });

  // Superior Frogsong + Maelstrom (Water match) + Bahamut (non-match) = 3090
  // in-game. With stat-level integer rounding before the AP formula:
  //   atk = round(1770·1.25 + 246 + 164) = round(2622.5) = 2623
  //   def = round(443·1.25 + 163 + 109) = round(825.75) = 826
  //   AP  = 0.8·2623 + 1.2·826 = 2098.4 + 991.2 = 3089.6 → 3090 ✓
  // The old model (no stat-level rounding) gave 3089.
  it("Superior Frogsong + Maelstrom + Bahamut = 3090", () => {
    const b = bp({
      name: "Frogsong Gong",
      type: "Instrument",
      tier: 15,
      atk: 1770,
      def: 443,
      elementalAffinity: ["Earth", "Water"],
    });
    expect(computePower(b, { ...commonOpts, quality: "Superior" })).toBe(3090);
  });

  // Warrior Assegai T7 Spear (atk 280, hp 10, no affinity, no Starforged
  // stat boost). Common unenchanted = base AP from the sheet = 274. Sanity
  // check that the formula still hits the canonical Common AP for a
  // typical lower-tier item.
  it("Warrior Assegai unenchanted Common = 274", () => {
    const b = bp({
      name: "Warrior Assegai",
      type: "Spear",
      tier: 7,
      atk: 280,
      hp: 10,
    });
    expect(computePower(b, { ...commonOpts, enchanted: false })).toBe(274);
  });

  // Superior Warrior Assegai unenchanted = 345 in-game. Pins the stat-level
  // integer rounding rule: atk = round(280·1.25) = 350, hp = round(10·1.25)
  // = round(12.5) = 13. AP = 0.8·350 + 5·13 = 280 + 65 = 345 ✓. Without
  // stat-rounding the model gives 274·1.25 = 342.5 → 343, off −2.
  it("Warrior Assegai unenchanted Superior = 345", () => {
    const b = bp({
      name: "Warrior Assegai",
      type: "Spear",
      tier: 7,
      atk: 280,
      hp: 10,
    });
    expect(
      computePower(b, {
        ...commonOpts,
        quality: "Superior",
        enchanted: false,
      }),
    ).toBe(345);
  });

  // Common Warrior Assegai + Divine (T12 non-match, no Light affinity on
  // the item) + Carbuncle (T12 non-match) = 532 in-game. Pins the new T12
  // stat values: atk_base 99 (was 89). Calculation:
  //   atk += 99 + 99 = 198 (uncapped, base 280)
  //   def += 0 (item has no def)
  //   hp  += min(18, 10) × 2 = 20 (cap at base hp 10 per slot)
  //   AP  = 0.8·(280+198) + 5·(10+20) = 382.4 + 150 = 532.4 → 532 ✓
  it("Common Warrior Assegai + Divine + Carbuncle = 532 (T12 atk_base 99)", () => {
    const b = bp({
      name: "Warrior Assegai",
      type: "Spear",
      tier: 7,
      atk: 280,
      hp: 10,
    });
    expect(computePower(b, { ...commonOpts, maxEnchantTier: 12 })).toBe(532);
  });

  // Common Titan Sword + Divine (T12 Light match) + Carbuncle (T12 non-match,
  // since Titan Sword's spirit affinity is Titan not Carbuncle) = 1199.
  // Pins the new T12 values: atk_base 99, atk_match 148, def_base 66,
  // def_match 99. Calculation:
  //   atk += 148 + 99 = 247 → 977 total
  //   def += 99 + 66 = 165 → 348 total
  //   AP  = 0.8·977 + 1.2·348 = 781.6 + 417.6 = 1199.2 → 1199 ✓
  // Note: Titan Sword has a +25% Starforged Milestone available; this
  // reading is at Common quality WITHOUT the milestone applied.
  it("Common Titan Sword + Divine + Carbuncle = 1199 (T12 matches)", () => {
    const b = bp({
      name: "Titan Sword",
      type: "Sword",
      tier: 12,
      atk: 730,
      def: 183,
      elementalAffinity: ["Light"],
      spiritAffinity: ["Titan Solemnity"],
    });
    expect(computePower(b, { ...commonOpts, maxEnchantTier: 12 })).toBe(1199);
  });

  // Common Lone Wolf Cowl + Oblivion + Bahamut = 1027 in-game *with the +25%
  // Base ATK/DEF/HP Starforged Milestone applied*. The real blueprint has NO
  // elemental affinity (only a Wolf Ferocity spirit, which loses to a generic
  // T14 spirit), so both enchant slots are non-match. The Starforged boost
  // multiplies the base+enchant total:
  //   def: (230 + 109 + 109) × 1.25 = 448 × 1.25 = 560 → display 560
  //   hp:  (19 + min(33,19) + min(33,19)) × 1.25 = 57 × 1.25 = 71.25 → 71
  //   AP = 1.2·560 + 5·71 = 672 + 355 = 1027 ✓
  // (An earlier version of this test fabricated a "Dark" elemental affinity so
  // Oblivion matched, and the old base-only boost happened to land on the same
  // def 560 — a compensating error. The Ghostbusters Suit readings below, on a
  // genuinely no-affinity item, distinguish the two and confirm full-boost.)
  it("Lone Wolf Cowl + two non-match enchants with Starforged = 1027", () => {
    const b = bp({
      name: "Lone Wolf Cowl",
      tier: 9,
      def: 230,
      hp: 19,
      spiritAffinity: ["Wolf Ferocity"],
      starforgedStatBoosts: { atk: 0.25, def: 0.25, hp: 0.25 },
    });
    expect(
      computePower(b, { ...commonOpts, includeStarforgedStatBoosts: true }),
    ).toBe(1027);
  });

  // Lone Wolf Cowl Superior, unenchanted, with the +25% Starforged Milestone.
  // Displayed in-game: def 360, hp 30, AP 582. Pins the two-step rounding and
  // the Starforged × quality stacking:
  //   def: round(230 × 1.25) = 288 → round(288 × 1.25) = 360
  //   hp:  round(19 × 1.25)  = 24  → round(24 × 1.25)  = 30
  //   AP = 1.2·360 + 5·30 = 432 + 150 = 582 ✓
  // A single combined round (230 × 1.25 × 1.25 = 359.375 → 359) misses 360.
  it("Lone Wolf Cowl Superior unenchanted + Starforged = 582", () => {
    const b = bp({
      name: "Lone Wolf Cowl",
      tier: 9,
      def: 230,
      hp: 19,
      spiritAffinity: ["Wolf Ferocity"],
      starforgedStatBoosts: { atk: 0.25, def: 0.25, hp: 0.25 },
    });
    expect(
      computePower(b, {
        ...commonOpts,
        quality: "Superior",
        enchanted: false,
        includeStarforgedStatBoosts: true,
      }),
    ).toBe(582);
  });

  // Lone Wolf Cowl Flawless, unenchanted, with the +25% Starforged Milestone.
  // Displayed in-game: def 431, hp 36, AP 697. Second quality tier confirming
  // the two-step rounding:
  //   def: round(230 × 1.5) = 345 → round(345 × 1.25) = round(431.25) = 431
  //   hp:  round(19 × 1.5)  = 29  → round(29 × 1.25)  = round(36.25)  = 36
  //   AP = 1.2·431 + 5·36 = 517.2 + 180 = 697.2 → 697 ✓
  it("Lone Wolf Cowl Flawless unenchanted + Starforged = 697", () => {
    const b = bp({
      name: "Lone Wolf Cowl",
      tier: 9,
      def: 230,
      hp: 19,
      spiritAffinity: ["Wolf Ferocity"],
      starforgedStatBoosts: { atk: 0.25, def: 0.25, hp: 0.25 },
    });
    expect(
      computePower(b, {
        ...commonOpts,
        quality: "Flawless",
        enchanted: false,
        includeStarforgedStatBoosts: true,
      }),
    ).toBe(697);
  });

  // Starforged Superior Lone Wolf Cowl + Nightmare (T9 Dark element, non-match
  // — LWC has no elemental affinity) + Wolf (T4 spirit, match). In-game: def
  // 423, hp 50, AP 758 (re-confirmed by the user). This is the case that
  // proved the Starforged two-step rounding is correct *with enchants at
  // Superior quality*, and pins the T4 spirit MATCH values. Nightmare's T9
  // non-match values (def_base 32, hp_base 10) are already pinned by Tower of
  // Thorns + Mammoth (768) and Bottled Mirth + Walrus (280), so the reading
  // uniquely fixes Wolf's T4 match: def_match 18, hp_match 6.
  //   def: round(230×1.25 + 32 + 18) = round(337.5) = 338 → round(338×1.25) = round(422.5) = 423
  //   hp:  round(19×1.25  + 10 + 6)  = round(39.75) = 40  → round(40×1.25)  = 50
  //   AP = 1.2·423 + 5·50 = 507.6 + 250 = 757.6 → 758 ✓
  // Formula-level (not via computePower) because Nightmare T9 + Wolf T4 is a
  // deliberately non-optimal combo for testing the affinity — computePower's
  // bestEnchantPlan would pick stronger generic enchants. The two-step
  // starforge path through computePower is pinned by the unenchanted Superior
  // (582) / Flawless (697) and the Common enchanted (1027 / 2043) tests.
  it("LWC Superior + Nightmare(T9) + Wolf(T4) Starforged = 758 (T4 match values)", () => {
    expect(SPIRIT_TABLE.def[4].match).toBe(18); // Wolf T4 spirit: floor(1.5×12)
    expect(SPIRIT_TABLE.hp[4].match).toBe(6); // floor(1.5×4)
    const rnd = (x: number) => Math.round(x);
    // Nightmare is a T9 element (non-match); Wolf is a T4 spirit (match).
    const eDef = ELEMENT_TABLE.def[9].base + SPIRIT_TABLE.def[4].match; // 32 + 18
    const eHp = ELEMENT_TABLE.hp[9].base + SPIRIT_TABLE.hp[4].match; // 10 + 6
    const dispDef = rnd(rnd(230 * 1.25 + eDef) * 1.25);
    const dispHp = rnd(rnd(19 * 1.25 + eHp) * 1.25);
    expect(dispDef).toBe(423);
    expect(dispHp).toBe(50);
    expect(rnd(1.2 * dispDef + 5 * dispHp)).toBe(758);
  });

  // Ghostbusters Suit (T15 Light Armor, def 690, eva 5%, no affinity) with two
  // non-match T14 enchants (Oblivion + Ouroboros — neither matches). Confirmed
  // in-game displayed def 908 = 690 + 109 + 109. Un-starforged:
  //   def 908, eva 5% → 1.2·908·1.5 = 1634.4 → 1634 ✓
  it("Ghostbusters Suit + Oblivion + Ouroboros (no Starforge) = 1634", () => {
    const b = bp({
      name: "Ghostbusters Suit",
      type: "Light Armor",
      tier: 15,
      def: 690,
      eva: 0.05,
      starforgedStatBoosts: { atk: 0.25, def: 0.25, hp: 0.25 },
    });
    expect(computePower(b, commonOpts)).toBe(1634);
  });

  // Same Ghostbusters Suit *with* the +25% Base ATK/DEF/HP Starforged
  // Milestone applied = 2043 in-game. The boost multiplies the base+enchant
  // total: (690 + 109 + 109) × 1.25 = 908 × 1.25 = 1135 def → 1.2·1135·1.5 =
  // 2043.0 → 2043. Equivalently, the un-starforged 1634.4 × 1.25 = 2043 exactly
  // (AP is linear in def for this single-stat item). This pins that Starforged
  // boosts enchant stats too, not just the base.
  it("Ghostbusters Suit + Oblivion + Ouroboros with Starforged = 2043", () => {
    const b = bp({
      name: "Ghostbusters Suit",
      type: "Light Armor",
      tier: 15,
      def: 690,
      eva: 0.05,
      starforgedStatBoosts: { atk: 0.25, def: 0.25, hp: 0.25 },
    });
    expect(
      computePower(b, { ...commonOpts, includeStarforgedStatBoosts: true }),
    ).toBe(2043);
  });

  // ---- Readings the element/spirit base split made exact (re-grounding) ----

  // XL Healing Potion (T4 Potion, hp 19, no affinity) + Ember (T4 element
  // non-match, hp_base 3) + Ox (T4 spirit non-match, hp_base 4) = 130 in-game.
  // The element/spirit split is the whole story: element hp 3 + spirit hp 4 =
  // 7 → AP (19 + 7) × 5 = 130. The old element-only table used 3 for both
  // slots and gave 125. maxEnchantTier=4 forces the T4 element + T4 spirit.
  it("XL Healing Potion + Ember + Ox (T4) = 130 (element/spirit hp split)", () => {
    const b = bp({ name: "XL Healing Potion", type: "Potion", tier: 4, hp: 19 });
    expect(computePower(b, { ...commonOpts, maxEnchantTier: 4 })).toBe(130);
  });

  // Chronos Runeblade (T7 Sword, atk 280 def 70, Earth affinity, no spirit
  // affinity) + Wild (T7 element Earth match) + Horse (T7 spirit non-match) =
  // 463 in-game. With the split + match=floor(1.5×base):
  //   atk: 280 + floor(1.5·38)=57 + 41 (spirit base) = 378
  //   def: 70  + floor(1.5·25)=37 + 27 (spirit base) = 134
  //   AP = 0.8·378 + 1.2·134 = 463.2 → 463. maxEnchantTier=7 forces T7 both.
  it("Chronos Runeblade + Wild + Horse (T7) = 463", () => {
    const b = bp({
      name: "Chronos Runeblade",
      type: "Sword",
      tier: 7,
      atk: 280,
      def: 70,
      elementalAffinity: ["Earth"],
    });
    expect(computePower(b, { ...commonOpts, maxEnchantTier: 7 })).toBe(463);
  });

  // Chronos Runeblade + Primal (T9 element Earth match) + Horse (T7 spirit
  // non-match) = 488 in-game. A deliberate mixed-tier combo (T9 element + T7
  // spirit) that bestEnchantPlan wouldn't pick, so it's pinned formula-level:
  //   atk: 280 + floor(1.5·48)=72 (T9 elem match) + 41 (T7 spirit base) = 393
  //   def: 70  + floor(1.5·32)=48 + 27 = 145
  //   AP = 0.8·393 + 1.2·145 = 488.4 → 488.
  it("Chronos Runeblade + Primal(T9) + Horse(T7) = 488 (mixed-tier)", () => {
    const fl = (x: number) => Math.floor(1.5 * x);
    const atk = 280 + fl(ELEMENT_TABLE.atk[9].base) + SPIRIT_TABLE.atk[7].base;
    const def = 70 + fl(ELEMENT_TABLE.def[9].base) + SPIRIT_TABLE.def[7].base;
    expect(Math.round(0.8 * atk + 1.2 * def)).toBe(488);
  });

  // Sky Pirate Outfit (T5 Light Armor, def 86, eva 5%, Air affinity, +25%
  // Bonus Airship Power upgrade) + Gale (T7 Air element, match) + Xolotl (T5
  // spirit, non-match) = 317 in-game. The old element-only table missed this
  // (gave ~294); the re-grounding fixes it — Gale's T7 element def-match is
  // floor(1.5×25)=37, Xolotl's T5 spirit def base is 18:
  //   def = 86 + 37 + 18 = 141
  //   AP  = 1.2·141 · (1 + 10·0.05) · 1.25 = 253.8 · 1.25 = 317.25 → 317
  // Formula-level: the T7-element + T5-spirit mix is a deliberate combo
  // bestEnchantPlan wouldn't choose (it'd take a stronger generic T7 spirit).
  it("Sky Pirate Outfit + Gale(T7) + Xolotl(T5) + 25% upgrade = 317", () => {
    const fl = (x: number) => Math.floor(1.5 * x);
    const def = 86 + fl(ELEMENT_TABLE.def[7].base) + SPIRIT_TABLE.def[5].base;
    const raw = 1.2 * def * (1 + 10 * 0.05) * 1.25;
    expect(Math.round(raw)).toBe(317);
  });
});
