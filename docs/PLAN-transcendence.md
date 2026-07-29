# Plan: Transcendence improvements support

Shop Titans added a **Transcendence** upgrade path to blueprints.
After an item's Ascension is complete, the player spends **Transcendence Seals** (and Ascension Shards) to unlock up to
**three upgrade slots** per item, in order.
Most AP-relevant items have two flat stat adds and one `+X% Base ATK, DEF and HP` multiplier across the three slots;
some slots are economy upgrades (`Quality Chance x2`, multicraft, craft-time) that do not affect airship power.

Unlike Starforged — which is gated by a *random* recipe drop, so each player's set is arbitrary and we track it per-item with a binary ★ —
Transcendence is a *deliberate* late-game spend, but seals are rare, so most players transcend only a handful of items and grow that set slowly.
**Crucially, each unlocked level can move an item's airship power**, so we must track *how many* of the three slots are unlocked (0/1/2/3),
not just a binary flag.

## Implementation status

| Phase | Scope | Status |
| --- | --- | --- |
| 1. Data layer | Parse the three Transcendence columns (+ seal costs) into typed, ordered upgrades | ✅ DONE |
| 1b. Acquisition data + badge | Parse unlock/antique data; 3-state premium/antiques/chest badge in the Dragon Invasion table | ✅ DONE |
| 2. Calibration | Collect in-game AP readings to pin the power-model math | ⏳ PENDING (needs user readings) |
| 3. Power model | Integrate Transcendence into `computePower`, calibrated + tested | ⏳ PENDING (blocked on Phase 2) |
| 4. UI | Per-item 0–3 level control + global toggle, badges, explainer | ⏳ PENDING (blocked on Phase 3) |
| 5. Docs & tests | Pin every reading in `enchant.test.ts`; update `data-points.md` + explainer | ⏳ PENDING (rolls with Phases 3–4) |
| 6. Seal recommender tool | New tool: rank airship-worthy items by AP-per-seal for scarce seals | ⏳ PENDING (blocked on Phase 3) |

## Phase 1 — Data layer ✅ DONE

Faithful parse only; no AP interpretation. Landed in this change:

- `scripts/sync-data.ts`:
  - `COL.transcendenceUpgrade = [83, 85, 87]` (the "Transcendence Upgrade 1/2/3" columns; "Seals Needed" in 84/86/88 is ignored for AP).
  - Header sanity check extended: `[COL.transcendenceUpgrade[0], "Transcendence Upgrade 1"]` — sync throws if the upstream sheet shifts columns.
  - `parseTranscendence(slots, sealCosts): TranscendenceUpgrade[]` classifies each present slot and records its seal cost:
    - `+X% Base ATK, DEF and HP` → `{ kind: "pctBase", pct: X/100 }`
    - `ATK|DEF|HP +N` → `{ kind: "stat", stat, amount: N }` (flat points)
    - `CRIT|EVA +N%` → `{ kind: "stat", stat, amount: N/100 }` (decimal, matching how the Blueprint stores crit/eva)
    - anything else → `{ kind: "other" }` (economy upgrade; occupies the slot, no AP)
    - every slot also carries `seals` (from the "Seals Needed" column, `COL.transcendenceSeals = [84,86,88]`) —
      the denominator for the AP-per-seal recommender.
  - Absent slots (sheet `---`) are dropped, so a level-N player maps to the first N *present* upgrades.
- Seal costs scale steeply with tier (5 → 140 per slot; a T16 slot is 140). **Open question:** is the per-slot "Seals Needed"
  marginal or cumulative? Confirm before trusting AP-per-seal denominators (Phase 6).
- `src/data/types.ts`: added the `TranscendenceUpgrade` discriminated union and `Blueprint.transcendence?: TranscendenceUpgrade[]`.
- `data/blueprints.json` regenerated — all 1571 items now carry `transcendence`.

`computePower` still ignores `transcendence` — the field is data only until Phase 3.

### What the data revealed (feeds Phase 2 questions)

Sample parses:

- **Ghostbusters Suit** (def 690, hp 0): `DEF +173`, `HP +69`, `+10% Base` — a flat add introduces **hp on a def-only item**.
- **Squire Sword** (atk 16): `ATK +2`, `DEF +1`, `+10% Base` — a flat add introduces **def on an atk-only item**.
- **Wyrmbane Cannon** (atk 1600, hp 50): `ATK +160`, `HP +50`, `+10% Base`.
- The `pctBase` slot is almost always `+10%`, but ~20 special items step from `+11%` up to `+30%`.

## Phase 2 — Calibration ⏳ PENDING

