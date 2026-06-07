import type { Blueprint, Enchantment, Quality } from "./types";
import { QUALITY_MULTIPLIER } from "./types";
import enchantmentsJson from "../../data/enchantments.json";

// ---------------------------------------------------------------------------
// Enchant stats — derived from the authoritative Blueprints-tab data.
//
// Every enchant ("<X> Element" / "<X> Spirit") is itself a craftable blueprint
// with a Tier and base ATK/DEF/HP. `scripts/sync-data.ts` writes those into
// `data/enchantments.json`, and we build the per-tier tables from them at module
// load — so the values stay authoritative and self-updating, never hand-edited.
//
// Two facts the data encodes:
//   • Elements and spirits have *different* base stats at the low tiers
//     (T4 element 16/11/3 vs spirit 19/12/4; T7 element 38/25/8 vs spirit
//     41/27/8), and a few event spirits are buffed one notch (Tiger T9,
//     Christmas/Krampus/Kirin T12). So the element slot and the spirit slot
//     read from separate tables, and matched spirits use their own family stats.
//   • The affinity-match value for any stat is floor(1.5 × base) — verified
//     across every matched in-game reading (T14 def 109→163, hp 33→49; T12 atk
//     99→148; T4 spirit def 12→18, hp 4→6 from the Lone Wolf Cowl reading).
// ---------------------------------------------------------------------------
export type EnchantRow = { base: number; match: number };
type Stat = "atk" | "def" | "hp";
type StatTriple = { atk: number; def: number; hp: number };

const matchValue = (base: number): number => Math.floor(1.5 * base);
const rowOf = (base: number): EnchantRow => ({ base, match: matchValue(base) });

const ENCHANTS = enchantmentsJson as Enchantment[];

