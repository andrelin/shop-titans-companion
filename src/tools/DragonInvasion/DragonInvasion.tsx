import { useMemo, useState } from "react";
import type { Blueprint, GameData, Quality } from "../../data/types";
import { QUALITY_COLOR, QUALITY_ORDER } from "../../data/types";
import { computePower, recommendEnchant } from "../../data/enchant";

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
            title="A handful of items have a crafting or Starforged upgrade called '+20% Bonus Airship Power' or '+25% Bonus Airship Power'. Tick this to assume you've unlocked it on those items; every other item is unaffected."
          >
            <input
              type="checkbox"
              checked={includeAirshipUpgrade}
              onChange={(e) => setIncludeAirshipUpgrade(e.target.checked)}
            />
            <span>+20/25% Airship upgrade</span>
          </label>
        </div>
      </div>

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
                    const rec = recommendEnchant(r.bp);
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
                          {rec.elementTier === null &&
                          rec.spirits.length === 0 ? (
                            <span className="tag">no enchant available</span>
                          ) : (
                            <div className="enchant-cell">
                              {/* Element line — always shown */}
                              {rec.elementTier !== null ? (
                                <span>
                                  <span className="label">
                                    T{rec.elementTier} element
                                  </span>{" "}
                                  {rec.elementTargets.length > 0 ? (
                                    <strong>
                                      {rec.elementTargets.join(" or ")}
                                    </strong>
                                  ) : (
                                    <span className="enchant-any">
                                      any (no affinity)
                                    </span>
                                  )}
                                </span>
                              ) : null}
                              {/* Spirit line — always shown */}
                              {rec.spirits.length > 0 ? (
                                rec.spirits.map((sp, i) => (
                                  <span key={i}>
                                    <span className="label">
                                      {sp.tier !== null
                                        ? `T${sp.tier} spirit`
                                        : "spirit"}
                                    </span>{" "}
                                    <strong>{sp.family}</strong>
                                  </span>
                                ))
                              ) : (
                                <span>
                                  <span className="label">spirit</span>{" "}
                                  <span className="enchant-any">
                                    any (no affinity)
                                  </span>
                                </span>
                              )}
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