The calibration policy (`CLAUDE.md`) forbids guessing the math or fabricating item data.
Every number below must come from an in-game reading before Phase 3 writes model code.

### Open questions (each maps to a reading)

1. **Do flat adds scale with quality?** Is `ATK +2` a flat +2 at every quality, or +2×(quality multiplier)?
   → Read the same transcended item at Common and at a higher quality.
2. **Do flat adds create stats the item lacks?** Does Ghostbusters Suit's `HP +69` actually give it 69 hp (contributing `5×69` to AP)?
   And can that added stat then be enchanted / capped?
   → Read Ghostbusters Suit unenchanted at the level that includes the HP slot.
3. **Where does `+X% Base` apply?** Base only, base+flat, or base+flat+enchant? Does it stack multiplicatively with the Starforged `+25%`?
   → Read an item that has both Starforged and Transcendence unlocked, with and without enchants.
4. **Order vs the enchant cap.** The enchant per-slot cap is `min(enchantValue, itemBaseStat)`.
   Does "item base stat" for the cap include the transcendence flat add?
5. **Rounding.** Starforged uses two round-half-up steps (stat-round, then boost-round).
   Confirm Transcendence's `+X% Base` uses the same rounding discipline.

### Current player state (2026-07-29)

Player has transcended **nothing** yet and holds **230 seals**; a single T15/T16 slot costs 130–140, so the budget buys
essentially one high-tier level. Seals are *very* rare, so the first spend must be both the wisest AP buy **and** the
calibration reading — there is no separate "cheap test item" budget. The player compares at **Common** (confirmed: the model
reproduces their Obsidian Lava Cake 2190 and Chapter Cauchemar 2932 exactly at Common).

Confirmed owned (both premium T15 pack items): **Chapter Cauchemar** (Accessories leader, 2932) and **Obsidian Lava Cake**
(2190). **Chose not to buy** Heaume of the Mightiest (premium — was purchasable, declined), so despite topping the raw
net/seal list it must not be recommended. Ownership is a player choice, not derivable from the data — see the filter below.

### First reading = first wise owned buy: Chapter Cauchemar

Heaume topped the raw net/seal list but is unobtainable, so the pick among **owned** items is **Chapter Cauchemar**
(Spell, T15; atk 2190, def 438, Dark affinity):

- Slot 1 = `ATK +219` for **130 seals**, on **native** atk (no new-stat confound). Estimated Common net gain **+175**
  (2932 → 3107), banked regardless of the cap question because it is already the Accessories leader. Leaves 100 seals.
- Alternative, more *decisive* reading: **Obsidian Lava Cake** slot 1 `HP +126` (130 seals). The model estimates it reaches
  **3135**, leapfrogging Chapter Cauchemar (2932) — but only if flat adds raise the enchant cap. The reading settles that
  directly (≈3135 → cap-inclusive; ≈2820 → not), at the risk of the spend being wasted if it stays behind.

Ask the player to report, for the transcended item: *element + spirit enchants · AP immediately before and immediately after
unlocking slot 1, at Common* (enchants held constant so the delta isolates transcendence; add Superior/Flawless if easy).
That pins question 1 (flat-add value), 4 (enchant-cap interaction), and 5 (rounding). Pair with a later reading on an item
where the flat add creates a *new* stat (e.g. Ghostbusters Suit `HP +69` on def-only) for question 2.

## Phase 3 — Power model ⏳ PENDING (blocked on Phase 2)

Extend `src/data/enchant.ts`:

- `PowerOptions` gains `transcendenceLevel: number` (0–3; 0 = none).
- A helper resolves the active upgrades: `activeTranscendence(b: Blueprint, level: number): TranscendenceUpgrade[]`
  → `b.transcendence?.filter(u => u.slot <= level) ?? []`.
- In `computePower`, apply — in the order Phase 2 pins — the flat `stat` adds (atk/def/hp/eva/crit) and the `pctBase` multiplier,
  slotting them correctly relative to quality scaling, the enchant cap, the Starforged boost, and the two rounding steps.
- Every decision (pre/post-quality, new-stat handling, stacking with Starforged) gets an inline comment citing the reading that proves it,
  exactly like the existing Starforged comments.

## Phase 4 — UI ⏳ PENDING (blocked on Phase 3)

`src/tools/DragonInvasion/DragonInvasion.tsx`, mirroring the Starforged UX but with a 0–3 level instead of a binary:

- Per-item **level control** (0/1/2/3) on each eligible row,
  persisted to `localStorage` (e.g. key `transcendence-levels`, a `Record<string, number>`),
  paralleling the existing `starforgedUnlocked` set + `toggleStarforged`.
