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
    const airshipUpgradeBonus = parseAirshipUpgradeBonus([
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
    });
  }
  return out;
}

interface ParsedEnchantment {
  name: string;
  type: string;
}

function parseEnchantments(rows: string[][]): ParsedEnchantment[] {
  const out: ParsedEnchantment[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = (r?.[0] ?? "").trim();
    if (!name) continue;
    const type = (r?.[1] ?? "").trim();
    out.push({ name, type });
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

  const [blueprintRows, enchantRows, version] = await Promise.all([
    fetchCsv(TABS.blueprints),
    fetchCsv(TABS.enchantments),
    readSheetVersion(),
  ]);

  const blueprints = parseBlueprints(blueprintRows);
  const enchantments = parseEnchantments(enchantRows);

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
