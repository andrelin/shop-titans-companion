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

function enchantGain(b: Blueprint, quality: Quality, affinityMatched: boolean): number {
  const tier = enchantTierFor(b.tier);
  if (tier === null) return 0;
  const q = QUALITY_MULTIPLIER[quality];
  const pick = (row: EnchantRow) => (affinityMatched ? row.match : row.base);
  let gain = 0;
  if (b.atk > 0) gain += pick(ENCHANT_TABLE.atk[tier]) * (1 + 10 * (b.crit * q));
  if (b.def > 0) gain += pick(ENCHANT_TABLE.def[tier]) * (1 + 10 * (b.eva * q));
  if (b.hp > 0) gain += pick(ENCHANT_TABLE.hp[tier]);
  return gain;
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
    const match = opts.affinityMatched && hasAnyAffinity(b);
    p += enchantGain(b, opts.quality, match);
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
}

export interface EnchantRecommendation {
  // Element enchant — tier is derived from the item tier (Dragon sheet table).
  elementTier: number | null;
  elementTargets: string[]; // empty = use any element, no affinity bonus
  // Spirit enchant — tier comes from the spirit family itself, not the item.
  spirits: SpiritOption[]; // empty = use any spirit, no affinity bonus
}

// Suggest the enchant(s) a player should consider applying. An item can have
// both an elemental affinity *and* a spirit affinity, so we always return both
// recommendations side by side. Either choice grants the affinity bonus on
// airship power — the user picks whichever enchant they have on hand.
export function recommendEnchant(b: Blueprint): EnchantRecommendation {
  const elementTier = enchantTierFor(b.tier);
  const elementTargets = [...b.elementalAffinity, ...b.builtInElement];
  const rawSpirits = [...b.spiritAffinity, ...b.builtInSpirit];
  const spirits: SpiritOption[] = rawSpirits.map((s) => ({
    family: spiritFamily(s),
    tier: spiritTierFor(s),
    fullAffinityName: s,
  }));
  return { elementTier, elementTargets, spirits };
}

export function hasAffinity(rec: EnchantRecommendation): boolean {
  return rec.elementTargets.length > 0 || rec.spirits.length > 0;
}