// Spirit family from an enchant or affinity name: first whitespace token with a
// trailing "'s" stripped. "Bahamut Sovereignty" → "Bahamut", "Mundra's Spirit"
// → "Mundra", "Christmas Spirit" → "Christmas".
export function spiritFamily(affinity: string): string {
  const first = affinity.trim().split(/\s+/)[0] ?? "";
  return first.replace(/'s$/, "");
}

// Element base stats per tier (all elements of a tier share one base).
const ELEMENT_BASE_BY_TIER: Record<number, StatTriple> = {};
// Standard (modal) spirit base per tier — the value most spirits of that tier
// share; used for a generic non-matching spirit in the spirit slot.
const SPIRIT_STD_BY_TIER: Record<number, StatTriple> = {};
// Per-family spirit stats (tier + base), used when a spirit affinity is matched
// — this is where the event-spirit buffs live.
export const SPIRIT_STATS: Record<string, { tier: number } & StatTriple> = {};

(() => {
  const spiritTriplesByTier: Record<number, StatTriple[]> = {};
  for (const e of ENCHANTS) {
    const triple: StatTriple = { atk: e.atk, def: e.def, hp: e.hp };
    if (e.type === "Element") {
      ELEMENT_BASE_BY_TIER[e.tier] = triple;
    } else if (e.type === "Spirit") {
      SPIRIT_STATS[spiritFamily(e.name)] = { tier: e.tier, ...triple };
      (spiritTriplesByTier[e.tier] ||= []).push(triple);
    }
  }
  // Standard spirit base = the most common triple among spirits of each tier.
  for (const [tier, triples] of Object.entries(spiritTriplesByTier)) {
    const counts = new Map<string, { triple: StatTriple; n: number }>();
    for (const t of triples) {
      const k = `${t.atk},${t.def},${t.hp}`;
      const c = counts.get(k) ?? { triple: t, n: 0 };
      c.n += 1;
      counts.set(k, c);
    }
    let best: { triple: StatTriple; n: number } | null = null;
    for (const c of counts.values()) if (!best || c.n > best.n) best = c;
    SPIRIT_STD_BY_TIER[Number(tier)] = best!.triple;
  }
})();

// Discrete enchant tiers available in the game (sorted), derived from the data.
export const ENCHANT_TIERS: readonly number[] = Object.keys(ELEMENT_BASE_BY_TIER)
  .map(Number)
  .sort((a, b) => a - b);

// Spirit enchant tiers, keyed by family — derived from each spirit's blueprint
// tier. Mundra is intentionally absent: it's always a built-in (locked) spirit,
// so it has no craftable tier and is never chosen as a matchable affinity.
export const SPIRIT_TIERS: Record<string, number> = Object.fromEntries(
  Object.entries(SPIRIT_STATS).map(([fam, s]) => [fam, s.tier]),
);

export function spiritTierFor(affinity: string): number | null {
  const fam = spiritFamily(affinity);
  return SPIRIT_TIERS[fam] ?? null;
}

// Base stats for an element enchant at a given tier.
function elementBaseAt(tier: number): StatTriple {
  return ELEMENT_BASE_BY_TIER[tier] ?? { atk: 0, def: 0, hp: 0 };
}

// Base stats for a spirit enchant: a specific family when matched (so event
// buffs apply), otherwise the standard spirit base for that tier.
function spiritBaseAt(tier: number, family: string | null): StatTriple {
  if (family && SPIRIT_STATS[family]) {
    const s = SPIRIT_STATS[family];
    return { atk: s.atk, def: s.def, hp: s.hp };
  }
  return SPIRIT_STD_BY_TIER[tier] ?? { atk: 0, def: 0, hp: 0 };
}

// Element-base and standard-spirit-base tables in {base, match} form, exposed
// for the UI's "per-tier enchant points" reference. match = floor(1.5 × base).
function toRowTable(
  byTier: Record<number, StatTriple>,
): Record<Stat, Record<number, EnchantRow>> {
  const out: Record<Stat, Record<number, EnchantRow>> = {
    atk: {},
    def: {},
    hp: {},
  };
  for (const [tier, t] of Object.entries(byTier)) {
    const n = Number(tier);
    out.atk[n] = rowOf(t.atk);
    out.def[n] = rowOf(t.def);
    out.hp[n] = rowOf(t.hp);
  }
  return out;
}
export const ELEMENT_TABLE = toRowTable(ELEMENT_BASE_BY_TIER);
export const SPIRIT_TABLE = toRowTable(SPIRIT_STD_BY_TIER);

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

// Snap an arbitrary tier value down to the closest discrete enchant tier ≤ it.
function snapToEnchantTier(tier: number): number | null {
  if (tier < 4) return null;
  let best: number | null = null;
  for (const t of ENCHANT_TIERS) {
    if (t <= tier) best = t;
    else break;
  }
  return best;
}

export interface PowerOptions {
  quality: Quality;
  enchanted: boolean;
  affinityMatched: boolean; // assume the player picks the matching enchant
  includeAirshipUpgrade: boolean; // apply +X% Bonus Airship Power milestone if present
  // Apply stat-boosting Starforged Milestones (e.g. "+25% Base ATK, DEF and
  // HP") before the AP formula. The boost multiplies the base+enchant stat
  // total (not just the base) — verified against the Ghostbusters Suit
  // (un-starforged 1634 → starforged 2043, exactly ×1.25) and Lone Wolf Cowl
  // (Common + two non-match T14 enchants = 1027). Default off, since the
  // player has to unlock the starforged recipe for the boost to apply in-game.
  includeStarforgedStatBoosts: boolean;
  // Highest enchant tier the player has unlocked (one of 4, 5, 7, 9, 10, 12, 14).
  // Both the element and spirit slot pick the best enchant ≤ this tier, since
  // element and spirit enchants apply at their own tier regardless of the item's
  // tier (verified in-game with T14 Tornado + Behemoth on T7 Potion of Renewal).
  maxEnchantTier: number;
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

interface EnchantStatAdd {
  atk: number;
  def: number;
  hp: number;
}

// Match-adjusted enchant value per stat (uncapped): floor(1.5 × base) when the
// enchant matches an affinity on the item, else the flat base.
function enchantValues(base: StatTriple, match: boolean): StatTriple {
  const v = (x: number) => (match ? matchValue(x) : x);
  return { atk: v(base.atk), def: v(base.def), hp: v(base.hp) };
}

// Stat addition an enchant contributes, capped at the item's base value for
// that stat. Stats not on the item (e.g. atk on a def-only armor) receive 0 —
// enchants only boost what's already there. Verified caps: hp (Malady's Robe),
// atk (Squire Sword), def (Imbued Blade, Tower of Thorns).
function cappedStats(b: Blueprint, raw: StatTriple): EnchantStatAdd {
  return {
    atk: b.atk > 0 ? Math.min(raw.atk, b.atk) : 0,
    def: b.def > 0 ? Math.min(raw.def, b.def) : 0,
    hp: b.hp > 0 ? Math.min(raw.hp, b.hp) : 0,
  };
}

// AP airship-power gain from adding a flat stat boost on top of the base
// stats. The game adds enchant stats into the underlying atk/def/hp and then
// runs the full formula, which gives slightly different (1-2 AP) values than
// "power-gain × multipliers" because of rounding through the chain.
function powerFromStats(b: Blueprint, add: EnchantStatAdd, q: number): number {
  const atk = b.atk * q + add.atk;
  const def = b.def * q + add.def;
  const hp = b.hp * q + add.hp;
  const crit = b.crit * q;
  const eva = b.eva * q;
  return (0.8 * atk + 1.2 * def + 5 * hp) * (1 + 10 * crit) * (1 + 10 * eva);
}

// Gain (at Common-style quality q, for ranking) of an enchant whose base stats
// are `base`, matched or not, on top of the item's quality-scaled base.
function gainFromBase(
  b: Blueprint,
  q: number,
  base: StatTriple,
  match: boolean,
): number {
  const add = cappedStats(b, enchantValues(base, match));
  return powerFromStats(b, add, q) - powerAtQuality(b, q);
}

export interface SlotChoice {
  tier: number;
  match: boolean; // whether the chosen enchant matches an affinity on the item
  family: string | null; // spirit family name when applicable
  targets: string[]; // elements when applicable (one of these matches)
  gain: number; // airship-power gain at the given quality (for ranking only)
  statsAdded: EnchantStatAdd; // stats the enchant adds, capped at the item's base
  // Match-adjusted enchant values *before* the item-stat cap, zeroed for stats
  // the item lacks. computePower re-caps these against the quality-scaled base.
  enchantStats: EnchantStatAdd;
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
  maxEnchantTier: number = 14,
): BestEnchantPlan {
  // Even T1 items can be enchanted (Squire Sword T1 + T14 enchants = 38
  // confirmed in-game), so the only floor is the player's unlocked enchant
  // tier. Snapped to the discrete enchant ladder.
  const playerTier = snapToEnchantTier(Math.min(maxEnchantTier, 14));
  if (playerTier === null) {
    return { element: null, spirit: null, totalGain: 0 };
  }
  // Element and spirit enchants apply at their own tier — verified with T14
  // enchants on a T7 Potion of Renewal — so the effective enchant tier is the
  // player's max, not the item's tier.
  const enchantTier = playerTier;
  const q = QUALITY_MULTIPLIER[quality];

  const zeroStats: EnchantStatAdd = { atk: 0, def: 0, hp: 0 };
  // Match-adjusted enchant values before the item-stat cap, zeroed for stats
  // the item lacks (mirrors how computePower applies them).
  const slotEnchantStats = (base: StatTriple, match: boolean): EnchantStatAdd => {
    const raw = enchantValues(base, match);
    return {
      atk: b.atk > 0 ? raw.atk : 0,
      def: b.def > 0 ? raw.def : 0,
      hp: b.hp > 0 ? raw.hp : 0,
    };
  };

  // Element slot
  // Built-in element enchants are already baked into the item's listed
  // Airship Power in the Blueprints sheet — the element slot is locked and
  // contributes no *additional* AP, so its gain is 0.
  let element: SlotChoice;
  if (b.builtInElement.length > 0) {
    element = {
      tier: enchantTier,
      match: true,
      family: null,
      targets: b.builtInElement,
      gain: 0,
      statsAdded: zeroStats,
      enchantStats: zeroStats,
      locked: true,
    };
  } else {
    const elementMatch = affinityMatched && b.elementalAffinity.length > 0;
    const base = elementBaseAt(enchantTier);
    element = {
      tier: enchantTier,
      match: elementMatch,
      family: null,
      targets: b.elementalAffinity,
      gain: gainFromBase(b, q, base, elementMatch),
      statsAdded: cappedStats(b, enchantValues(base, elementMatch)),
      enchantStats: slotEnchantStats(base, elementMatch),
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
      tier: enchantTier,
      match: true,
      family: spiritFamily(s),
      targets: [],
      gain: 0,
      statsAdded: zeroStats,
      enchantStats: zeroStats,
      locked: true,
    };
  } else {
    // Start with the "any (standard) spirit at the player's tier" baseline.
    const genericBase = spiritBaseAt(enchantTier, null);
    spirit = {
      tier: enchantTier,
      match: false,
      family: null,
      targets: [],
      gain: gainFromBase(b, q, genericBase, false),
      statsAdded: cappedStats(b, enchantValues(genericBase, false)),
      enchantStats: slotEnchantStats(genericBase, false),
      locked: false,
    };
    if (affinityMatched) {
      for (const s of b.spiritAffinity) {
        const sTier = spiritTierFor(s);
        if (sTier !== null && sTier <= playerTier) {
          const family = spiritFamily(s);
          const base = spiritBaseAt(sTier, family);
          const gain = gainFromBase(b, q, base, true);
          if (gain > spirit.gain) {
            spirit = {
              tier: sTier,
              match: true,
              family,
              targets: [],
              gain,
              statsAdded: cappedStats(b, enchantValues(base, true)),
              enchantStats: slotEnchantStats(base, true),
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

// Apply an artifact-skill stat modification onto an item, producing a new
// Blueprint with adjusted stats. Order per stat: add flat → multiply by
// percentage → if a `set` override is present, replace entirely. Stats not
// mentioned by the mod pass through unchanged.
export function applyArtifactStatMods(b: Blueprint): Blueprint {
  const m = b.artifactStatMods;
  if (!m) return b;
  const apply = (base: number, add = 0, mult = 1) => (base + add) * mult;
  return {
    ...b,
    atk: apply(b.atk, m.atkAdd, m.atkMult),
    def: apply(b.def, m.defAdd, m.defMult),
    hp: apply(b.hp, m.hpAdd, m.hpMult),
    eva:
      m.evaSet !== undefined ? m.evaSet : apply(b.eva, m.evaAdd, m.evaMult),
    crit:
      m.critSet !== undefined ? m.critSet : apply(b.crit, m.critAdd, m.critMult),
  };
}

export function computePower(b: Blueprint, opts: PowerOptions): number {
  // Note: artifact stat-boost skills (Urist's Sturdiness, Savard's Aloofness,
  // Myrthee's Left Hook) populate `artifactStatMods` at sync time but do NOT
  // affect airship power. Verified empirically with Rock Stompers + Gaia +
  // Bahamut (1727 exact, no Starforged Milestone applied) and Torc of Peace
  // + Apotheosis + Griffin (1610 exact). The earlier LWC anomaly was a
  // Starforged Milestone (+25% Base ATK/DEF/HP), not the artifact skill.
  const q = QUALITY_MULTIPLIER[opts.quality];
  const boost = opts.includeStarforgedStatBoosts
    ? b.starforgedStatBoosts
    : undefined;
  // Quality-scaled base stats, *before* the Starforged Milestone boost. The
  // enchant cap operates per slot against this un-boosted value (kept as a
  // raw float), and the +X% milestone is applied to the base+enchant total
  // afterwards — see the boost step below.
  const qAtkBase = b.atk * q;
  const qDefBase = b.def * q;
  const qHpBase = b.hp * q;

  let rawAtk = qAtkBase;
  let rawDef = qDefBase;
  let rawHp = qHpBase;

  if (opts.enchanted) {
    const plan = bestEnchantPlan(
      b,
      opts.quality,
      opts.affinityMatched,
      opts.maxEnchantTier,
    );
    for (const slot of [plan.element, plan.spirit]) {
      if (!slot || slot.locked) continue;
      // slot.enchantStats are the match-adjusted enchant values (element- or
      // spirit-specific) before the cap; re-cap them at the quality-scaled base.
      if (b.atk > 0) rawAtk += Math.min(slot.enchantStats.atk, qAtkBase);
      if (b.def > 0) rawDef += Math.min(slot.enchantStats.def, qDefBase);
      if (b.hp > 0) rawHp += Math.min(slot.enchantStats.hp, qHpBase);
    }
  }

  // Round the quality-scaled + enchanted stat to integer (round-half-up). This
  // is the displayed stat *before* the Starforged Milestone. The game stores
  // integer stats and computes AP from them — verified against Superior
  // Frogsong (raw 3088.4 → stat-rounded 3090) and Superior Warrior Assegai
  // (atk 350 + hp 13 → AP 345).
  let dispAtk = Math.round(rawAtk);
  let dispDef = Math.round(rawDef);
  let dispHp = Math.round(rawHp);

  // Starforged Milestone "+X% Base ATK/DEF/HP" multiplies the *already-rounded*
  // base+enchant stat, then the result is rounded again — there are two
  // distinct rounding steps. Verified across four in-game readings:
  //   • Ghostbusters Suit (def 690, no affinity, 2× non-match): un-starforged
  //     908 → 1634; starforged round(908 × 1.25) = 1135 → 2043.
  //   • Lone Wolf Cowl Common (def 230 hp 19, no affinity, 2× non-match):
  //     round(448 × 1.25) = 560 def; round(57 × 1.25) = 71 hp → AP 1027.
  //   • Lone Wolf Cowl Superior unenchanted: round(230 × 1.25) = 288 → round(
  //     288 × 1.25) = 360 def; round(19 × 1.25) = 24 → round(24 × 1.25) = 30 hp
  //     → AP 582. A single combined round (230 × 1.25 × 1.25 = 359.375 → 359)
  //     would miss the in-game 360 — the intermediate round is load-bearing.
  if (boost) {
    dispAtk = Math.round(dispAtk * (1 + (boost.atk ?? 0)));
    dispDef = Math.round(dispDef * (1 + (boost.def ?? 0)));
    dispHp = Math.round(dispHp * (1 + (boost.hp ?? 0)));
  }
  // crit / eva: existing model multiplied them by q. There's no in-game
  // reading yet that nails the right scaling, so leave the q multiplier in
  // place — Sia at Common (q=1) and Slathered at Common (q=1) both work
  // unchanged; Superior+ eva items are untested.
  const crit = b.crit * q;
  const eva = b.eva * q;

  let raw =
    (0.8 * dispAtk + 1.2 * dispDef + 5 * dispHp) *
    (1 + 10 * crit) *
    (1 + 10 * eva);

  if (opts.includeAirshipUpgrade && b.airshipPowerUpgradeBonus > 0) {
    raw *= 1 + b.airshipPowerUpgradeBonus;
  }
  return Math.round(raw);
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
export function recommendEnchant(
  b: Blueprint,
  maxEnchantTier: number = 14,
): EnchantRecommendation {
  // Artifact stat boosts don't affect airship power — see computePower.
  const item = b;
  const plan = bestEnchantPlan(item, "Common", true, maxEnchantTier);

  const spiritAffinityAlternatives: SpiritAffinityNote[] = [];
  // No alternatives shown for locked (built-in) slots — the player can't
  // swap to anything else, so listing alternatives would be confusing.
  if (plan.spirit && !plan.spirit.locked) {
    for (const s of item.spiritAffinity) {
      const sTier = spiritTierFor(s);
      const applicable = sTier !== null && sTier <= maxEnchantTier;
      const family = spiritFamily(s);
      const matchGain = applicable
        ? gainFromBase(item, 1, spiritBaseAt(sTier!, family), true)
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
