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

export interface EnchantRecommendation {
  tier: number | null; // enchant tier to use, or null if item is too low tier
  affinityTargets: string[]; // element/spirit names that grant the affinity bonus
  source: "element" | "spirit" | "built-in element" | "built-in spirit" | "none";
  // Human-readable label like "T14 Fire" or "T14 (any)" or "—".
  label: string;
}

// Suggest the enchant a player should actually apply to maximise airship
// power. Falls through element → built-in element → spirit → built-in spirit;
// if none match, any enchant of the right tier works at the base (non-affinity)
// value.
export function recommendEnchant(b: Blueprint): EnchantRecommendation {
  const tier = enchantTierFor(b.tier);
  if (tier === null) {
    return { tier: null, affinityTargets: [], source: "none", label: "—" };
  }

  let targets: string[] = [];
  let source: EnchantRecommendation["source"] = "none";
  if (b.elementalAffinity.length > 0) {
    targets = b.elementalAffinity;
    source = "element";
  } else if (b.builtInElement.length > 0) {
    targets = b.builtInElement;
    source = "built-in element";
  } else if (b.spiritAffinity.length > 0) {
    targets = b.spiritAffinity;
    source = "spirit";
  } else if (b.builtInSpirit.length > 0) {
    targets = b.builtInSpirit;
    source = "built-in spirit";
  }

  const tierLabel = `T${tier}`;
  const label =
    targets.length === 0
      ? `${tierLabel} (any — no affinity)`
      : `${tierLabel} ${targets.join(" or ")}`;

  return { tier, affinityTargets: targets, source, label };
}
