import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { Blueprint, GameData, Quality } from "../../data/types";
import { QUALITY_COLOR, QUALITY_MULTIPLIER, QUALITY_ORDER } from "../../data/types";
import {
  computePower,
  ELEMENT_TABLE,
  SPIRIT_TABLE,
  ENCHANT_TIERS,
  recommendEnchant,
  spiritFamily,
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
  // Whether the +25% Starforged boost was applied to this row's AP (item has
  // the milestone AND it's either globally on or marked unlocked for this item).
  starforged: boolean;
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function DragonInvasion({ data }: { data: GameData }) {
  const [selectedQualities, setSelectedQualities] = useState<Quality[]>([
    "Common",
  ]);
  const [includeAirshipUpgrade, setIncludeAirshipUpgrade] = useState(true);
  // Global Starforged switch: when on, every item that has the +25% milestone
  // gets the boost. When off, only the items the player has individually marked
  // as unlocked (below) get it — Starforged is a per-item late-game unlock, so
  // most players only have a handful.
  const [includeStarforgedStatBoosts, setIncludeStarforgedStatBoosts] =
    useState(false);
  // Per-item Starforged unlocks, keyed by item name, persisted to localStorage
  // so the player's roster survives reloads.
  const [starforgedUnlocked, setStarforgedUnlocked] = useState<Set<string>>(
    () => {
      try {
        const raw = localStorage.getItem("sf-unlocked");
        return raw ? new Set<string>(JSON.parse(raw)) : new Set();
      } catch {
        return new Set();
      }
    },
  );
  useEffect(() => {
    try {
      localStorage.setItem(
        "sf-unlocked",
        JSON.stringify([...starforgedUnlocked]),
      );
    } catch {
      /* localStorage unavailable — selection just won't persist */
    }
  }, [starforgedUnlocked]);
  const toggleStarforged = useCallback((name: string) => {
    setStarforgedUnlocked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);
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
  // Distinct item tiers present in the data, descending — for the "cap items
  // at Tn" dropdown. Like the enchant cap, we only constrain the *max* tier.
  const itemTiers = useMemo(() => {
    const s = new Set(data.blueprints.map((b) => b.tier));
    return [...s].sort((a, b) => b - a);
  }, [data.blueprints]);
  // How many items actually carry a +X% Bonus Airship Power upgrade / qualifying
  // artifact skill — shown in the toggle so it's clear it affects only a few.
  const airshipUpgradeCount = useMemo(
    () => data.blueprints.filter((b) => b.airshipPowerUpgradeBonus > 0).length,
    [data.blueprints],
  );
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
      // The +25% Starforged boost applies to this item if it has the milestone
      // and either the global switch is on or the player marked it unlocked.
      const starforged =
        !!bp.starforgedStatBoosts &&
        (includeStarforgedStatBoosts || starforgedUnlocked.has(bp.name));
      for (const quality of qualitiesInOrder) {
        const opts = {
          quality,
          // Always assume the player picks the affinity-matching enchant — the
          // ranker is about best-case airship power, and a matching enchant is
          // never worse than a generic one.
          affinityMatched: true,
          includeAirshipUpgrade,
          includeStarforgedStatBoosts: starforged,
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
          starforged,
        });
      }
    }
    return out;
  }, [
    data.blueprints,
    selectedQualities,
    includeAirshipUpgrade,
    includeStarforgedStatBoosts,
    starforgedUnlocked,
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
        if (r.bp.tier > maxTier) return false;
        if (
          q &&
          !r.bp.name.toLowerCase().includes(q) &&
          !r.bp.type.toLowerCase().includes(q)
        )
          return false;
        return true;
      }),
    }));
  }, [ranked, categoryFilter, maxTier, search]);

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
        {/* Row 1 — qualities to include */}
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
        </div>

        {/* Row 2 — view + cap dropdowns */}
        <div className="controls-row">
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
            value={maxTier}
            onChange={(e) => setMaxTier(Number(e.target.value))}
            aria-label="Max item tier"
            title="Highest item tier to include. Defaults to all items; cap it lower to hide higher-tier items you can't craft yet."
          >
            <option value={dataMaxTier}>All items (up to T{dataMaxTier})</option>
            {itemTiers
              .filter((t) => t < dataMaxTier)
              .map((t) => (
                <option key={t} value={t}>
                  Cap items at T{t}
                </option>
              ))}
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

          <input
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            aria-label="Search items"
          />
        </div>

        {/* Row 3 — optional power assumptions */}
        <div className="controls-row secondary">
          <label
            className="toggle"
            title={`A few items (${airshipUpgradeCount} in the data) can be crafted with a "Bonus Airship Power" upgrade, or carry an artifact skill like Meirika's Secret, that multiplies just that item's airship power by +20% or +25%. When on, the ranking adds that bonus for those items; every other item is unchanged.`}
          >
            <input
              type="checkbox"
              checked={includeAirshipUpgrade}
              onChange={(e) => setIncludeAirshipUpgrade(e.target.checked)}
            />
            <span>
              Apply +20/25% Bonus Airship Power ({airshipUpgradeCount} items)
            </span>
          </label>
          <label
            className="toggle"
            title="Starforged is a per-item late-game unlock (+25% base ATK/DEF/HP). ON = assume you have it on every item that can take it. OFF = only the items you've marked with the ★ star in the list get the boost. Either way, boosted rows are highlighted and items without the milestone are unaffected."
          >
            <input
              type="checkbox"
              checked={includeStarforgedStatBoosts}
              onChange={(e) =>
                setIncludeStarforgedStatBoosts(e.target.checked)
              }
            />
            <span>+25% Starforged on all items</span>
          </label>
          {!includeStarforgedStatBoosts && (
            <span className="controls-hint">
              {starforgedUnlocked.size > 0
                ? `or ★-marked per item (${starforgedUnlocked.size} unlocked)`
                : "or mark items with the ★ star as you unlock them"}
            </span>
          )}
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
                {/* Shared fixed column widths so every category table aligns
                    (each category is its own <table>). */}
                <colgroup>
                  <col style={{ width: "4%" }} />
                  <col style={{ width: "21%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "19%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="col-center">#</th>
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
                      <tr
                        key={`${r.bp.name}::${r.quality}`}
                        className={r.starforged ? "starforged-row" : undefined}
                      >
                        <td className={rankClass}>{r.categoryRank}</td>
                        <td className="item-name">
                          <span className="item-name-text">
                            {r.bp.name}
                            {r.bp.starforgedStatBoosts ? (
                              <button
                                type="button"
                                className={`sf-star${r.starforged ? " on" : ""}`}
                                disabled={includeStarforgedStatBoosts}
                                onClick={() => toggleStarforged(r.bp.name)}
                                aria-label={
                                  r.starforged
                                    ? "Starforged unlocked"
                                    : "Mark Starforged unlocked"
                                }
                                title={
                                  includeStarforgedStatBoosts
                                    ? "Starforged is applied to every item via the global toggle. Turn that off to pick per item."
                                    : starforgedUnlocked.has(r.bp.name)
                                      ? "Starforged unlocked — this item's AP includes +25% base ATK/DEF/HP. Click to remove."
                                      : "Mark this item's Starforged milestone unlocked, so its AP includes the +25% boost."
                                }
                              >
                                {r.starforged ? "★" : "☆"}
                              </button>
                            ) : null}
                          </span>
                          <ItemBonuses bp={r.bp} />
                        </td>
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

// Per-item bonus badges, shown under the item name so players can see at a
// glance which affinities an item can match and which AP-affecting bonuses it
// carries — without cross-referencing the data sheet. Sourced entirely from
// the synced Blueprint fields; nothing here is hand-authored.
function ItemBonuses({ bp }: { bp: Blueprint }) {
  const chips: { key: string; cls: string; label: string; title: string }[] = [];

  for (const el of bp.elementalAffinity) {
    chips.push({
      key: `el-${el}`,
      cls: "bonus-chip bonus-element",
      label: el,
      title: `Elemental affinity: a matching ${el} element enchant gets the higher "(match)" stat bonus.`,
    });
  }
  for (const sp of bp.spiritAffinity) {
    chips.push({
      key: `sp-${sp}`,
      cls: "bonus-chip bonus-spirit",
      label: spiritFamily(sp),
      title: `Spirit affinity (${sp}): a matching ${spiritFamily(sp)} spirit gets the "(match)" bonus when its tier is worth it over a generic spirit.`,
    });
  }
  for (const el of bp.builtInElement) {
    chips.push({
      key: `bie-${el}`,
      cls: "bonus-chip bonus-builtin",
      label: `🔒 ${el}`,
      title: `Built-in ${el}: baked into the blueprint, already in the base AP. The element slot can't be re-enchanted.`,
    });
  }
  for (const sp of bp.builtInSpirit) {
    chips.push({
      key: `bis-${sp}`,
      cls: "bonus-chip bonus-builtin",
      label: `🔒 ${sp}`,
      title: `Built-in ${sp}: baked into the blueprint, already in the base AP. The spirit slot can't be re-enchanted.`,
    });
  }
  // Note: the +25% Base ATK/DEF/HP Starforged Milestone is deliberately *not*
  // badged here — ~56% of items carry it, so a per-item badge is noise. It's a
  // global assumption controlled by the "+25% Starforged stat boost" toggle.
  if (bp.airshipPowerUpgradeBonus > 0) {
    chips.push({
      key: "apu",
      cls: "bonus-chip bonus-apu",
      label: bp.artifactSkillName
        ? `+${Math.round(bp.airshipPowerUpgradeBonus * 100)}% AP · ${bp.artifactSkillName}`
        : `+${Math.round(bp.airshipPowerUpgradeBonus * 100)}% Airship Power`,
      title: bp.artifactSkillName
        ? `Artifact skill ${bp.artifactSkillName} grants +${Math.round(bp.airshipPowerUpgradeBonus * 100)}% airship power. Counts toward AP only when the "+20/25% Bonus AP" toggle is on.`
        : `Has a +${Math.round(bp.airshipPowerUpgradeBonus * 100)}% Bonus Airship Power upgrade. Counts toward AP only when the "+20/25% Bonus AP" toggle is on.`,
    });
  }

  if (chips.length === 0) {
    return <span className="item-bonuses item-bonuses-none">no affinity</span>;
  }
  return (
    <span className="item-bonuses">
      {chips.map((c) => (
        <span key={c.key} className={c.cls} title={c.title}>
          {c.label}
        </span>
      ))}
    </span>
  );
}

// Tier columns in the enchant table. Items between columns step down to the
// next-lower column (the convention from the Dragon Invasion reference sheet).
const ENCHANT_TIER_COLS = [4, 5, 7, 9, 10, 12, 14] as const;

// Renders a base/match table for one enchant kind (element or spirit). The
// values come straight from `ELEMENT_TABLE` / `SPIRIT_TABLE`, which are derived
// from the synced enchant blueprints — match = floor(1.5 × base).
function EnchantStatTable({
  title,
  table,
}: {
  title: string;
  table: Record<"atk" | "def" | "hp", Record<number, { base: number; match: number }>>;
}) {
  return (
    <div className="explain-table-wrap">
      <div className="explain-subtitle">{title}</div>
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
                const row = table[stat][t];
                return (
                  <Fragment key={t}>
                    <td className="num">{row?.base ?? "—"}</td>
                    <td className="num explain-match">{row?.match ?? "—"}</td>
                  </Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExplainPanel({ blueprints }: { blueprints: Blueprint[] }) {
  // The full list of items that carry a +X% Bonus Airship Power upgrade or a
  // qualifying artifact skill — small enough to enumerate, so we do.
  const apBonusItems = useMemo(
    () =>
      blueprints
        .filter((b) => b.airshipPowerUpgradeBonus > 0)
        .sort(
          (a, b) =>
            b.airshipPowerUpgradeBonus - a.airshipPowerUpgradeBonus ||
            a.name.localeCompare(b.name),
        ),
    [blueprints],
  );
  const upgradeCount = apBonusItems.length;

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
          Quality multiplies the item's base <strong>stats</strong> (atk / def
          / hp) by the factor below. Those scaled stats are then rounded to
          whole numbers before the AP formula runs — the game stores integer
          stats — so the final AP is close to, but not exactly, a linear
          scaling of the Common value (the rounding shifts it by a point or
          two). Crit and evasion scale by the same factor and do not compound.
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
          Each enchant adds a flat number of <em>stat points</em>{" "}
          <em>per stat the item already has</em> (atk, def, or hp), and the AP
          formula then runs on the boosted stats. The amount depends on tier
          and whether the enchant matches the item's affinity. An item with
          both atk and def gets the gain for each present stat, for each slot.
        </p>
        <p>
          One important cap: each enchant's stat boost is{" "}
          <strong>limited to the item's own base value</strong> for that stat,
          per slot. A T1 sword with 16 atk gains only +16 atk from a T14
          enchant that would otherwise add 164 — you can't enchant a stat past
          doubling it per slot. This is why low-stat items gain less from
          enchanting than the raw tier table suggests.
        </p>

        <h3>4. Per-tier enchant stats</h3>
        <p>
          These are the flat stat points an enchant adds per stat, read straight
          from each enchant's own blueprint. The "(match)" column is the
          affinity-matched value — exactly <code>floor(1.5 × base)</code>.
          Elements and spirits share the same stats at most tiers, but{" "}
          <strong>spirits are slightly higher at T4 and T7</strong>, and a few
          event spirits (Tiger, Christmas, Krampus, Kirin) are buffed one notch
          above the standard for their tier.
        </p>
        <EnchantStatTable title="Element enchants" table={ELEMENT_TABLE} />
        <EnchantStatTable title="Spirit enchants (standard)" table={SPIRIT_TABLE} />
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
          The "(match)" values above are <code>floor(1.5 × base)</code> — the
          bonus you get from matching the item's element or spirit. Items can
          have one elemental affinity, one spirit affinity, both, or neither;
          an item's affinities are shown as chips under its name in the table.
          The ranker always assumes you apply the affinity-matching enchant
          where it helps (a match is never worse than a generic enchant).
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
          added. All other items are unaffected. The full list ({upgradeCount}{" "}
          items):
        </p>
        <ul className="explain-ap-list">
          {apBonusItems.map((b) => (
            <li key={b.name}>
              <strong>{b.name}</strong>{" "}
              <span className="explain-ap-pct">
                +{Math.round(b.airshipPowerUpgradeBonus * 100)}%
              </span>{" "}
              <span className="explain-ap-src">
                ({b.type}
                {b.artifactSkillName
                  ? ` · ${b.artifactSkillName}`
                  : " · crafting/Starforged upgrade"}
                )
              </span>
            </li>
          ))}
        </ul>

        <h3>8. Starforged Milestone: +25% base ATK/DEF/HP</h3>
        <p>
          Separate from the Bonus Airship Power upgrade above, many recipes
          (about half the items in the data) have a{" "}
          <strong>Starforged Milestone</strong> that adds{" "}
          <em>+25% to base ATK, DEF and HP</em>. It's a per-item late-game
          unlock, so you control it two ways: the{" "}
          <em>+25% Starforged on all items</em> toggle assumes you have it
          everywhere it's available, and — with that toggle off — the{" "}
          <strong>★ star</strong> on each eligible row lets you mark just the
          items you've actually unlocked (saved in your browser). Either way,
          rows with the boost applied are highlighted, and items without the
          milestone are unaffected.
        </p>
        <p>
          This boost applies to the <strong>base stats plus the enchant
          stats together</strong> — not just the base — and there are two
          rounding steps: the quality-scaled base+enchant stat is rounded to a
          whole number first, then the +25% is applied and the result rounded
          again. For example, a Ghostbusters Suit (690 def, no affinity) with
          two non-matching T14 enchants shows 908 def un-starforged (AP 1634)
          and <code>round(908 × 1.25) = 1135</code> def starforged (AP 2043).
          Verified exact at Common quality. The interaction with higher
          qualities is verified for the unenchanted case (a Superior starforged
          item rounds twice: <code>round(base × 1.25)</code> then{" "}
          <code>round(× 1.25)</code>), and treated as best-effort for enchanted
          Superior+ until more in-game readings pin it.
        </p>

        <h3>9. Built-in enchants</h3>
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

        <h3>10. Familiars</h3>
        <p>
          The canonical data sheet lists airship-power values for familiars,
          but in-game familiars don't actually contribute to the airship. The
          ranker excludes them from every category.
        </p>

        <h3>11. Top N per category</h3>
        <p>
          Each item is bucketed into one of four categories — Weapons, Body
          Armor, Misc Armor, Accessories — following the Dragon Invasion
          event's slot system, and ranked independently within its bucket. The
          "Top" control caps how many rows you see per category; ranks are
          stamped on the full bucket so they don't change when you scroll or
          filter.
        </p>

        <h3>12. Spirit families by tier</h3>
        <p>
          Quick reference: which tier each spirit family lives at. Read directly
          from each spirit's blueprint, so these are authoritative.
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
          . The per-tier enchant stats and spirit tiers are read directly from
          the enchant blueprints in that same sheet (each enchant is a craftable
          item with its own tier and base stats), so they stay authoritative and
          update with the daily sync.
        </p>
      </div>
    </details>
  );
}
