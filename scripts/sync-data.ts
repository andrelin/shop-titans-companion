/**
 * Sync game data from the official Shop Titans spreadsheet (maintained by Kabam).
 *
 * Downloads the Blueprints and Enchantments tabs as CSV, parses them, and
 * writes typed JSON into `data/`. Run via `npm run sync`. A GitHub Action runs
 * this on a schedule and commits any diff.
 *
 * Source workbook: https://playshoptitans.com/spreadsheet
 * (redirects to https://docs.google.com/spreadsheets/d/1WLa7X8h3O0-aGKxeAlCL7bnN8-FhGd3t7pz2RCzSg8c)
 */
import { parse } from "csv-parse/sync";
import { realpathSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
  unlockPrerequisite: 2,
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
  transcendenceUpgrade: [83, 85, 87] as const,
  transcendenceSeals: [84, 86, 88] as const,
  antiqueFrom: 95,
} as const;

// A premium (not freely craftable) item: its Unlock Prerequisite names a
// purchasable source rather than a worker. Combined with an antique date below.
const PREMIUM_PREREQ_RE = /\b(pack|content pass|bundle|offer|chest)\b/i;

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

// Parse an item's three Transcendence slots (in column order) into typed
// upgrades. Faithful transcription of the sheet only — no AP interpretation.
//   "+10% Base ATK, DEF and HP" → pctBase 0.10
//   "ATK +27" / "DEF +40" / "HP +17" → flat stat add
//   "CRIT +2%" / "EVA +5%" → stat add as a decimal (0.02 / 0.05)
//   anything else (e.g. "Quality Chance x2") → "other" (occupies the slot,
//   contributes no airship power)
// Absent slots (sheet "---") are dropped so a level-N player maps to the first
// N *present* upgrades.
type TranscendenceUpgrade = import("../src/data/types").TranscendenceUpgrade;
function parseTranscendence(
  slots: string[],
  sealCosts: string[],
): TranscendenceUpgrade[] {
  const out: TranscendenceUpgrade[] = [];
  slots.forEach((raw, i) => {
    const slot = (i + 1) as 1 | 2 | 3;
    const s = (raw ?? "").trim();
    if (!s || s === "---") return;
    const seals = toNumber(sealCosts[i]);
    const pct = s.match(/\+(\d+(?:\.\d+)?)\s*%\s*Base\s+ATK/i);
    if (pct) {
      out.push({ slot, seals, kind: "pctBase", pct: Number(pct[1]) / 100, raw: s });
      return;
    }
    const flat = s.match(/^(ATK|DEF|HP)\s*\+\s*(\d+(?:\.\d+)?)$/i);
    if (flat) {
      out.push({
        slot,
        seals,
        kind: "stat",
        stat: flat[1].toLowerCase() as "atk" | "def" | "hp",
        amount: Number(flat[2]),
        raw: s,
      });
      return;
    }
    const pctStat = s.match(/^(CRIT|EVA)\s*\+\s*(\d+(?:\.\d+)?)\s*%$/i);
    if (pctStat) {
      out.push({
        slot,
        seals,
        kind: "stat",
        stat: pctStat[1].toLowerCase() as "crit" | "eva",
        amount: Number(pctStat[2]) / 100,
        raw: s,
      });
      return;
    }
    out.push({ slot, seals, kind: "other", raw: s });
  });
  return out;
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

export interface ParsedBlueprint {
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
  transcendence?: TranscendenceUpgrade[];
  unlockPrerequisite?: string;
  antiqueFrom?: string | null;
  premium?: boolean;
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
    [COL.transcendenceUpgrade[0], "Transcendence Upgrade 1"],
    [COL.unlockPrerequisite, "Unlock Prerequisite"],
    [COL.antiqueFrom, "Available as an Antique starting on (UTC)"],
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
    const transcendence = parseTranscendence(
      COL.transcendenceUpgrade.map((c) => r[c] ?? ""),
      COL.transcendenceSeals.map((c) => r[c] ?? ""),
    );
    const unlockPrerequisiteRaw = (r[COL.unlockPrerequisite] ?? "").trim();
    const unlockPrerequisite =
      unlockPrerequisiteRaw && unlockPrerequisiteRaw !== "---"
        ? unlockPrerequisiteRaw
        : "";
    const antiqueRaw = (r[COL.antiqueFrom] ?? "").trim();
    const antiqueFrom = antiqueRaw && antiqueRaw !== "---" ? antiqueRaw : null;
    // Premium = not freely craftable: has an Antiques rotation date (only premium
    // items get one) or a purchasable prerequisite (pack/offer/chest/pass).
    const premium =
      antiqueFrom !== null || PREMIUM_PREREQ_RE.test(unlockPrerequisite);
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
      ...(transcendence.length > 0 ? { transcendence } : {}),
      ...(unlockPrerequisite ? { unlockPrerequisite } : {}),
      ...(antiqueFrom ? { antiqueFrom } : {}),
      ...(premium ? { premium: true } : {}),
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

// ---------------------------------------------------------------------------
// Changelog / commit summary
//
// Every sync that actually changes the data writes a human-readable summary of
// *what* changed: which items were added/removed and which had an AP-relevant
// field (stats, affinities, bonuses) change. The summary is both prepended to
// docs/data-changelog.md (committed) and written to data-sync-report.txt
// (git-ignored) so the CI job can use it as the commit message body.
//
// Only fields the power ranker reads are diffed — not every sheet cell. The
// crafting/starforged/ascension/transcendence upgrade *lists*, values, XP, etc.
// change constantly and would bury the signal; the git history of `data/` is the
// authoritative byte-level record for those.
// ---------------------------------------------------------------------------
const CHANGELOG_PATH = resolve(ROOT, "docs", "data-changelog.md");
const REPORT_PATH = resolve(ROOT, "data-sync-report.txt");
const CHANGELOG_MARKER = "<!-- entries -->";
const CHANGELOG_HEADER = `# Data changelog

Auto-generated by the data sync (\`npm run sync\`).
Most recent syncs first.
Only power-ranker-relevant fields are summarised here — see the git history of \`data/\` for the exact byte-level diff behind each entry.

${CHANGELOG_MARKER}
`;

// Fields whose changes are worth surfacing — everything the ranker reads.
const DIFF_FIELDS: (keyof ParsedBlueprint)[] = [
  "type",
  "tier",
  "airshipPower",
  "atk",
  "def",
  "hp",
  "eva",
  "crit",
  "elementalAffinity",
  "spiritAffinity",
  "builtInElement",
  "builtInSpirit",
  "airshipPowerUpgradeBonus",
  "starforgedStatBoosts",
];

function fieldToText(v: unknown): string {
  if (v === undefined || v === null) return "—";
  if (Array.isArray(v)) return v.length ? v.join("/") : "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

interface ItemChange {
  name: string;
  changes: string[];
}
interface DataDiff {
  added: ParsedBlueprint[];
  removed: string[];
  changed: ItemChange[];
}

export function diffBlueprints(
  prev: ParsedBlueprint[],
  next: ParsedBlueprint[],
): DataDiff {
  const prevByName = new Map(prev.map((b) => [b.name, b]));
  const nextByName = new Map(next.map((b) => [b.name, b]));
  const added = next.filter((b) => !prevByName.has(b.name));
  const removed = prev.filter((b) => !nextByName.has(b.name)).map((b) => b.name);
  const changed: ItemChange[] = [];
  for (const b of next) {
    const p = prevByName.get(b.name);
    if (!p) continue;
    const changes: string[] = [];
    for (const f of DIFF_FIELDS) {
      const before = fieldToText(p[f]);
      const after = fieldToText(b[f]);
      if (before !== after) changes.push(`${f} ${before} → ${after}`);
    }
    if (changes.length) changed.push({ name: b.name, changes });
  }
  return { added, removed, changed };
}

// Cap a long list so a pathological sync (e.g. a schema change touching every
// row) can't produce a 1500-line commit message / changelog entry.
function capList(lines: string[], cap: number): string[] {
  if (lines.length <= cap) return lines;
  return [...lines.slice(0, cap), `- …and ${lines.length - cap} more`];
}

// Build the markdown changelog entry + a one-line commit headline.
export function buildSummary(args: {
  date: string; // ISO
  prevVersion: string | null;
  version: string | null;
  prevCount: number | null;
  nextCount: number;
  diff: DataDiff | null;
}): { headline: string; entry: string } {
  const { date, prevVersion, version, prevCount, nextCount, diff } = args;
  const day = date.slice(0, 10);
  const A = diff?.added.length ?? 0;
  const R = diff?.removed.length ?? 0;
  const C = diff?.changed.length ?? 0;

  const headline =
    `data: sync ${version ?? "update"} (${day})` +
    (diff ? ` — +${A} −${R} ~${C} items` : "");

  const meta: string[] = [];
  if (prevVersion !== version) {
    meta.push(`- Sheet version: ${prevVersion ?? "—"} → ${version ?? "—"}`);
  }
  const delta = prevCount === null ? "" : ` (${nextCount - prevCount >= 0 ? "+" : ""}${nextCount - prevCount})`;
  meta.push(`- Blueprints: ${prevCount ?? "—"} → ${nextCount}${delta}`);

  const sections: string[] = [];
  const cap = 80;
  if (diff && diff.added.length) {
    sections.push("", `### Added (${diff.added.length})`);
    sections.push(...capList(diff.added.map((b) => `- ${b.name} (${b.type} T${b.tier})`), cap));
  }
  if (diff && diff.removed.length) {
    sections.push("", `### Removed (${diff.removed.length})`);
    sections.push(...capList(diff.removed.map((n) => `- ${n}`), cap));
  }
  if (diff && diff.changed.length) {
    sections.push("", `### Changed (${diff.changed.length})`);
    sections.push(...capList(diff.changed.map((c) => `- ${c.name}: ${c.changes.join(", ")}`), cap));
  }
  if (!diff || (A === 0 && R === 0 && C === 0)) {
    sections.push("", "_No power-ranker-relevant field changes; version/metadata only._");
  }

  const entry =
    [`## ${day} — ${version ?? "unknown version"}`, "", ...meta, ...sections]
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n";
  return { headline, entry };
}

async function prependChangelogEntry(entry: string): Promise<void> {
  let existing: string;
  try {
    existing = await readFile(CHANGELOG_PATH, "utf8");
  } catch {
    existing = CHANGELOG_HEADER;
  }
  const idx = existing.indexOf(CHANGELOG_MARKER);
  if (idx === -1) {
    // File exists but lost its marker — rebuild from a fresh header.
    existing = CHANGELOG_HEADER;
  }
  const cut = existing.indexOf(CHANGELOG_MARKER) + CHANGELOG_MARKER.length;
  const head = existing.slice(0, cut);
  const rest = existing.slice(cut).replace(/^\n+/, "");
  const next = `${head}\n\n${entry}\n${rest}`.replace(/\n{3,}$/, "\n");
  await writeFile(CHANGELOG_PATH, next);
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

  const blueprintsJson = JSON.stringify(blueprints, null, 2) + "\n";
  const enchantmentsJson = JSON.stringify(enchantments, null, 2) + "\n";

  // Only bump `syncedAt` when something substantive actually changed — the
  // blueprints, the enchants, or the sheet version. Otherwise preserve the
  // committed timestamp so the files stay byte-identical and the scheduled
  // GitHub Action makes no commit (it commits only on a real `data/` diff).
  // Without this, `syncedAt = now` changes every run and produces a daily
  // timestamp-only commit with no real content.
  const readJson = async (name: string): Promise<unknown> => {
    try {
      return JSON.parse(await readFile(resolve(DATA_DIR, name), "utf8"));
    } catch {
      return null;
    }
  };
  const [prevBlueprints, prevEnchantments, prevMeta] = await Promise.all([
    readFile(resolve(DATA_DIR, "blueprints.json"), "utf8").catch(() => null),
    readFile(resolve(DATA_DIR, "enchantments.json"), "utf8").catch(() => null),
    readJson("meta.json") as Promise<{
      syncedAt?: string;
      sourceSheetVersion?: string | null;
      blueprintCount?: number;
    } | null>,
  ]);

  const dataChanged =
    prevBlueprints !== blueprintsJson ||
    prevEnchantments !== enchantmentsJson ||
    (prevMeta?.sourceSheetVersion ?? null) !== (version ?? null);

  const now = new Date().toISOString();
  const meta = {
    syncedAt: dataChanged || !prevMeta?.syncedAt ? now : prevMeta.syncedAt,
    sourceSpreadsheet: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`,
    sourceSheetVersion: version,
    blueprintCount: blueprints.length,
    enchantmentCount: enchantments.length,
  };

  await Promise.all([
    writeFile(resolve(DATA_DIR, "blueprints.json"), blueprintsJson),
    writeFile(resolve(DATA_DIR, "enchantments.json"), enchantmentsJson),
    writeFile(resolve(DATA_DIR, "meta.json"), JSON.stringify(meta, null, 2) + "\n"),
  ]);

  // When something actually changed, record *what* — prepend a dated entry to
  // the changelog and write the commit-message report the CI job consumes. This
  // is auxiliary: the data files are already written above, so a failure here
  // must NOT abort the run and cause the CI commit step to be skipped. Any error
  // is logged and swallowed; the sync still succeeds (with the workflow's
  // fallback commit message if the report is missing).
  if (dataChanged) {
    try {
      let prevParsed: ParsedBlueprint[] | null = null;
      if (prevBlueprints) {
        try {
          prevParsed = JSON.parse(prevBlueprints) as ParsedBlueprint[];
        } catch {
          prevParsed = null;
        }
      }
      const diff = prevParsed ? diffBlueprints(prevParsed, blueprints) : null;
      const { headline, entry } = buildSummary({
        date: now,
        prevVersion: prevMeta?.sourceSheetVersion ?? null,
        version,
        prevCount: prevParsed?.length ?? prevMeta?.blueprintCount ?? null,
        nextCount: blueprints.length,
        diff,
      });
      await prependChangelogEntry(entry);
      await writeFile(REPORT_PATH, `${headline}\n\n${entry}`);
      console.log(`Changelog updated — ${headline}`);
    } catch (err) {
      console.warn(
        "Changelog/report step failed (non-fatal; data still committed):",
        err,
      );
    }
  }

  console.log(
    `Wrote ${blueprints.length} blueprints, ${enchantments.length} enchantments (${version ?? "unknown version"})` +
      `${dataChanged ? "" : " — no substantive change, kept syncedAt"}.`,
  );
}

// Only run the sync when executed directly (`npm run sync`), not when the
// module is imported (e.g. by the changelog unit tests). Compare the *real*
// paths on both sides: process.argv[1] preserves symlinks while
// import.meta.url resolves to the realpath, so a naive string compare would
// make the sync a silent no-op under any symlinked checkout path (e.g. macOS
// /tmp → /private/tmp). realpathSync normalises both.
let invokedDirectly = false;
try {
  invokedDirectly =
    process.argv[1] !== undefined &&
    realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
} catch {
  invokedDirectly = false;
}
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