- A global **"assume max Transcendence" toggle** (like `includeStarforgedStatBoosts`) that overrides per-item levels to 3 where slots exist.
- Row highlight + a stat badge showing the active level's effect; extend `ItemBonuses` if a per-item chip helps.
- Extend the "How airship power is calculated" `ExplainPanel` with a Transcendence section (kept in sync per the calibration policy).

Possible future refinement (not v1): track which *specific* slots are unlocked when a player unlocks out of strict 1→2→3 order —
assumed sequential for now; confirm during Phase 2.

## Phase 5 — Docs & tests ⏳ PENDING (rolls with Phases 3–4)

- Add a pinned case to `src/data/enchant.test.ts` for **every** Transcendence reading, `.toBe(<exact>)`.
- Add the readings to the verified table in `docs/data-points.md` (alphabetical), and document the confirmed mechanics in
  "What the model is grounded on".
- Add `transcendence` to `DIFF_FIELDS` in `scripts/sync-data.ts` (and teach `fieldToText` to `JSON.stringify` object arrays)
  so the changelog tracks Transcendence rebalances once the ranker consumes the field.
- Re-read the in-app explainer and per-item badges; confirm every statement matches the calibrated model.

## Phase 6 — Transcendence Seal Recommender (new tool) ⏳ PENDING (blocked on Phase 3)

A new tool under `src/tools/TranscendenceRecommender/`, registered in the `TOOLS` array in `src/App.tsx`.
Answers: **"seals are scarce — which item (and which slot) should I transcend next for the most airship power?"**

### Ranking model (v1)

Pure airship-power, factoring Starforged. The metric is **not** an item's transcendence gain in isolation — that was the
initial mistake. What matters is the **net improvement to the fielded airship lineup**, because the airship slots are filled
per Dragon Invasion category and you would field the best *free* (non-transcended) item anyway. Concretely:

1. **Compare within the airship category.** Bucket items with the same `TYPE_TO_CATEGORY` map as `DragonInvasion.tsx`
   (Weapons / Body Armor / Misc Armor / Accessories). Within a category, the fielded item is the best-AP one you own.
2. **Value = net lineup gain, not raw gain.** For each item and affordable level compute
   `netGain = max(0, transcendedAP − freeCategoryLeaderAP)` where `freeCategoryLeaderAP` is the best *non-transcended* AP you
   own in that category. The current leader scores its own full transcendence gain (it is already fielded); a non-leader
   scores only the amount it clears the free leader by. **Evaluate every airship-worthy item, not just the leaders** — because
   per-item improvements vary enormously (different flat-add sizes, stat types, and seal costs), non-leaders frequently
   *leapfrog* the free leader. Empirically (Common, ≤230 seals) the 2nd-best play was a non-leader: Starlight Raiments L2
   reaches 2426, beating the free Body Armor leader (1903) by +523. So "transcend your leaders" is a good first heuristic but
   pruning to leaders up front would miss the best buys.
3. **Opportunity cost, not just net-vs-free.** When *ranking which item to spend a fixed budget on*, compare candidates
   against the **best alternative use of the same seals**, not only against the free baseline. Example: OLC-L1 reaches 3135
   vs the free Accessories leader 2932 (+203) — but spending those same 130 seals on the leader gives CC-L1 = 3107, so the
   real edge of choosing OLC over CC is only **+28**, not +203. So v1 is a small **budget allocation**: for each category find
   the item+level that maximises the fielded AP for the seals, then allocate the budget across categories by marginal gain.
4. **Then AP-per-seal**, among the leader/leapfrog candidates, using the calibrated model and `computePower` with
   `transcendenceLevel`. Show marginal per-slot efficiency **and** absolute net gain.

**Key insight — transcendence value is driven by stat weight, not raw AP rank.** The AP formula weights HP `5×`, DEF `1.2×`,
ATK `0.8×`, and crit/eva multiply the whole sum. So a flat HP add on a high-eva item is worth far more per point than a flat
ATK add on a huge-ATK item — e.g. OLC's `HP +126` = **+945** (5 × 126 × 1.5 eva) while CC's `ATK +219` = **+175** (0.8 × 219,
no multiplier). Decomposition confirmed this is the *flat add itself*, **not** an enchant-cap interaction (that was +0 for
both), so the leapfrog is a robust prediction, not an artifact of the unresolved Q4. The best transcendence targets (high-HP
and/or crit/eva items) are a *different ordering* than the free-AP leaderboard — the recommender must compute, not eyeball.

