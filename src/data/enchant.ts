import type { Blueprint, Quality } from "./types";
import { QUALITY_MULTIPLIER } from "./types";

// Enchant point gains per item tier — copied from the Dragon Invasion reference
// sheet's Key. Each row is the Points added to an enchanted item per stat.
// The "match" variant is used when the enchant's element/spirit matches the item's
// affinity. The table only goes up to T14; T15 items are assumed to use T14 enchants.
//
// Source: Dragon Invasion Item Power tab of
// https://docs.google.com/spreadsheets/d/1eWZQ4SSqbMc0xLqDQQZwzZg5fU19Se8XnDdvdcMO3Aw
// (sheet last refreshed 2025-05-28; the table itself is stable).
export type EnchantRow = { base: number; match: number };

export const ENCHANT_TABLE: Record<"atk" | "def" | "hp", Record<number, EnchantRow>> = {
  atk: {
    4: { base: 13, match: 19 },
    5: { base: 21, match: 31 },
    7: { base: 30, match: 46 },
    9: { base: 38, match: 58 },
    10: { base: 50, match: 75 },
    12: { base: 71, match: 106 },
    14: { base: 131, match: 197 },
  },
  def: {
    4: { base: 13, match: 19 },
    5: { base: 22, match: 32 },
    7: { base: 30, match: 45 },
    9: { base: 38, match: 58 },
    10: { base: 50, match: 76 },
    12: { base: 71, match: 106 },
    14: { base: 131, match: 196 },
  },
  hp: {
    // HP-enchant gains verified in-game against Malady's Robe (T15 Clothes,
    // def 630 + hp 39, Common + Apotheosis + Ouroboros = 1732). The stale ST
    // Central Dragon-sheet HP row (15/20, 25/38, … 165/245) systematically
    // overstates HP enchant gains by ~25% — the actual values track the
    // atk/def pattern. T14 is empirically dialed in; the lower tiers are
    // extrapolated from atk/def parity and need verification if you craft an
    // HP-bearing item at those tiers.
    4: { base: 13, match: 19 },
    5: { base: 22, match: 32 },
    7: { base: 30, match: 45 },
    9: { base: 38, match: 58 },
    10: { base: 50, match: 75 },
    12: { base: 71, match: 106 },
    14: { base: 130, match: 195 },
  },
};

// Item tier -> the enchant tier column to use. Item tiers between the column
// breakpoints fall to the lower available column (Dragon sheet convention).
function enchantTierFor(itemTier: number): number | null {
  if (itemTier <= 3) return null;
  if (itemTier === 4) return 4;
  if (itemTier <= 6) return 5;
  if (itemTier <= 8) return 7;
  if (itemTier === 9) return 9;
  if (itemTier <= 11) return 10;
  if (itemTier <= 13) return 12;
  return 14; // T14+
}

export interface PowerOptions {
  quality: Quality;
  enchanted: boolean;
  affinityMatched: boolean; // assume the player picks the matching enchant
  includeAirshipUpgrade: boolean; // apply +X% Bonus Airship Power milestone if present
}

// Spirit enchant tiers, keyed by the spirit *family* (first word of the
// affinity name, e.g. "Bahamut Sovereignty" → "Bahamut"). Verified families
// come from the ST Central Dragon Affinities sheet; unverified ones are
// inferred from the in-game spirit list ordering and are marked below.
export const SPIRIT_TIERS: Record<string, number> = {
  // Tier 4 (verified from Dragon Affinities)
  Ram: 4, Wolf: 4, Ox: 4, Eagle: 4, Viper: 4, Cat: 4, Bunny: 4,
  // Tier 4 (inferred — early-game spirits not in the verified list)
  Goose: 4, Armadillo: 4, Hippo: 4,
  // Tier 5
  Xolotl: 5,
  Squirrel: 5, // inferred
  // Tier 7
  Owl: 7, Lizard: 7, Horse: 7,
  Rhino: 7, // inferred
  // Tier 9
  Bear: 9, Dinosaur: 9, Lion: 9, Mammoth: 9, Shark: 9, Tiger: 9, Walrus: 9,
  Hydra: 9, Tarrasque: 9, // inferred
  // Tier 10
  Quetzalcoatl: 10,
  // Tier 12
  Carbuncle: 12, Chimera: 12, Christmas: 12, Kraken: 12, Phoenix: 12,
  Krampus: 12, Kirin: 12, // inferred
  // Tier 14
  Bahamut: 14, Behemoth: 14, Griffin: 14, Leviathan: 14, Ouroboros: 14, Titan: 14,
  Ancestor: 14, // inferred (recent high-tier spirit)
  Mundra: 14, // inferred (event spirit)
};

