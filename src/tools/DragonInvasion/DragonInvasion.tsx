import { Fragment, useMemo, useState } from "react";
import type { Blueprint, GameData, Quality } from "../../data/types";
import { QUALITY_COLOR, QUALITY_MULTIPLIER, QUALITY_ORDER } from "../../data/types";
import {
  computePower,
  ENCHANT_TABLE,
  ENCHANT_TIERS,
  recommendEnchant,
  SPIRIT_TIERS,
} from "../../data/enchant";

// The highest enchant tier currently in the data. When the game adds a new
// tier and we extend ENCHANT_TABLE, the dropdown picks it up automatically
// and defaults to the new ceiling.
const MAX_ENCHANT_TIER = Math.max(...ENCHANT_TIERS);
// Tiers offered as explicit caps in the dropdown — everything below the max.
const CAP_TIERS = ENCHANT_TIERS.filter((t) => t < MAX_ENCHANT_TIER)
  .slice()
  .sort((a, b) => b - a);

type SortKey =
  | "rankedPower"
  | "basePower"
  | "enchantedPower"
  | "delta"
  | "tier"
  | "quality"
  | "name"
  | "type";

// Categories mirror the four columns of the community Dragon Invasion sheet.
// Each item belongs to exactly one. Items not mapped fall to "Other" and are
// hidden by default.
type Category = "Weapons" | "Body Armor" | "Misc Armor" | "Accessories" | "Other";

const TYPE_TO_CATEGORY: Record<string, Category> = {
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
  Aurasong: "Weapons",
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
  Quiver: "Accessories",
  Potion: "Accessories",
  "Herbal Medicine": "Accessories",
  Meal: "Accessories",
  Dessert: "Accessories",
};

const CATEGORY_ORDER: Category[] = [
  "Weapons",
  "Body Armor",
  "Misc Armor",
  "Accessories",
];

function categoryOf(type: string): Category {
  return TYPE_TO_CATEGORY[type] ?? "Other";
}

