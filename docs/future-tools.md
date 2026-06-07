# Future Tools Roadmap

A brainstorm of tools the Shop Titans Companion could grow into once the Dragon Invasion item-power ranker is shipped. Nothing here is committed; it is a menu of player-facing ideas to prioritize against.

## Crafting & Production

### Crafting Upgrade ROI Calculator
Compares the cost (gold, components, time) of pushing a blueprint from one quality tier to the next against the resulting power, value, and surcharge ceiling gains. Consumes Blueprints, Enchantments, and Merchant Levels to weigh sale price scaling. Players constantly second-guess whether to spend rare components reworking an item versus hoarding them for a future tier, and a clear ROI number resolves that.

### Starforged Milestone Planner
Tracks Starforged progress per blueprint and projects which item is closest to the next milestone breakpoint, including the marginal stat or surcharge cap unlock that milestone delivers. Consumes Blueprints and quality scaling data. Helps players decide which item to push next when they have limited time-skips or premium components to spend.

### Recycle and Disenchant Value Tool
Given a list of items in the shop or inventory, estimates the gold and enchanted-component yield from recycling versus selling at surcharge. Consumes Blueprints, Enchantments, and Merchant Levels. Removes the guesswork around clearing space without leaving value on the table, especially during high-volume crafting sprees.

### Worker XP per Crafting Time
Ranks blueprints by the worker XP each one delivers per minute of craft time for a given worker (Blacksmith, Tailor, etc.), and surfaces the best leveling craft at the current shop tier. Consumes Blueprints, Workers, and Worker Levels. Saves players from manual spreadsheet work when grinding a lagging worker up to the next perk threshold.

### Blueprint Research and Unlock Sequencer
Suggests an order for researching and unlocking blueprints based on what feeds upcoming quest demand, surcharge value, and worker XP needs. Consumes Blueprints, Merchant Levels, and Quest Components. Useful when new tiers open up and players face a dozen viable research paths with no clear priority.

## Heroes & Quests

### Quest Planner
Picks the best quest to run for a given goal: gold per energy, XP per energy, drop hunting for a specific component, or guaranteed chest unlocks. Consumes Quests, Quest Levels, Quest Components, and Heroes. Replaces the in-game quest list (which sorts by level, not by player goal) with intent-driven recommendations.

### Hero Gear Loadout and Talent Point Planner
Lets a player pin a hero and see the best craftable gear loadout for current quest content, including talent point allocations and ascension-aware stat targets. Consumes Heroes, Hero Levels, Blueprints, Enchantments, Slots, and Talent Points. Solves the "what do I equip this hero with" question that today requires cross-referencing community guides per hero.

### Champion Ascension Planner
Projects the cost in tokens, gold, and time to take each champion to the next ascension and ranks champions by post-ascension utility for the player's current content. Consumes Champions, Skills, and Hero Levels. Ascension is expensive and irreversible-feeling, so a "should I ascend this one next" tool has real payoff.

### Element and Spirit Affinity Finder
Looks up the best craftable item for a given hero or quest given affinity multipliers, including the Spellknight chest-item edge cases. Consumes Heroes, Blueprints, Enchantments, and the Affinities data currently stranded in the stale sheet. Players already hand-roll affinity charts; folding this into a first-class tool removes a chronic friction point. Open question: whether enchant-tier-per-item-tier mapping is tracked completely enough to recommend specific enchants, not just base items.

## Economy & Strategy

### Surcharge and Discount Energy Strategy
Models when to spend customer energy on surcharging versus discounting based on current shop tier, item mix, and active perks, with a projected gold-per-energy curve. Consumes Blueprints, Merchant Levels, and Guild Perks. The surcharge ceiling math is opaque in-game, so a tool that says "discount this, surcharge that, ignore the rest" is immediately actionable.

### Daily Energy Budgeter
Given the player's daily play windows and remaining energy regen, suggests how to split energy across quests, surcharge cycles, and event grinding to hit weekly goals. Consumes Quests, Merchant Levels, and event-specific data where available. Casual players especially lose value to suboptimal energy splits and would benefit from a single "today's plan" screen. Would need user-entered play schedule and goal selection.

### Guild Perk and Boost Optimizer
Recommends which guild perks to vote for and which boosts to activate given the player's current crafting and questing focus. Consumes Guild Perks, Guild Boosts, and Friendship Levels. Guild leaders especially want a defensible answer to "which perk this week" instead of vibes.

### Antique Rotation Tracker
Tracks the rotating antique merchant offerings, flags components a player needs for pending crafts or quests, and projects time-to-next-rotation. Consumes Blueprints and Quest Components alongside user inventory. Antiques are easy to miss, and missing a needed component sets crafting plans back by days.

## Events

