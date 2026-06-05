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
}

export interface Enchantment {
  name: string;
  type: string; // "Element" | "Spirit" | etc.
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
