// Shared game-data types. Kept in `src/data` so all tools can import the same shapes.

export type Quality = "Common" | "Superior" | "Flawless" | "Epic" | "Legendary";

export const QUALITY_ORDER: Quality[] = [
  "Common",
  "Superior",
  "Flawless",
  "Epic",
  "Legendary",
];

// Multipliers taken from the Dragon Invasion reference sheet's Key.
// Applied to base item stats. For crit/eva items the compounding makes
// final airship power slightly higher than the linear scaling — we accept
// that approximation, matching how the community sheet ranks items.
export const QUALITY_MULTIPLIER: Record<Quality, number> = {
  Common: 1,
  Superior: 1.25,
  Flawless: 1.5,
  Epic: 2,
  Legendary: 3,
};

// Standard Shop Titans quality tier colours (white/green/blue/purple/gold),
// matched to the in-game item-rarity palette.
export const QUALITY_COLOR: Record<Quality, string> = {
  Common: "#d8dde6",
  Superior: "#4ade80",
  Flawless: "#60a5fa",
  Epic: "#c084fc",
  Legendary: "#fbbf24",
};

// Stat modifications from an artifact-chest item's unique artifact skill —
// e.g. Urist's Sturdiness on Rock Stompers adds +250 Defense, +25% Defense,
// and pins evasion at 0. Applied to the item's base stats *before* enchants,
// so cap calculations and quality scaling see the modified values.
//
// Order of operations per stat: add the flat amount → multiply by the
// percentage → if `set` is present, override entirely (used for "fixed at X"
// effects).
export interface ArtifactStatMod {
  atkAdd?: number;
  defAdd?: number;
  hpAdd?: number;
  evaAdd?: number; // additive on the eva decimal (e.g. 0.10 for "+10% Evasion")
  critAdd?: number;
  atkMult?: number; // 1.4 for "+40% Attack"
  defMult?: number;
  hpMult?: number;
  evaMult?: number;
  critMult?: number;
  evaSet?: number; // override (e.g. Urist's "Evasion is set to 0%")
  critSet?: number;
}

export interface Blueprint {
  name: string;
  type: string;
  tier: number;
  airshipPower: number; // base AP at Common quality, no APU, no enchant
  atk: number;
  def: number;
  hp: number;
  eva: number; // 0..1
  crit: number; // 0..1
  elementalAffinity: string[]; // e.g. ["Air", "Dark"]
  spiritAffinity: string[]; // e.g. ["Ouroboros"]
  builtInElement: string[];
  builtInSpirit: string[];
  // Crafting / Starforged / Ascension upgrade strings — parsed downstream.
  craftingUpgrades: string[];
  starforgedMilestones: string[];
  ascensionUpgrades: string[];
  // Derived flags (filled at sync time):
  hasAirshipPowerUpgrade: boolean; // any +X% Bonus Airship Power upgrade
  airshipPowerUpgradeBonus: number; // e.g. 0.25 for "+25% Bonus Airship Power"; 0 if none
  // Artifact skill that modifies base stats (Urist's Sturdiness, Savard's
  // Aloofness, Myrthee's Left Hook). Only set for the small number of items
  // listed in `ARTIFACT_STAT_MODS` in `scripts/sync-data.ts`; null/absent
  // for everything else.
  artifactSkillName?: string;
  artifactStatMods?: ArtifactStatMod;
  // Stat-boosting Starforged Milestone(s) the item *can* carry — e.g.
  // "+25% Base ATK, DEF and HP". Always populated from the sheet's
  // starforgedMilestones list at sync time when a stat-boost milestone is
  // present; the player still has to unlock the milestone for it to apply
  // in their game, hence the `includeStarforgedStatBoosts` option in
  // PowerOptions controls whether the model factors it in.
  starforgedStatBoosts?: {
    atk?: number; // 0.25 for "+25% Base ATK"
    def?: number;
    hp?: number;
    eva?: number;
    crit?: number;
  };
}

export interface Enchantment {
  name: string;
  type: string; // "Element" | "Spirit"
  // Tier and base stats are read directly from the enchant's own blueprint row
  // in the canonical Blueprints tab (each enchant is a craftable item). These
  // are authoritative — the in-game affinity-match value is floor(1.5 × base).
  tier: number;
  atk: number;
  def: number;
  hp: number;
}

export interface DataMeta {
  syncedAt: string; // ISO timestamp
  sourceSpreadsheet: string;
  sourceSheetVersion: string | null; // taken from the Home tab title if available
  blueprintCount: number;
  enchantmentCount: number;
}

export interface GameData {
  meta: DataMeta;
  blueprints: Blueprint[];
  enchantments: Enchantment[];
}
