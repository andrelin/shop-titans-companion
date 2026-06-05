import { useMemo, useState } from "react";
import type { Blueprint, GameData, Quality } from "../../data/types";
import { QUALITY_ORDER } from "../../data/types";
import { computePower, recommendEnchant } from "../../data/enchant";

type SortKey =
  | "rankedPower"
  | "basePower"
  | "enchantedPower"
  | "delta"
  | "tier"
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
  const [quality, setQuality] = useState<Quality>("Legendary");
  const [affinityMatched, setAffinityMatched] = useState(true);
  const [includeAirshipUpgrade, setIncludeAirshipUpgrade] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<"All" | Category>("All");
  const [minTier, setMinTier] = useState<number>(4);
  const [maxTier, setMaxTier] = useState<number>(15);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "rankedPower",
    dir: "desc",
  });
  const [rankedMode, setRankedMode] = useState<"enchanted" | "base">(
    "enchanted",
  );
  const [topPerCategory, setTopPerCategory] = useState<number>(20);

  // Compute power for every blueprint once per options change.
  const rows = useMemo<Row[]>(() => {
    const opts = {
      quality,
      affinityMatched,
      includeAirshipUpgrade,
    } as const;
    return data.blueprints
      .filter((b) => !(b.atk === 0 && b.def === 0 && b.hp === 0))
      .map((bp) => {
        const basePower = computePower(bp, { ...opts, enchanted: false });
        const enchantedPower = computePower(bp, { ...opts, enchanted: true });
        const rankedPower =
          rankedMode === "enchanted" ? enchantedPower : basePower;
        return {
          bp,
          basePower,
          enchantedPower,
          rankedPower,
          delta: enchantedPower - basePower,
        };
      });
  }, [
    data.blueprints,
    quality,
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
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Ranks every craftable item by airship power, with and without
        enchantments, applying the affinity bonus when the item has one. Each
        category (weapons, body armor, misc armor, accessories) is ranked
        independently so you can see how good an item is in its own slot.
      </p>

      <div className="controls">
        <div className="control">
          <label>Rank by</label>
          <select
            value={rankedMode}
            onChange={(e) =>
              setRankedMode(e.target.value as "enchanted" | "base")
            }
          >
            <option value="enchanted">Enchanted power</option>
            <option value="base">Unenchanted power</option>
          </select>
        </div>
        <div className="control">
          <label>Quality</label>
          <select value={quality} onChange={(e) => setQuality(e.target.value as Quality)}>
            {QUALITY_ORDER.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </div>
        <div className="control">
          <label>Category</label>
          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as "All" | Category)
            }
          >
            <option value="All">All categories</option>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="control">
          <label>Top per category</label>
          <select
            value={topPerCategory}
            onChange={(e) => setTopPerCategory(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={9999}>All</option>
          </select>
        </div>
        <div className="control">
          <label>Tier range</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="number"
              min={1}
              max={15}
              value={minTier}
              onChange={(e) => setMinTier(Number(e.target.value))}
              style={{ width: 60 }}
            />
            <span style={{ alignSelf: "center", color: "var(--muted)" }}>–</span>
            <input
              type="number"
              min={1}
              max={15}
              value={maxTier}
              onChange={(e) => setMaxTier(Number(e.target.value))}
              style={{ width: 60 }}
            />
          </div>
        </div>
        <div className="control" style={{ flex: 1, minWidth: 200 }}>
          <label>Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Item or type…"
          />
        </div>
        <div className="control">
          <label>&nbsp;</label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0" }}>
            <input
              type="checkbox"
              checked={affinityMatched}
              onChange={(e) => setAffinityMatched(e.target.checked)}
            />
            Match affinity enchant
          </label>
        </div>
        <div className="control">
          <label>&nbsp;</label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 0",
            }}
            title="A handful of items have a crafting/Starforged upgrade called '+20% Bonus Airship Power' or '+25% Bonus Airship Power'. Tick this to assume you've unlocked that upgrade on those items; every other item is unaffected."
          >
            <input
              type="checkbox"
              checked={includeAirshipUpgrade}
              onChange={(e) => setIncludeAirshipUpgrade(e.target.checked)}
            />
            Apply +20/25% Bonus Airship Power upgrade (10 items)
          </label>
        </div>
      </div>

      {filteredByCategory.map(({ category, rows: catRows }) => {
        const visible = localSort(catRows).slice(0, topPerCategory);
        return (
          <section key={category} style={{ marginBottom: 32 }}>
            <h2 style={{ margin: "12px 0 8px", fontSize: 15 }}>
              {category}
              <span
                className="tag"
                style={{ marginLeft: 10, verticalAlign: "middle" }}
              >
                {catRows.length} items
              </span>
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>#</th>
                    <th aria-sort={ariaSort("name")} onClick={() => setSortKey("name")}>
                      Item
                    </th>
                    <th aria-sort={ariaSort("type")} onClick={() => setSortKey("type")}>
                      Type
                    </th>
                    <th aria-sort={ariaSort("tier")} onClick={() => setSortKey("tier")}>
                      Tier
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
                    const hasMatch = rec.affinityTargets.length > 0;
                    return (
                      <tr key={r.bp.name}>
                        <td
                          className="num"
                          style={{
                            color:
                              r.categoryRank <= 3
                                ? "var(--accent)"
                                : "var(--muted)",
                            fontWeight: r.categoryRank <= 3 ? 600 : 400,
                          }}
                        >
                          {r.categoryRank}
                        </td>
                        <td>{r.bp.name}</td>
                        <td>{r.bp.type}</td>
                        <td className="num">{r.bp.tier}</td>
                        <td className="num">{formatNumber(r.basePower)}</td>
                        <td className="num">
                          {formatNumber(r.enchantedPower)}
                        </td>
                        <td className="num">
                          <span className={r.delta > 0 ? "tag gain" : "tag"}>
                            +{formatNumber(r.delta)}
                          </span>
                        </td>
                        <td>
                          {rec.tier === null ? (
                            <span className="tag">no enchant available</span>
                          ) : (
                            <>
                              <span style={{ color: "var(--muted)" }}>
                                T{rec.tier}
                              </span>{" "}
                              <strong
                                style={{
                                  color: hasMatch ? "var(--accent)" : undefined,
                                }}
                              >
                                {hasMatch
                                  ? rec.affinityTargets.join(" or ")
                                  : "any"}
                              </strong>
                              {hasMatch ? (
                                <span
                                  className="tag gain"
                                  style={{ marginLeft: 6 }}
                                >
                                  {rec.source === "spirit" ||
                                  rec.source === "built-in spirit"
                                    ? "spirit match"
                                    : "affinity match"}
                                </span>
                              ) : (
                                <span
                                  className="tag"
                                  style={{ marginLeft: 6 }}
                                >
                                  no affinity bonus
                                </span>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {visible.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>
                No items match the current filters in {category}.
              </p>
            ) : catRows.length > visible.length ? (
              <p style={{ color: "var(--muted)", fontSize: 12 }}>
                Showing top {visible.length} of {catRows.length}.
              </p>
            ) : null}
          </section>
        );
      })}
    </>
  );
}