interface Row {
  bp: Blueprint;
  quality: Quality;
  basePower: number;
  enchantedPower: number;
  rankedPower: number;
  delta: number;
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function DragonInvasion({ data }: { data: GameData }) {
  const [selectedQualities, setSelectedQualities] = useState<Quality[]>([
    "Common",
  ]);
  const [affinityMatched, setAffinityMatched] = useState(true);
  const [includeAirshipUpgrade, setIncludeAirshipUpgrade] = useState(true);
  const [includeStarforgedStatBoosts, setIncludeStarforgedStatBoosts] =
    useState(false);
  // Highest enchant tier the player has unlocked. Defaults to the highest
  // tier in the data (so when the game adds a new tier and we extend
  // ENCHANT_TABLE, the new ceiling becomes the default automatically).
  // Players still climbing can pick lower so the ranker recommends only
  // what they can actually craft.
  const [maxEnchantTier, setMaxEnchantTier] = useState<number>(MAX_ENCHANT_TIER);
  const [categoryFilter, setCategoryFilter] = useState<"All" | Category>("All");
  // Default the upper bound to whatever the latest tier in the data is, so
  // new tiers don't get silently hidden when the game adds them.
  const dataMaxTier = useMemo(
    () => data.blueprints.reduce((m, b) => (b.tier > m ? b.tier : m), 1),
    [data.blueprints],
  );
  const [minTier, setMinTier] = useState<number>(4);
  const [maxTier, setMaxTier] = useState<number>(dataMaxTier);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "rankedPower",
    dir: "desc",
  });
  const [rankedMode, setRankedMode] = useState<"enchanted" | "base">(
    "enchanted",
  );
  const [topPerCategory, setTopPerCategory] = useState<number>(20);

  // One row per (blueprint, selected quality). Sorted in the QUALITY_ORDER
  // sequence so Common rows precede Superior etc. when other keys tie.
  const rows = useMemo<Row[]>(() => {
    const qualitiesInOrder = QUALITY_ORDER.filter((q) =>
      selectedQualities.includes(q),
    );
    const out: Row[] = [];
    for (const bp of data.blueprints) {
      if (bp.atk === 0 && bp.def === 0 && bp.hp === 0) continue;
      // Familiars don't contribute to airship power in-game, despite the
      // canonical sheet listing AP values for them — exclude from rankings.
      if (bp.type === "Familiar") continue;
      for (const quality of qualitiesInOrder) {
        const opts = {
          quality,
          affinityMatched,
          includeAirshipUpgrade,
          includeStarforgedStatBoosts,
          maxEnchantTier,
        } as const;
        const basePower = computePower(bp, { ...opts, enchanted: false });
        const enchantedPower = computePower(bp, { ...opts, enchanted: true });
        const rankedPower =
          rankedMode === "enchanted" ? enchantedPower : basePower;
        out.push({
          bp,
          quality,
          basePower,
          enchantedPower,
          rankedPower,
          delta: enchantedPower - basePower,
        });
      }
    }
    return out;
  }, [
    data.blueprints,
    selectedQualities,
    affinityMatched,
    includeAirshipUpgrade,
    includeStarforgedStatBoosts,
    maxEnchantTier,
    rankedMode,
  ]);

  // Bucket rows by category, with each category sorted by ranked power so we
  // can stamp a per-category rank that survives the user's filter selections.
  const ranked = useMemo(() => {
    const buckets = new Map<Category, (Row & { categoryRank: number })[]>();
    for (const cat of CATEGORY_ORDER) buckets.set(cat, []);
    for (const r of rows) {
      const cat = categoryOf(r.bp.type);
      if (cat === "Other") continue;
      buckets.get(cat)!.push({ ...r, categoryRank: 0 });
    }
    for (const cat of CATEGORY_ORDER) {
      const arr = buckets.get(cat)!;
      arr.sort((a, b) => b.rankedPower - a.rankedPower);
      arr.forEach((r, i) => (r.categoryRank = i + 1));
    }
    return buckets;
  }, [rows]);

  // Apply user filters on top of the ranked buckets.
  const filteredByCategory = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visibleCats =
      categoryFilter === "All" ? CATEGORY_ORDER : [categoryFilter];
    return visibleCats.map((cat) => ({
      category: cat,
      rows: ranked.get(cat)!.filter((r) => {
        if (r.bp.tier < minTier || r.bp.tier > maxTier) return false;
        if (
          q &&
          !r.bp.name.toLowerCase().includes(q) &&
          !r.bp.type.toLowerCase().includes(q)
        )
          return false;
        return true;
      }),
    }));
  }, [ranked, categoryFilter, minTier, maxTier, search]);

  const setSortKey = (key: SortKey) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" },
    );
  };

  const ariaSort = (key: SortKey) =>
    sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none";

  // Local sort within a category preserves the per-category rank.
  const localSort = (
    rs: (Row & { categoryRank: number })[],
  ): (Row & { categoryRank: number })[] => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rs].sort((a, b) => {
      switch (sort.key) {
        case "name":
          return a.bp.name.localeCompare(b.bp.name) * dir;
        case "type":
          return a.bp.type.localeCompare(b.bp.type) * dir;
        case "tier":
          return (a.bp.tier - b.bp.tier) * dir;
        case "quality":
          return (
            (QUALITY_ORDER.indexOf(a.quality) -
              QUALITY_ORDER.indexOf(b.quality)) *
            dir
          );
        case "basePower":
          return (a.basePower - b.basePower) * dir;
        case "enchantedPower":
          return (a.enchantedPower - b.enchantedPower) * dir;
        case "delta":
          return (a.delta - b.delta) * dir;
        case "rankedPower":
        default:
          return (a.rankedPower - b.rankedPower) * dir;
      }
    });
  };

  return (
    <>
      <div className="controls">
        <div className="controls-row">
          <div
            className="quality-picker"
            role="group"
            aria-label="Qualities to include"
          >
            {QUALITY_ORDER.map((q) => {
              const checked = selectedQualities.includes(q);
              return (
                <label
                  key={q}
                  className="toggle"
                  style={{ color: QUALITY_COLOR[q] }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setSelectedQualities((prev) => {
                        if (e.target.checked) {
                          return prev.includes(q) ? prev : [...prev, q];
                        }
                        const next = prev.filter((p) => p !== q);
                        // Always keep at least one quality selected so the
                        // table isn't empty.
                        return next.length === 0 ? prev : next;
                      })
                    }
                  />
                  {q}
                </label>
              );
            })}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as "All" | Category)
            }
            aria-label="Category filter"
          >
            <option value="All">All categories</option>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={rankedMode}
            onChange={(e) =>
              setRankedMode(e.target.value as "enchanted" | "base")
            }
            aria-label="Rank by"
          >
            <option value="enchanted">Rank by enchanted</option>
            <option value="base">Rank by unenchanted</option>
          </select>

          <select
            value={topPerCategory}
            onChange={(e) => setTopPerCategory(Number(e.target.value))}
            aria-label="Top per category"
          >
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={50}>Top 50</option>
            <option value={100}>Top 100</option>
            <option value={9999}>All</option>
          </select>

          <select
            value={maxEnchantTier}
            onChange={(e) => setMaxEnchantTier(Number(e.target.value))}
            aria-label="Max enchant tier you can craft"
            title="Highest tier of enchant you've unlocked. Defaults to all tiers; cap it lower if you're still climbing and want the ranker to recommend only what you can craft."
          >
            <option value={MAX_ENCHANT_TIER}>
              All enchants (up to T{MAX_ENCHANT_TIER})
            </option>
            {CAP_TIERS.map((t) => (
              <option key={t} value={t}>
                Cap enchants at T{t}
              </option>
            ))}
          </select>
        </div>

        <div className="controls-row secondary">
          <span className="tier-range">
            <span>Tier</span>
            <input
              type="number"
              min={1}
              max={Math.max(20, dataMaxTier)}
              value={minTier}
              onChange={(e) => setMinTier(Number(e.target.value))}
              aria-label="Min tier"
            />
            <span>–</span>
            <input
              type="number"
              min={1}
              max={Math.max(20, dataMaxTier)}
              value={maxTier}
              onChange={(e) => setMaxTier(Number(e.target.value))}
              aria-label="Max tier"
            />
          </span>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            style={{ width: 220 }}
          />

          <label className="toggle">
            <input
              type="checkbox"
              checked={affinityMatched}
              onChange={(e) => setAffinityMatched(e.target.checked)}
            />
            <span>Match affinity</span>
          </label>
          <label
            className="toggle"
            title="A handful of items get an airship-power multiplier — either from a Bonus Airship Power Crafting/Starforged upgrade (listed in the data sheet) or from an artifact skill like Meirika's Secret on Wyrmbane Cannon. Tick to assume the bonus is active; every other item is unaffected."
          >
            <input
              type="checkbox"
              checked={includeAirshipUpgrade}
              onChange={(e) => setIncludeAirshipUpgrade(e.target.checked)}
            />
            <span>+20/25% Airship upgrade</span>
          </label>
          <label
            className="toggle"
            title="Many items have a Starforged Milestone that adds +25% to base ATK / DEF / HP. The boost only applies once you've unlocked the milestone — tick to assume you have it on every item that lists one. Items without the milestone are unaffected either way."
          >
            <input
              type="checkbox"
              checked={includeStarforgedStatBoosts}
              onChange={(e) =>
                setIncludeStarforgedStatBoosts(e.target.checked)
              }
            />
            <span>+25% Starforged stat boost</span>
          </label>
        </div>
      </div>

      <ExplainPanel blueprints={data.blueprints} />

      {filteredByCategory.map(({ category, rows: catRows }) => {
        const visible = localSort(catRows).slice(0, topPerCategory);
        return (
          <section key={category} className="category-section">
            <div className="category-header">
              <h2>{category}</h2>
              <span className="count">
                {catRows.length} item{catRows.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="col-center" style={{ width: 56 }}>
                      #
                    </th>
                    <th aria-sort={ariaSort("name")} onClick={() => setSortKey("name")}>
                      Item
                    </th>
                    <th aria-sort={ariaSort("type")} onClick={() => setSortKey("type")}>
                      Type
                    </th>
                    <th
                      className="col-center"
                      aria-sort={ariaSort("tier")}
                      onClick={() => setSortKey("tier")}
                    >
                      Tier
                    </th>
                    <th aria-sort={ariaSort("quality")} onClick={() => setSortKey("quality")}>
                      Quality
                    </th>
                    <th
                      className="num"
                      aria-sort={ariaSort("basePower")}
                      onClick={() => setSortKey("basePower")}
                    >
                      Base AP
                    </th>
                    <th
                      className="num"
                      aria-sort={ariaSort("enchantedPower")}
                      onClick={() => setSortKey("enchantedPower")}
                    >
                      Enchanted AP
                    </th>
                    <th
                      className="num"
                      aria-sort={ariaSort("delta")}
                      onClick={() => setSortKey("delta")}
                    >
                      +Enchant
                    </th>
                    <th>Enchant to use</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const rec = recommendEnchant(r.bp, maxEnchantTier);
                    const rankClass =
                      r.categoryRank === 1
                        ? "rank rank-1"
                        : r.categoryRank === 2
                          ? "rank rank-2"
                          : r.categoryRank === 3
                            ? "rank rank-3"
                            : "rank rank-other";
                    return (
                      <tr key={`${r.bp.name}::${r.quality}`}>
                        <td className={rankClass}>{r.categoryRank}</td>
                        <td className="item-name">{r.bp.name}</td>
                        <td style={{ color: "var(--muted)" }}>{r.bp.type}</td>
                        <td className="col-center">{r.bp.tier}</td>
                        <td
                          style={{
                            color: QUALITY_COLOR[r.quality],
                            fontWeight: 500,
                          }}
                        >
                          {r.quality}
                        </td>
                        <td className="num base">
                          {formatNumber(r.basePower)}
                        </td>
                        <td className="num enchanted">
                          {formatNumber(r.enchantedPower)}
                        </td>
                        <td className="num">
                          <span className={r.delta > 0 ? "delta" : "delta zero"}>
                            +{formatNumber(r.delta)}
                          </span>
                        </td>
                        <td>
                          {rec.element === null && rec.spirit === null ? (
                            <span className="tag">no enchant available</span>
                          ) : (
                            <div className="enchant-cell">
                              {/* Element slot — always applied */}
                              {rec.element ? (
                                <span className="enchant-opt">
                                  <span className="label">
                                    T{rec.element.tier} element
                                  </span>{" "}
                                  {rec.element.targets.length > 0 ? (
                                    <strong>
                                      {rec.element.targets.join(" or ")}
                                    </strong>
                                  ) : (
                                    <strong className="generic">any</strong>
                                  )}
                                  {rec.element.locked ? (
                                    <span
                                      className="locked-badge"
                                      title="Built-in: this element enchant is baked into the blueprint and is already included in the base AP — the slot can't be re-enchanted for extra power."
                                    >
                                      built-in · in base AP
                                    </span>
                                  ) : null}
                                </span>
                              ) : null}
                              {/* Spirit slot — always applied */}
                              {rec.spirit ? (
                                <span className="enchant-opt">
                                  <span className="label">
                                    {rec.spirit.locked
                                      ? "spirit"
                                      : `T${rec.spirit.tier} spirit`}
                                  </span>{" "}
                                  {rec.spirit.match && rec.spirit.family ? (
                                    <strong>{rec.spirit.family}</strong>
                                  ) : (
                                    <strong className="generic">any</strong>
                                  )}
                                  {rec.spirit.locked ? (
                                    <span
                                      className="locked-badge"
                                      title="Built-in spirit: locked into the slot, already included in the base AP. The named skill effect (e.g. Mundra's Spirit) is granted but adds no extra airship power on top of the base."
                                    >
                                      built-in · in base AP
                                    </span>
                                  ) : null}
                                </span>
                              ) : null}
                              {/* Skill-effect-only spirit affinities — these
                                  exist on the item but the matching enchant is
                                  weaker for AP than what the spirit slot
                                  already takes. We list them so the player
                                  can choose them for the skill effect at a
                                  documented AP cost. */}
                              {rec.spiritAffinityAlternatives.map((alt) => (
                                <span
                                  key={alt.family}
                                  className="enchant-aside"
                                  title={
                                    alt.applicable
                                      ? `Apply the matching ${alt.family} spirit for its skill effect, at a ${formatNumber(alt.apCostVsBest)} AP cost vs the best spirit choice.`
                                      : `${alt.family} Spirit is T${alt.tier ?? "?"}, higher than this item's enchant tier — can't be applied here.`
                                  }
                                >
                                  <span className="label">
                                    or for the {alt.family} skill
                                  </span>
                                  {alt.applicable ? (
                                    <span className="ap-cost">
                                      {" "}
                                      (−{formatNumber(alt.apCostVsBest)} AP)
                                    </span>
                                  ) : (
                                    <span className="ap-cost">
                                      {" "}
                                      (tier too high)
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {visible.length === 0 ? (
              <div className="category-footnote">
                No items match the current filters in {category}.
              </div>
            ) : catRows.length > visible.length ? (
              <div className="category-footnote">
                Showing top {visible.length} of {catRows.length}.
              </div>
            ) : null}
          </section>
        );
      })}
    </>
  );
}

// Tier columns in the enchant table. Items between columns step down to the
// next-lower column (the convention from the Dragon Invasion reference sheet).
const ENCHANT_TIER_COLS = [4, 5, 7, 9, 10, 12, 14] as const;

function ExplainPanel({ blueprints }: { blueprints: Blueprint[] }) {
  const upgradeCount = useMemo(
    () => blueprints.filter((b) => b.airshipPowerUpgradeBonus > 0).length,
    [blueprints],
  );

  // Group spirit families by their tier so the user can quickly scan them.
  const spiritsByTier = useMemo(() => {
    const grouped = new Map<number, string[]>();
    for (const [family, tier] of Object.entries(SPIRIT_TIERS)) {
      if (!grouped.has(tier)) grouped.set(tier, []);
      grouped.get(tier)!.push(family);
    }
    for (const list of grouped.values()) list.sort();
    return [...grouped.entries()].sort((a, b) => a[0] - b[0]);
  }, []);

  return (
    <details className="explain">
      <summary>How airship power is calculated</summary>
      <div className="explain-body">
        <p>
          The Dragon Invasion airship ranks items by their{" "}
          <em>airship power</em> (AP) — a single number combining a blueprint's
          stats, quality, and the enchant you place on it. Everything below is
          how the ranker computes those numbers.
        </p>

        <h3>1. Base formula</h3>
        <p>
          Every craftable item's AP at Common quality, with no enchant, is:
        </p>
        <pre className="explain-formula">
          AP = (0.8·atk + 1.2·def + 5·hp) × (1 + 10·crit) × (1 + 10·eva)
        </pre>
        <p>
          Crit and evasion both scale the entire stat sum, so a small amount of
          either is worth a lot. Note that crit and eva are stored as decimals
          (0.05 = 5%), which is why the multiplier is{" "}
          <code>1 + 10·crit</code> rather than <code>1 + crit</code>.
        </p>

        <h3>2. Quality</h3>
        <p>
          Quality scales the final AP value linearly — it does not compound
          with crit or evasion.
        </p>
        <table className="explain-table">
          <thead>
            <tr>
              <th>Quality</th>
              {QUALITY_ORDER.map((q) => (
                <th key={q} className="num" style={{ color: QUALITY_COLOR[q] }}>
                  {q}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Multiplier</td>
              {QUALITY_ORDER.map((q) => (
                <td key={q} className="num">
                  {QUALITY_MULTIPLIER[q]}×
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        <h3>3. Enchantments</h3>
        <p>
          Every item has <strong>two enchant slots</strong>: an{" "}
          <em>element</em> slot (Fire, Water, Air, Earth, Light, Dark, plus
          "All" and Gold variants) and a <em>spirit</em> slot (Bear, Wolf,
          Bahamut, Ouroboros, and so on). You apply one of each — they stack,
          so the airship power gain from enchanting is the{" "}
          <strong>sum of both slots</strong>.
        </p>
        <p>
          Each enchant adds a flat number of airship-power points{" "}
          <em>per stat the item already has</em> (atk, def, or hp). The amount
          depends on tier and whether the enchant matches the item's affinity.
          An item with both atk and def gets the gain for each present stat,
          for each slot. The flat gain is then multiplied through the same{" "}
          <code>(1 + 10·crit) × (1 + 10·eva)</code> factor and the quality
          multiplier as the base.
        </p>

        <h3>4. Per-tier enchant points</h3>
        <p>
          Values are airship-power points added per stat at Common quality with
          crit/eva = 0. The "(match)" column is the affinity-matched value —
          roughly 1.5× the base.
        </p>
        <div className="explain-table-wrap">
          <table className="explain-table">
            <thead>
              <tr>
                <th>Stat</th>
                {ENCHANT_TIER_COLS.map((t) => (
                  <th key={t} className="num" colSpan={2}>
                    T{t}
                  </th>
                ))}
              </tr>
              <tr>
                <th></th>
                {ENCHANT_TIER_COLS.map((t) => (
                  <Fragment key={t}>
                    <th className="num explain-sub">base</th>
                    <th className="num explain-sub">match</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {(["atk", "def", "hp"] as const).map((stat) => (
                <tr key={stat}>
                  <td>{stat.toUpperCase()}</td>
                  {ENCHANT_TIER_COLS.map((t) => {
                    const row = ENCHANT_TABLE[stat][t];
                    return (
                      <Fragment key={t}>
                        <td className="num">{row.base}</td>
                        <td className="num explain-match">{row.match}</td>
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Item tiers between columns step down to the next-lower column. So a
          T15 or T16 item uses the T14 column, a T13 item uses T12, T11 uses
          T10, T8 uses T7, T6 uses T5, and so on. Items below T4 cannot be
          enchanted.
        </p>

        <h3>5. Spirit-slot tier tradeoff</h3>
        <p>
          A spirit enchant only exists at its family's fixed tier — Bear Spirit
          is T9, Bahamut Spirit is T14, and so on. The spirit slot is always
          filled (you can always apply a generic non-matching spirit at the
          item's tier for its base value), so the question is whether the{" "}
          <em>matching</em> spirit gives more or less AP than a non-matching
          one at the item's tier.
        </p>
        <p>
          For a T14 item whose only spirit affinity is a low-tier one (e.g.
          Bear T9), the spirit slot is better filled with a generic T14 spirit
          like Bahamut or Behemoth (131 atk-points, no affinity) than with the
          matching T9 Bear (58 atk-points × 1.5 affinity = 87). The ranker
          picks the higher-AP option. When the matching spirit is at the same
          tier as the item (e.g. Bahamut Sovereignty on a T14 weapon), the
          match always wins. Items whose spirit affinity is suboptimal still
          have the matching spirit listed as a small "or for the X skill"
          note, with the AP cost quoted — you may want it for the skill effect
          even when it's not BiS for airship power.
        </p>

        <h3>6. Affinity match bonus</h3>
        <p>
          The "(match)" values above are roughly 1.5× the base values — that's
          the bonus you get from matching the item's element or spirit. Items
          can have one elemental affinity, one spirit affinity, both, or
          neither. The "Match affinity" toggle on the controls bar assumes you
          pick the matching enchant whenever possible.
        </p>

        <h3>7. +20/25% Bonus Airship Power and artifact-skill boosts</h3>
        <p>
          A small number of items ({upgradeCount} in the current data) get an
          airship-power multiplier from one of two sources:
        </p>
        <ul>
          <li>
            <strong>Crafting / Starforged upgrade</strong> named{" "}
            <em>+20% Bonus Airship Power</em> or{" "}
            <em>+25% Bonus Airship Power</em>. Listed in the canonical
            Blueprints sheet and detected automatically by the data sync.
          </li>
          <li>
            <strong>Artifact skill</strong> — items unlocked from Artifact
            Chests carry a unique skill that the canonical Blueprints sheet
            doesn't expose. Wyrmbane Cannon, for example, has Meirika's
            Secret which grants +20% airship power. The mapping from item to
            artifact skill is hardcoded in <code>scripts/sync-data.ts</code>;
            additions land as users report in-game AP that exceeds the model
            by the right margin on an artifact item.
          </li>
        </ul>
        <p>
          Toggling on the +20/25% control multiplies that specific item's
          total AP by the listed percentage after the enchant gain has been
          added. All other items are unaffected.
        </p>

        <h3>8. Built-in enchants</h3>
        <p>
          Some blueprints ship with an enchant baked into one of their slots
          that can't be swapped — Mundra items always carry Mundra Spirit,
          Succubus Martyr ships with Oblivion Element, and so on. The stat
          contribution of those built-in enchants is{" "}
          <em>already folded into the item's listed base airship power</em>{" "}
          in the canonical data sheet, so the locked slot is worth 0
          additional AP. (Verified in-game against Mundra's Decree: base
          2334 + Oblivion non-match 262 = 2596 in-game, with no extra
          contribution from the Mundra spirit.) The ranker locks the
          affected slot, labels it{" "}
          <code>built-in · in base AP</code>, and only the un-locked slot
          can be enchanted for further gain.
        </p>

        <h3>9. Familiars</h3>
        <p>
          The canonical data sheet lists airship-power values for familiars,
          but in-game familiars don't actually contribute to the airship. The
          ranker excludes them from every category.
        </p>

        <h3>10. Top N per category</h3>
        <p>
          Each item is bucketed into one of four categories — Weapons, Body
          Armor, Misc Armor, Accessories — following the Dragon Invasion
          event's slot system, and ranked independently within its bucket. The
          "Top" control caps how many rows you see per category; ranks are
          stamped on the full bucket so they don't change when you scroll or
          filter.
        </p>

        <h3>11. Spirit families by tier</h3>
        <p>
          Quick reference: which tier each spirit family lives at. Some are
          inferred from in-game ordering rather than the verified reference
          list.
        </p>
        <ul className="explain-spirits">
          {spiritsByTier.map(([tier, families]) => (
            <li key={tier}>
              <span className="explain-spirit-tier">T{tier}:</span>{" "}
              {families.join(", ")}
            </li>
          ))}
        </ul>

        <h3>Data sources</h3>
        <p>
          Blueprints, enchant names, and affinities are synced daily from the
          community-maintained{" "}
          <a
            href="https://docs.google.com/spreadsheets/d/1WLa7X8h3O0-aGKxeAlCL7bnN8-FhGd3t7pz2RCzSg8c"
            target="_blank"
            rel="noreferrer"
          >
            Shop Titans data spreadsheet
          </a>
          . The base airship power formula above is verified against{" "}
          <a
            href="https://st-central.net/displayed-stat-calculations/"
            target="_blank"
            rel="noreferrer"
          >
            ST Central's displayed-stat reference
          </a>
          , and the per-tier enchant-power table comes from the{" "}
          <a
            href="https://st-central.net/dragon-invasion/"
            target="_blank"
            rel="noreferrer"
          >
            ST Central Dragon Invasion guide
          </a>{" "}
          (and its{" "}
          <a
            href="https://docs.google.com/spreadsheets/d/1eWZQ4SSqbMc0xLqDQQZwzZg5fU19Se8XnDdvdcMO3Aw"
            target="_blank"
            rel="noreferrer"
          >
            companion sheet
          </a>
          ), which are no longer being kept current — but the underlying values
          reflect stable game mechanics.
        </p>
      </div>
    </details>
  );
}