### Dragon Invasion Item-Power Ranker
(The first shipped tool, listed here for completeness.) Ranks craftable items by Dragon Invasion power score given current blueprints, qualities, and affinities, replacing the stale community sheet. Consumes Blueprints, Enchantments, and the legacy Affinities table.

### King's Bounty Helper
Recommends which bounty contracts to accept and how to allocate hero rosters across them, with projected token yield. Consumes Heroes, Quests, and event reward tables. King's Bounty rotates frequently and players often pick suboptimal contracts because evaluating them by hand is tedious.

### Boss Fights Loadout Helper
Mirrors the gear-loadout planner but tuned to current Boss Fight resistances and affinity modifiers, and includes hero pick recommendations. Consumes Heroes, Blueprints, Enchantments, and event boss data. Boss Fights reward optimization more than regular quests do, so even small loadout deltas matter.

### Generic Event Reward ROI
A reusable view that ranks event reward tracks (currency-per-energy, currency-per-time) so players know when an event is worth tryharding versus skipping. Consumes whichever event tables are exposed plus Merchant Levels for opportunity cost. Open question: how much event data ends up in the canonical sheet versus needing manual entry per event.

## Personal Tracking

### Pet Level and Full Moon Fusion Planner
Tracks owned pets, projects level-up costs, and recommends Full Moon Fusion paths that produce the most useful next-tier pets. Consumes Pets, Pet Levels, and Full Moon Fusions. Fusion is irreversible and ingredient-heavy, so a planner that warns "you will need this pet next month" before fusing prevents real regret. Would need user-entered pet inventory.

### Achievement Progress Tracker
Shows progress toward achievements that gate meaningful rewards (gem caches, talent points, titles) and ranks the closest ones to completion. Consumes Achievements and Talent Points. Players routinely sit one or two crafts away from a reward they did not know they were close to.

### Collection Book Completion Planner
Surfaces gaps in the Collection Book and sequences the cheapest crafts to fill them, including which qualities and enchants are required for the completion bonus. Consumes Collection Book, Blueprints, and Enchantments. The Collection Book bonuses compound over time and are easy to leave on the table.

## Notes

Several cross-cutting concerns will pay for themselves once two or three tools are built and should be designed early:

- **Shared parsed-data layer.** A single normalized cache of the canonical sheet, refreshed on a schedule, that every tool reads from. Avoids re-parsing tabs per feature and centralizes schema drift handling when the sheet changes.
- **Affinity lookup utilities.** The Dragon Invasion ranker, affinity finder, boss helper, and hero loadout planner all need the same element and spirit affinity math. Worth extracting from day one.
- **Quality and enchant math helpers.** Tier scaling, quality multipliers, enchant stat contributions, and Starforged bonuses appear in nearly every crafting-adjacent tool. A single helper module keeps the numbers consistent across features.
- **User-state storage.** Several tools (pet planner, antique tracker, daily budgeter, achievement progress) need a place to store user-entered inventory, schedules, and goals. Decide early whether that lives in local storage, a sync backend, or an import/export blob.
- **Changelog watcher.** The sheet's Changelog tab is the canonical source for game-version updates. A shared watcher that flags when downstream tool assumptions may be stale is cheap insurance.

## Game mechanics worth knowing across tools

Notes on game systems that affect more than one tool, captured so the knowledge isn't re-learned per feature. In-game reference screenshots live in [`game-reference/`](game-reference/).

### Starforging

Starforging is a **per-item late-game unlock**, completed milestone by milestone — so most players only have a handful of items fully starforged at any time. Tools that assume "the player has everything starforged" will mislead; prefer per-item state, with an "assume all" shortcut.

- Each starforgeable item has **5 Starforged milestones**, completed in order (parsed into `Blueprint.starforgedMilestones`).
- Item progression / in-game visual states: not mastered → mastered → starforging (milestones in progress) → **fully starforged**, shown as **3 gold stars + a multicolored/iridescent border** (see `game-reference/starforged-milestones-crafting.png` and `starforged-border-inventory.png`).
- Only the **"+25% Base ATK, DEF and HP"** milestone affects airship power / displayed stats. It is the **final** milestone for ~850 items (so its unlock coincides with fully starforged), but the **4th of 5** for ~9 artifact-skill items (Wyrmbane Cannon, Kiku-Ichimonji, Backfire Hammer, Grimar's Collection, Binder of Memories), where it unlocks one step before fully starforged. So "has the +25% boost" is *not* strictly the same as "fully starforged."
- How it enters airship power (the Dragon Invasion ranker models this — see `data-points.md` and `src/data/enchant.ts`): the +25% multiplies the **base + enchant** stat total as a **second rounding step**, `round(round(quality·base + enchant) × 1.25)`, not a base-only boost. A future Starforged Milestone Planner would also want the *other* four milestones (surcharge value/cost, multicraft chance, value increase, quality chance) — they don't touch airship power but do feed the economy tools.
