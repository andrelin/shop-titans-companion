// Dragon Invasion airship categories — the four slots items compete for. Shared
// by every event tool so the bucketing never drifts between them.

export type Category =
  | "Weapons"
  | "Body Armor"
  | "Misc Armor"
  | "Accessories"
  | "Other";

// Each craftable type maps to exactly one category. Types not listed fall to
// "Other" and are excluded from the event tools.
export const TYPE_TO_CATEGORY: Record<string, Category> = {
  // Weapons
  Sword: "Weapons",
  Axe: "Weapons",
  Dagger: "Weapons",
  Mace: "Weapons",
  Spear: "Weapons",
  Staff: "Weapons",
  Wand: "Weapons",
  Bow: "Weapons",
  Crossbow: "Weapons",
  Gun: "Weapons",
  Instrument: "Weapons",
  "Dual Wield": "Weapons",
  // Body Armor (chest pieces)
  "Heavy Armor": "Body Armor",
  "Light Armor": "Body Armor",
  Clothes: "Body Armor",
  // Misc Armor (helmets, footwear, gloves)
  Helmet: "Misc Armor",
  "Magician Hat": "Misc Armor",
  "Rogue Hat": "Misc Armor",
  Gloves: "Misc Armor",
  Gauntlets: "Misc Armor",
  "Light Footwear": "Misc Armor",
  "Heavy Footwear": "Misc Armor",
  Boots: "Misc Armor",
  // Accessories
  Cloak: "Accessories",
  Shield: "Accessories",
  Amulet: "Accessories",
  Ring: "Accessories",
  Spell: "Accessories",
  Familiar: "Accessories",
  Aurasong: "Accessories",
  Quiver: "Accessories",
  Potion: "Accessories",
  "Herbal Medicine": "Accessories",
  Meal: "Accessories",
  Dessert: "Accessories",
};

export const CATEGORY_ORDER: Category[] = [
  "Weapons",
  "Body Armor",
  "Misc Armor",
  "Accessories",
];

export function categoryOf(type: string): Category {
  return TYPE_TO_CATEGORY[type] ?? "Other";
}

// Item types that exist as gear slots but never contribute to airship power:
// they can only be equipped by Champions and cannot be donated to the airship,
// so they don't compete in Dragon Invasion (and are absent from ST Central's DI
// list for the same reason). The canonical sheet still lists AP values for them,
// so any airship-power tool must exclude them explicitly.
export const AIRSHIP_EXCLUDED_TYPES = new Set(["Familiar", "Aurasong"]);

export function contributesToAirshipPower(type: string): boolean {
  return !AIRSHIP_EXCLUDED_TYPES.has(type);
}