// Extract the spirit family name from an affinity string. The data uses
// "Bear Vitality", "Bahamut Sovereignty", "Mundra's Spirit", "Christmas Spirit",
// "Quetzalcoatl Spirit", etc. — the family is always the first whitespace token
// with a trailing apostrophe-s stripped.
export function spiritFamily(affinity: string): string {
  const first = affinity.trim().split(/\s+/)[0] ?? "";
  return first.replace(/'s$/, "");
}

export function spiritTierFor(affinity: string): number | null {
  const fam = spiritFamily(affinity);
  return SPIRIT_TIERS[fam] ?? null;
}

// BasePower at Common quality, no enchant, no APU.
// Verified against the canonical "Airship Power" column for every sampled
// item by exhaustive cross-check (see scripts/verify-formula or commit log).
// Community formula: crit and evasion both scale the entire stat sum.
//   AP = (0.8·atk + 1.2·def + 5·hp) · (1 + 10·crit) · (1 + 10·eva)
// where crit and eva are stored as decimals (0.05 = 5%).
export function basePower(b: Blueprint): number {
  return (
    (0.8 * b.atk + 1.2 * b.def + 5 * b.hp) *
    (1 + 10 * b.crit) *
    (1 + 10 * b.eva)
  );
}

// Quality scales the AP value linearly per the Dragon Invasion reference
// sheet's quality multipliers. (Treating quality as a multiplicative boost on
// each underlying stat would compound crit/eva at higher qualities, which the
// community ranking doesn't do.)
function powerAtQuality(b: Blueprint, q: number): number {
  return basePower(b) * q;
}

function enchantGainAt(
  b: Blueprint,
  q: number,
  tier: number,
  match: boolean,
): number {
  // Dragon-sheet table values are the per-stat power-point gain at Common
  // quality assuming crit=0 and eva=0. For items with crit or eva, the same
  // (1 + 10·crit)·(1 + 10·eva) multiplier from the base formula applies, and
  // quality scales the gain linearly along with the base.
  const pick = (row: EnchantRow) => (match ? row.match : row.base);
  let flat = 0;
  if (b.atk > 0) flat += pick(ENCHANT_TABLE.atk[tier]);
  if (b.def > 0) flat += pick(ENCHANT_TABLE.def[tier]);
  if (b.hp > 0) flat += pick(ENCHANT_TABLE.hp[tier]);
  return flat * (1 + 10 * b.crit) * (1 + 10 * b.eva) * q;
}

export interface SlotChoice {
  tier: number;
  match: boolean; // whether the chosen enchant matches an affinity on the item
  family: string | null; // spirit family name when applicable
  targets: string[]; // elements when applicable (one of these matches)
  gain: number; // airship-power gain at the given quality
  // Locked = the item ships with this enchant pre-installed (built-in element
  // or built-in spirit, e.g. all Mundra items have Mundra Spirit baked in).
  // The player can't swap it for anything else, so we don't show skill-
  // alternative notes for locked slots.
  locked: boolean;
}

export interface BestEnchantPlan {
  // Each item has two slots — an element slot and a spirit slot — and both
  // can be filled simultaneously. The total airship-power gain is the sum.
  element: SlotChoice | null;
  spirit: SlotChoice | null;
  totalGain: number;
}

// Compute the best enchant *pair* for an item (one element + one spirit).
// Element slot: locked to the built-in if any; otherwise at the item's tier,
//   matched if any elemental affinity.
// Spirit slot: locked to the built-in if any; otherwise try every matching
//   spirit affinity at its own tier, compare against a generic non-matching
//   spirit at the item's tier, pick whichever yields the most airship power.
// A low-tier spirit (e.g. Bear T9) on a high-tier item often loses to a
// generic T14 spirit because the T14 flat boost outweighs the affinity
// multiplier on a T9 boost.
export function bestEnchantPlan(
  b: Blueprint,
  quality: Quality,
  affinityMatched: boolean,
): BestEnchantPlan {
  const itemTier = enchantTierFor(b.tier);
  if (itemTier === null) {
    return { element: null, spirit: null, totalGain: 0 };
  }
  const q = QUALITY_MULTIPLIER[quality];

  // Element slot
  // Built-in element enchants are already baked into the item's listed
  // Airship Power in the Blueprints sheet — the element slot is locked and
  // contributes no *additional* AP, so its gain is 0.
  let element: SlotChoice;
  if (b.builtInElement.length > 0) {
    element = {
      tier: itemTier,
      match: true,
      family: null,
      targets: b.builtInElement,
      gain: 0,
      locked: true,
    };
  } else {
    const elementMatch =
      affinityMatched && b.elementalAffinity.length > 0;
    element = {
      tier: itemTier,
      match: elementMatch,
      family: null,
      targets: b.elementalAffinity,
      gain: enchantGainAt(b, q, itemTier, elementMatch),
      locked: false,
    };
  }

  // Spirit slot — same idea: built-in spirits (e.g. Mundra Spirit on every
  // Mundra item) are already accounted for in the base Airship Power value
  // from the Blueprints sheet. Verified in-game against Mundra's Decree:
  // base 2334 + Oblivion non-match 262 = 2596 in-game, with no extra
  // contribution from the Mundra spirit. So the locked spirit slot adds 0.
  let spirit: SlotChoice;
  if (b.builtInSpirit.length > 0) {
    const s = b.builtInSpirit[0];
    spirit = {
      tier: itemTier,
      match: true,
      family: spiritFamily(s),
      targets: [],
      gain: 0,
      locked: true,
    };
  } else {
    // Start with the "any spirit at the item's tier" baseline.
    spirit = {
      tier: itemTier,
      match: false,
      family: null,
      targets: [],
      gain: enchantGainAt(b, q, itemTier, false),
      locked: false,
    };
    if (affinityMatched) {
      for (const s of b.spiritAffinity) {
        const sTier = spiritTierFor(s);
        if (sTier !== null && sTier <= itemTier) {
          const gain = enchantGainAt(b, q, sTier, true);
          if (gain > spirit.gain) {
            spirit = {
              tier: sTier,
              match: true,
              family: spiritFamily(s),
              targets: [],
              gain,
              locked: false,
            };
          }
        }
      }
    }
  }

  return { element, spirit, totalGain: element.gain + spirit.gain };
}

// Whether the item has any affinity that can be matched by an enchant.
export function hasAnyAffinity(b: Blueprint): boolean {
  return (
    b.elementalAffinity.length > 0 ||
    b.spiritAffinity.length > 0 ||
    b.builtInElement.length > 0 ||
    b.builtInSpirit.length > 0
  );
}

export function computePower(b: Blueprint, opts: PowerOptions): number {
  const q = QUALITY_MULTIPLIER[opts.quality];
  let p = powerAtQuality(b, q);
  if (opts.enchanted) {
    p += bestEnchantPlan(b, opts.quality, opts.affinityMatched).totalGain;
  }
  if (opts.includeAirshipUpgrade && b.airshipPowerUpgradeBonus > 0) {
    p *= 1 + b.airshipPowerUpgradeBonus;
  }
  return p;
}

export function maxEnchantTierFor(itemTier: number): number | null {
  return enchantTierFor(itemTier);
}

export interface SpiritAffinityNote {
  family: string;
  fullAffinityName: string;
  tier: number | null;
  applicable: boolean; // tier ≤ item's enchant tier
  matchGain: number; // gain you'd get applying the matching spirit at Common quality
  apCostVsBest: number; // how much AP you give up vs the spirit-slot optimum (≥0)
}

export interface EnchantRecommendation {
  // The recommended enchant *pair* — apply both. Either can be null when the
  // item is too low-tier to enchant.
  element: SlotChoice | null;
  spirit: SlotChoice | null;
  // For items whose spirit affinity is suboptimal (i.e. the spirit slot's
  // optimum is a non-matching spirit at the item's tier), we still list the
  // matching affinity here so the player can choose to apply it for the skill
  // effect, at the cost of `apCostVsBest` airship power.
  spiritAffinityAlternatives: SpiritAffinityNote[];
}

// Build the recommendation the UI renders. Computed at Common quality — the
// element/spirit choice is invariant under the quality multiplier since the
// quality scales everything linearly.
export function recommendEnchant(b: Blueprint): EnchantRecommendation {
  const plan = bestEnchantPlan(b, "Common", true);

  const spiritAffinityAlternatives: SpiritAffinityNote[] = [];
  const itemTier = enchantTierFor(b.tier);
  // No alternatives shown for locked (built-in) slots — the player can't
  // swap to anything else, so listing alternatives would be confusing.
  if (itemTier !== null && plan.spirit && !plan.spirit.locked) {
    for (const s of b.spiritAffinity) {
      const sTier = spiritTierFor(s);
      const applicable = sTier !== null && sTier <= itemTier;
      const family = spiritFamily(s);
      const matchGain = applicable
        ? enchantGainAt(b, 1, sTier!, true)
        : 0;
      // Skip the line if it IS the optimal spirit choice (no useful note).
      if (plan.spirit.match && plan.spirit.family === family) continue;
      spiritAffinityAlternatives.push({
        family,
        fullAffinityName: s,
        tier: sTier,
        applicable,
        matchGain,
        apCostVsBest: Math.max(0, plan.spirit.gain - matchGain),
      });
    }
  }

  return {
    element: plan.element,
    spirit: plan.spirit,
    spiritAffinityAlternatives,
  };
}
