/**
 * Sync game data from the canonical Shop Titans community spreadsheet.
 *
 * Downloads the Blueprints and Enchantments tabs as CSV, parses them, and
 * writes typed JSON into `data/`. Run via `npm run sync`. A GitHub Action runs
 * this on a schedule and commits any diff.
 *
 * Source workbook: https://docs.google.com/spreadsheets/d/1WLa7X8h3O0-aGKxeAlCL7bnN8-FhGd3t7pz2RCzSg8c
 */
import { parse } from "csv-parse/sync";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DATA_DIR = resolve(ROOT, "data");

const SPREADSHEET_ID = "1WLa7X8h3O0-aGKxeAlCL7bnN8-FhGd3t7pz2RCzSg8c";
const TABS = {
  blueprints: 1558235212,
  enchantments: 24042844,
  home: 0,
};

function csvUrl(gid: number): string {
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
}

async function fetchCsv(gid: number): Promise<string[][]> {
  const res = await fetch(csvUrl(gid), { redirect: "follow" });
  if (!res.ok) throw new Error(`Failed to fetch gid=${gid}: ${res.status}`);
  const text = await res.text();
  return parse(text, { relax_column_count: true }) as string[][];
}

function toNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const s = raw.replace(/,/g, "").trim();
  if (!s || s === "---") return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function splitList(raw: string | undefined): string[] {
  if (!raw) return [];
  const s = raw.trim();
  if (!s || s === "---") return [];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

// Column indices come from inspecting the Blueprints tab header. Some are
// blank in the header row because of merged cells; we use the data positions.
const COL = {
  name: 0,
  type: 1,
  tier: 5,
  airshipPower: 15,
  atk: 44,
  def: 45,
  hp: 46,
  eva: 47,
  crit: 48,
  elementalAffinity: 50,
  spiritAffinity: 51,
  builtInElement: 52,
  builtInSpirit: 53,
  craftingUpgrade: [55, 57, 59, 61, 63] as const,
  starforgedMilestone: [66, 68, 70, 72, 74] as const,
  ascensionUpgrade: [77, 79, 81] as const,
} as const;

function parseAirshipUpgradeBonus(upgrades: string[]): number {
  // matches strings like "+25% Bonus Airship Power"
  for (const u of upgrades) {
    const m = u.match(/\+(\d+(?:\.\d+)?)\s*%\s*Bonus\s*Airship\s*Power/i);
    if (m) return Number(m[1]) / 100;
  }
  return 0;
}

// Parse a Starforged Milestone (or any crafting/ascension upgrade) that adds a
// % bonus to base stats. The canonical sheet currently only uses the single
// string `"+25% Base ATK, DEF and HP"`, but the parser handles any combination
// of ATK / DEF / HP / EVA / CRIT and any +X% so a future variant lands without
// a code change. Returns undefined when no stat-boost line is present.
type StatBoosts = NonNullable<
  import("../src/data/types").Blueprint["starforgedStatBoosts"]
>;
function parseStarforgedStatBoosts(upgrades: string[]): StatBoosts | undefined {
  const out: StatBoosts = {};
  for (const u of upgrades) {
    // "+25% Base ATK, DEF and HP" → stats: ATK, DEF, HP, pct 0.25.
    const m = u.match(/\+(\d+(?:\.\d+)?)\s*%\s*Base\s+([A-Z,\s]+(?:and\s+[A-Z]+)?)/i);
    if (!m) continue;
    const pct = Number(m[1]) / 100;
    const tail = m[2].toUpperCase();
    if (/\bATK\b/.test(tail)) out.atk = pct;
    if (/\bDEF\b/.test(tail)) out.def = pct;
    if (/\bHP\b/.test(tail)) out.hp = pct;
    if (/\bEVA\b/.test(tail)) out.eva = pct;
    if (/\bCRIT\b/.test(tail)) out.crit = pct;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

// Artifact items unlocked via Artifact Chests carry artifact skills that the
// canonical Blueprints sheet doesn't list. Only some skills add airship power
// on top of base + enchants; most have other effects (combat, durability,
// drop rates, or stat boosts that affect the item's base AP separately).
// See docs/data-points.md for the full artifact skill table.
//
// Only items with skills that *flat-multiply* airship power go in this map.
// Skills that change the item's underlying stats (e.g. Urist's Sturdiness
// boosting defense) are NOT modelled here — they'd need a separate stat-
// adjustment layer. When a user reports an in-game AP that beats the model
// by a clean ~20% on an artifact item we haven't mapped here, add it.
const ARTIFACT_AP_BOOSTS: Record<string, { bonus: number; skill: string }> = {
  "Wyrmbane Cannon": { bonus: 0.2, skill: "Meirika's Secret" },
};

// Artifact skills that modify the item's base stats (not a flat AP
// multiplier). Applied to atk/def/hp/eva/crit before the AP formula runs, so
// the resulting stats interact with enchant caps and quality scaling like
// any other stat. Source: Skills tab effects on the artifact items.
//
// Each skill is interpreted from its in-game text:
//   Urist's Sturdiness:    "+250 Defense. +25% Defense.
//                           Evasion is set to 0%."
//   Savard's Aloofness:    "+40% Attack. +40% Defense."
//   Myrthee's Left Hook:   "+20% Health. +10% Evasion."
//
// "+X% Stat" is multiplicative on the stat (×1+X/100). "+10% Evasion" is
// interpreted as additive on the eva decimal because the items with this
// skill have base eva 0; treating it as multiplicative would leave it at 0.
// Pending in-game verification — see docs/data-points.md.
interface ArtifactStatModEntry {
  skill: string;
  mods: import("../src/data/types").ArtifactStatMod;
}
const ARTIFACT_STAT_MODS: Record<string, ArtifactStatModEntry> = {
  "Rock Stompers": {
    skill: "Urist's Sturdiness",
    mods: { defAdd: 250, defMult: 1.25, evaSet: 0 },
  },
  "Lone Wolf Cowl": {
    skill: "Savard's Aloofness",
    mods: { atkMult: 1.4, defMult: 1.4 },
  },
  "Torc of Peace": {
    skill: "Myrthee's Left Hook",
    mods: { hpMult: 1.2, evaAdd: 0.1 },
  },
};

interface ParsedBlueprint {
  name: string;
  type: string;
  tier: number;
  airshipPower: number;
  atk: number;
  def: number;
  hp: number;
  eva: number;
  crit: number;
  elementalAffinity: string[];
  spiritAffinity: string[];
  builtInElement: string[];
  builtInSpirit: string[];
  craftingUpgrades: string[];
  starforgedMilestones: string[];
  ascensionUpgrades: string[];
  hasAirshipPowerUpgrade: boolean;
  airshipPowerUpgradeBonus: number;
  artifactSkillName?: string;
  artifactStatMods?: import("../src/data/types").ArtifactStatMod;
  starforgedStatBoosts?: StatBoosts;
}

function parseBlueprints(rows: string[][]): ParsedBlueprint[] {
  // Sanity-check that columns are where we expect — the merged-cell header
  // layout would break silently if the upstream sheet adds/removes columns.
  const header = rows[0] ?? [];
  const checks: [number, string][] = [
    [COL.name, "Name"],
    [COL.type, "Type"],
    [COL.tier, "Tier"],
    [COL.airshipPower, "Airship Power"],
    [COL.atk, "ATK"],
    [COL.def, "DEF"],
    [COL.hp, "HP"],
    [COL.eva, "EVA"],
    [COL.crit, "CRIT"],
    [COL.elementalAffinity, "Elemental Affinity"],
  ];
  for (const [i, expected] of checks) {
    const got = (header[i] ?? "").trim();
    if (got !== expected) {
      throw new Error(
        `Blueprints header mismatch at col ${i}: expected "${expected}", got "${got}". The upstream spreadsheet may have changed columns.`,
      );
    }
  }
  const out: ParsedBlueprint[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[COL.name] || !r[COL.name].trim()) continue;
    const name = r[COL.name].trim();
    if (!name || name.startsWith("Total") || name.startsWith("#")) continue;
    const tier = toNumber(r[COL.tier]);
    if (tier <= 0) continue;
    const craftingUpgrades = COL.craftingUpgrade
      .map((c) => (r[c] ?? "").trim())
      .filter((v) => v && v !== "---");
    const starforgedMilestones = COL.starforgedMilestone
      .map((c) => (r[c] ?? "").trim())
      .filter((v) => v && v !== "---");
    const ascensionUpgrades = COL.ascensionUpgrade
      .map((c) => (r[c] ?? "").trim())
      .filter((v) => v && v !== "---");
    const parsedBonus = parseAirshipUpgradeBonus([
      ...craftingUpgrades,
      ...starforgedMilestones,
      ...ascensionUpgrades,
    ]);
    const artifactBonus = ARTIFACT_AP_BOOSTS[name]?.bonus ?? 0;
    // Sum the explicit Bonus Airship Power upgrade and any known artifact-
    // skill boost. Either source produces the same multiplicative effect on
    // the final AP, so we collapse them into one airshipPowerUpgradeBonus.
    const airshipUpgradeBonus = parsedBonus + artifactBonus;
    const statMod = ARTIFACT_STAT_MODS[name];
    const artifactSkillName =
      ARTIFACT_AP_BOOSTS[name]?.skill ?? statMod?.skill ?? undefined;
    const starforgedStatBoosts = parseStarforgedStatBoosts([
      ...craftingUpgrades,
      ...starforgedMilestones,
      ...ascensionUpgrades,
    ]);
    out.push({
      name,
      type: (r[COL.type] ?? "").trim(),
      tier,
      airshipPower: toNumber(r[COL.airshipPower]),
      atk: toNumber(r[COL.atk]),
      def: toNumber(r[COL.def]),
      hp: toNumber(r[COL.hp]),
      eva: toNumber(r[COL.eva]),
      crit: toNumber(r[COL.crit]),
      elementalAffinity: splitList(r[COL.elementalAffinity]),
      spiritAffinity: splitList(r[COL.spiritAffinity]),
      builtInElement: splitList(r[COL.builtInElement]),
      builtInSpirit: splitList(r[COL.builtInSpirit]),
      craftingUpgrades,
      starforgedMilestones,
      ascensionUpgrades,
      hasAirshipPowerUpgrade: airshipUpgradeBonus > 0,
      airshipPowerUpgradeBonus: airshipUpgradeBonus,
      ...(artifactSkillName ? { artifactSkillName } : {}),
      ...(statMod ? { artifactStatMods: statMod.mods } : {}),
      ...(starforgedStatBoosts ? { starforgedStatBoosts } : {}),
    });
  }
  return out;
}

interface ParsedEnchantment {
  name: string;
  type: string; // "Element" | "Spirit"
  tier: number;
  atk: number;
  def: number;
  hp: number;
}

// Enchants are themselves craftable blueprints — every "<X> Element" / "<X>
// Spirit" appears in the Blueprints tab (Type = "Enchantment") with its own
// Tier and base ATK/DEF/HP. We source enchants from there so their tier and
// base stats are authoritative (the affinity-match value is floor(1.5 × base),
// derived in the app). The element/spirit kind comes from the name suffix.
function parseEnchantments(blueprintRows: string[][]): ParsedEnchantment[] {
  const out: ParsedEnchantment[] = [];
  for (let i = 1; i < blueprintRows.length; i++) {
    const r = blueprintRows[i];
    if (!r) continue;
    const name = (r[COL.name] ?? "").trim();
    if (!name) continue;
    if ((r[COL.type] ?? "").trim() !== "Enchantment") continue;
    const type = name.endsWith("Element")
      ? "Element"
      : name.endsWith("Spirit")
        ? "Spirit"
        : "Other";
    out.push({
      name,
      type,
      tier: toNumber(r[COL.tier]),
      atk: toNumber(r[COL.atk]),
      def: toNumber(r[COL.def]),
      hp: toNumber(r[COL.hp]),
    });
  }
  return out;
}

async function readSheetVersion(): Promise<string | null> {
  try {
    const rows = await fetchCsv(TABS.home);
    // Look for a row containing a version-ish string (e.g. "v26.5.0").
    for (const r of rows) {
      for (const cell of r) {
        if (/v\d+(\.\d+){1,3}/i.test(cell)) {
          const m = cell.match(/v\d+(\.\d+){1,3}(\.\d+)?[A-Za-z0-9.\-]*/);
          if (m) return m[0];
        }
      }
    }
  } catch {
    // Home tab is optional; ignore failures.
  }
  return null;
}

async function main() {
  console.log("Syncing Shop Titans game data…");
  await mkdir(DATA_DIR, { recursive: true });

  const [blueprintRows, version] = await Promise.all([
    fetchCsv(TABS.blueprints),
    readSheetVersion(),
  ]);

  const blueprints = parseBlueprints(blueprintRows);
  // Enchants live in the Blueprints tab too (Type = "Enchantment"), with their
  // tier and base stats — that's our authoritative source, so we no longer need
  // the separate Enchantments tab.
  const enchantments = parseEnchantments(blueprintRows);

  const meta = {
    syncedAt: new Date().toISOString(),
    sourceSpreadsheet: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`,
    sourceSheetVersion: version,
    blueprintCount: blueprints.length,
    enchantmentCount: enchantments.length,
  };

  await Promise.all([
    writeFile(
      resolve(DATA_DIR, "blueprints.json"),
      JSON.stringify(blueprints, null, 2) + "\n",
    ),
    writeFile(
      resolve(DATA_DIR, "enchantments.json"),
      JSON.stringify(enchantments, null, 2) + "\n",
    ),
    writeFile(
      resolve(DATA_DIR, "meta.json"),
      JSON.stringify(meta, null, 2) + "\n",
    ),
  ]);

  console.log(
    `Wrote ${blueprints.length} blueprints, ${enchantments.length} enchantments (${version ?? "unknown version"}).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