**Donation quality range.** Players donate **Common / Superior / Flawless** to the airship and sell Epic/Legendary for gems,
so evaluate over C/S/F and default the comparison to **Common** (matches how the community ranks and how the player reads the
numbers; at Common q=1 the flat-add slots are also exact — the cleanest calibration basis). But **still surface Epic/Legendary
numbers** — some players *do* donate them, and the tool must inform that choice rather than assume it (the Dragon Invasion tool
already exposes all five qualities via its quality checkboxes; the recommender should match).

**Factor in Starforged:** the `+X% Base` transcendence slot and the Starforged `+25%` both scale base stats, so a candidate's
transcendence gain depends on its Starforged state. The tool reads the same per-item Starforged unlocks the Dragon Invasion
tool already tracks (`localStorage` key `sf-unlocked`) plus the global assumption toggle, so the two tools stay consistent.

**Inputs:** the player's available seal budget (to show "what your seals can buy right now" — with steep, escalating slot
costs, budget changes the answer), the Starforged state above, and the donation quality (default Common).

### Ownership / availability filter (essential)

The best airship items are overwhelmingly **premium pack items**, so recommending items the player can't or didn't buy is
worse than useless — it wastes their rarest resource. And ownership **cannot be inferred**: the player buys some packs and
skips others unpredictably ("premium items are a bit weird for us"). So:

- **Player-declared ownership.** Let the player mark which items they own — persisted to `localStorage`, same pattern as the
  Starforged ★ set. The recommender ranks only owned (or craftable) items. This is the load-bearing input.
- **Acquisition badge — ✅ SHIPPED this change** (in `DragonInvasion.tsx`'s `ItemBonuses`, reused by the recommender). Data is
  parsed at sync time: `unlockPrerequisite` (col 2), `antiqueFrom` (col 95, `string | null`), and derived `premium`
  (has an antique date **or** a pack/pass/offer/bundle/chest prerequisite). The badge is single, three-state, by priority:
  - **🏺 in Antiques** — premium item whose `antiqueFrom` is in the past: buyable by anyone now from the Antiques store.
  - **🎁 from chest** — `unlockPrerequisite` matches `/chest/i` (e.g. Divine Chest, Major Artifact Chest): a **random drop**
    from opening chests, not craftable or buyable directly, so ownership is pure RNG.
  - **💎 premium** — pack/pass/offer the player may or may not have bought (tooltip notes the future antique date if known).
  - Craftable items (worker prerequisite) get no badge.
- **Ownership is still player-declared** — the badge only tells the player *how* an item is obtained; it can't know what they
  own. A future player-marked roster (localStorage, like the Starforged ★ set) is what lets the recommender rank only owned
  items. The badge is the lightweight v1 the player uses to eyeball obtainability themselves.

### Scope: a Dragon Invasion event tool

This app is currently focused on **the Dragon Invasion event** and building good tooling for it. Within that event, **airship
power *is* the objective**, so the recommender optimising airship power is exactly on-scope — the disclaimer must not undercut
that. The recommender is Dragon-Invasion tooling (it shares the power model, the category buckets, and the Starforged state
with `DragonInvasion.tsx`); whether it ships as a separate tool or a section of the Dragon Invasion tool is an open UI choice.

### Mandatory user-facing disclaimer

The disclaimer's job is *not* to second-guess the event objective, but to remind the player that **Transcendence Seals are a
shared, very rare resource** also useful for goals **outside this event tool's scope** — so the best transcendence *for the
airship* may not be the best use of a seal overall:

- **Gem income** — crafting Epic/Legendary to sell on the market — is many players' bigger priority, and seals spent on airship
  power aren't spent there.
- **Hero-building for quests and events** — transcending to strengthen a hero's loadout for the content you actually run — can
  be the better call. Modelling it is complex (heroes, gear slots, quest/event requirements) and is explicitly deferred.
- These out-of-scope trade-offs are the player's to weigh; this event tool deliberately optimises only Dragon Invasion airship
  power. Frame every number as "best for airship power in Dragon Invasion" — accurate and useful *for that event*.

### Future iterations (not v1)

- **Weigh gem income, not just airship power** — the goal the player actually cares about most. Model how transcendence stats
  feed the craft-Epic/Legendary-and-sell-for-gems loop, so the recommendation reflects value, not just AP.
- **Hero-building for quests/events** — recommend transcendence that strengthens the hero loadouts the player runs for current
  quest/event content. Big effort (heroes, gear slots, talents, quest/event requirements); a whole sub-project on its own.
- AP-per-seal *and* per-ascension-shard (shards are the other cost).
- Marginal "next slot across your whole roster" planner given a seal budget (knapsack over slots).
- Filter to only items the player actually fields / owns.
