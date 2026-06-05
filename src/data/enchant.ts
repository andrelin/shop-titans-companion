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
type EnchantRow = { base: number; match: number };

const ENCHANT_TABLE: Record<"atk" | "def" | "hp", Record<number, EnchantRow>> = {
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
    4: { base: 15, match: 20 },
    5: { base: 25, match: 38 },
    7: { base: 40, match: 60 },
    9: { base: 50, match: 75 },
    10: { base: 65, match: 95 },
    12: { base: 90, match: 135 },
    14: { base: 165, match: 245 },
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
const SPIRIT_TIERS: Record<string, number> = {
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
// Verified against the canonical sheet's "Airship Power" column for sample items
// (Squire Sword, Frogsong Gong, Wyrmbane Cannon, Sia's Fancy Outfit, Twin Fangs).
// Note: stats are flat (atk, def, hp) and percentages (crit, eva on 0..1).
export function basePower(b: Blueprint): number {
  return (
    0.8 * b.atk * (1 + 10 * b.crit) +
    1.2 * b.def * (1 + 10 * b.eva) +
    5 * b.hp
  );
}

// Quality scales each underlying stat. We rebuild the formula at the quality
// to capture the compounding crit/eva multiplication (linear Q × basePower
// would underestimate crit/eva items at high quality).
function powerAtQuality(b: Blueprint, q: number): number {
  return (
    0.8 * (b.atk * q) * (1 + 10 * (b.crit * q)) +
    1.2 * (b.def * q) * (1 + 10 * (b.eva * q)) +
    5 * (b.hp * q)
  );
}

function enchantGainAt(
  b: Blueprint,
  q: number,
  tier: number,
  match: boolean,
): number {
  const pick = (row: EnchantRow) => (match ? row.match : row.base);
  let gain = 0;
  if (b.atk > 0) gain += pick(ENCHANT_TABLE.atk[tier]) * (1 + 10 * (b.crit * q));
  if (b.def > 0) gain += pick(ENCHANT_TABLE.def[tier]) * (1 + 10 * (b.eva * q));
  if (b.hp > 0) gain += pick(ENCHANT_TABLE.hp[tier]);
  return gain;
}

export interface BestEnchantPlan {
  gain: number;
  source: "element" | "spirit" | "none";
  tier: number | null;
  // For element source: the elements that matched (one of them). For spirit:
  // the spirit family that matched. Empty when source === "none".
  targets: string[];
}

// Pick the enchant that gives the most airship-power gain for this item.
// Three candidate paths:
//   - non-matching enchant at the item's tier (always available, no affinity)
//   - matching element enchant at the item's tier (if item has elemental affinity)
//   - matching spirit enchant at the *spirit's* tier (if item has spirit affinity
//     AND the spirit's tier ≤ the item's enchant tier — you can't apply a spirit
//     enchant higher than what the item supports)
// We return the highest-gain option. A low-tier spirit (e.g. Bear T9) on a high-
// tier item (T14) usually loses to a non-matching T14 enchant, because the T14
// flat stat boost outweighs the affinity multiplier on a T9 boost.
export function bestEnchantPlan(
  b: Blueprint,
  quality: Quality,
  affinityMatched: boolean,
): BestEnchantPlan {
  const itemTier = enchantTierFor(b.tier);
  if (itemTier === null) {
    return { gain: 0, source: "none", tier: null, targets: [] };
  }
  const q = QUALITY_MULTIPLIER[quality];

  const candidates: BestEnchantPlan[] = [
    {
      gain: enchantGainAt(b, q, itemTier, false),
      source: "none",
      tier: itemTier,
      targets: [],
    },
  ];

  if (affinityMatched) {
    const elementTargets = [...b.elementalAffinity, ...b.builtInElement];
    if (elementTargets.length > 0) {
      candidates.push({
        gain: enchantGainAt(b, q, itemTier, true),
        source: "element",
        tier: itemTier,
        targets: elementTargets,
      });
    }
    for (const s of [...b.spiritAffinity, ...b.builtInSpirit]) {
      const sTier = spiritTierFor(s);
      if (sTier !== null && sTier <= itemTier) {
        candidates.push({
          gain: enchantGainAt(b, q, sTier, true),
          source: "spirit",
          tier: sTier,
          targets: [spiritFamily(s)],
        });
      }
    }
  }

  return candidates.reduce((best, cur) => (cur.gain > best.gain ? cur : best));
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
    p += bestEnchantPlan(b, opts.quality, opts.affinityMatched).gain;
  }
  if (opts.includeAirshipUpgrade && b.airshipPowerUpgradeBonus > 0) {
    p *= 1 + b.airshipPowerUpgradeBonus;
  }
  return p;
}

export function maxEnchantTierFor(itemTier: number): number | null {
  return enchantTierFor(itemTier);
}

export interface SpiritOption {
  family: string; // e.g. "Bahamut"
  tier: number | null; // spirit enchant tier
  fullAffinityName: string; // e.g. "Bahamut Sovereignty"
  applicable: boolean; // tier ≤ item's enchant tier
  gain: number; // airship-power gain at Common quality with affinity match
}

export interface ElementOption {
  tier: number | null;
  targets: string[]; // empty = no affinity, recommend any element
  gain: number; // airship-power gain at Common quality
}

export interface EnchantRecommendation {
  element: ElementOption;
  spirits: SpiritOption[];
  // Which source the optimal enchant plan picked at Common quality. The UI
  // uses this to highlight the winning option.
  optimal: "element" | "spirit" | "none";
  optimalSpiritFamily: string | null; // when optimal === "spirit"
}

// Build the full recommendation. We compute per-option gains at Common quality
// so the relative ordering is stable regardless of the quality the user picks
// in the UI; quality only scales the underlying stats, so the winner doesn't
// flip between qualities.
export function recommendEnchant(b: Blueprint): EnchantRecommendation {
  const elementTier = enchantTierFor(b.tier);
  const elementTargets = [...b.elementalAffinity, ...b.builtInElement];

  const q = 1; // Common
  const elementGain =
    elementTier === null
      ? 0
      : enchantGainAt(b, q, elementTier, elementTargets.length > 0);
  const element: ElementOption = {
    tier: elementTier,
    targets: elementTargets,
    gain: elementGain,
  };

  const spirits: SpiritOption[] = [
    ...b.spiritAffinity,
    ...b.builtInSpirit,
  ].map((s) => {
    const sTier = spiritTierFor(s);
    const applicable =
      sTier !== null && elementTier !== null && sTier <= elementTier;
    return {
      family: spiritFamily(s),
      tier: sTier,
      fullAffinityName: s,
      applicable,
      gain: applicable && sTier !== null ? enchantGainAt(b, q, sTier, true) : 0,
    };
  });

  // The "non-matching at item tier" baseline equals the element option when
  // the item has no elemental affinity. Optimal = whichever has the highest
  // gain among {element, every applicable spirit}.
  const bestSpirit = spirits.reduce<SpiritOption | null>(
    (best, cur) => (cur.gain > (best?.gain ?? -1) ? cur : best),
    null,
  );

  let optimal: EnchantRecommendation["optimal"] = "none";
  let optimalSpiritFamily: string | null = null;
  if (elementTier === null && spirits.length === 0) {
    optimal = "none";
  } else if (bestSpirit && bestSpirit.gain > elementGain) {
    optimal = "spirit";
    optimalSpiritFamily = bestSpirit.family;
  } else if (elementTargets.length > 0) {
    optimal = "element";
  } else {
    // element line wins but with no affinity bonus — still call it "element"
    // because that's where the suggested generic enchant goes.
    optimal = "element";
  }

  return { element, spirits, optimal, optimalSpiritFamily };
}
