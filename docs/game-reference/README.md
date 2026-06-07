# Game reference screenshots

In-game screenshots kept as the visual/mechanical source of truth behind the
power model and the UI. When a calibration decision or a visual cue traces back
to "this is how the game shows it," the evidence lives here.

## ghostbusters-suit-starforged-2043ap.jpg

Ghostbusters Suit (T15 Light Armor, def 690, eva 5%, no affinity), **Common**,
**Starforged**, enchanted with Oblivion + Ouroboros (both non-match) — in-game
airship power **2043**. This is the reading that corrected the Starforged
Milestone math: the +25% boost multiplies the **base + enchant** total (not
base-only) and is applied as a **second rounding step**
(`round(round(base·q + enchant) × 1.25)`). See `docs/data-points.md`.

## starforged-border-inventory.png

Inventory grid. **Lone Wolf Cowl** and **Birdrunners** show the multicolored /
iridescent **Starforged border** (fully starforged); the other items (Seafarer
Blade, Tower of Thorns, Astral Hat, Powder Keg) have normal borders. This is the
in-game visual the app echoes with the iridescent left-edge accent + rainbow ★
on rows whose AP includes the +25% Starforged boost.

## starforged-milestones-crafting.png

Craft menu, showing the range of Starforging states an item can be in:

- **Might of the Earth** — mastered, working through Starforged milestones.
- **Prototype Gatling** & **Maelstrom Element** — fully starforged (3 gold
  stars + the iridescent border).
- **Audit Protector** — not even mastered.
- **Bound Lesser Demon** — mastered, but Starforge not unlocked.

Mechanics note: each item has 5 Starforged milestones. The
**+25% Base ATK/DEF/HP** milestone (the only one that affects airship power) is
the **final** milestone for ~850 items — so it coincides with "fully starforged"
(the rainbow border) — but the **4th of 5** for ~9 artifact-skill items
(Wyrmbane Cannon, Kiku-Ichimonji, Backfire Hammer, Grimar's Collection, Binder
of Memories), where it unlocks one milestone before fully starforged. That's
why the app marks "Starforged milestone unlocked" rather than strictly "fully
starforged."
