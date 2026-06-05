import type { GameData } from "./types";

// Static import of committed JSON. Vite resolves these at build time.
import blueprintsJson from "../../data/blueprints.json";
import enchantmentsJson from "../../data/enchantments.json";
import metaJson from "../../data/meta.json";

export function loadCommittedData(): GameData {
  return {
    meta: metaJson as GameData["meta"],
    blueprints: blueprintsJson as GameData["blueprints"],
    enchantments: enchantmentsJson as GameData["enchantments"],
  };
}
