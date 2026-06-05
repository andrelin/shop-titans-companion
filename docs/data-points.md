# Dragon Invasion data points

The ranker's enchant model is calibrated against in-game readings. This file lists the data points already collected (and what each one nailed down), plus the data points that would most usefully tighten the model further.

Quick workflow: craft a Common-quality item, apply the listed element + spirit enchants, read the in-game airship power, and post the number back. I'll re-verify the math and patch the model if it drifts.

## Verified data points

All four readings at Common quality. The model matches each one exactly.

| Item | Type | Element applied | Spirit applied | In-game AP | App AP |
|---|---|---|---|---:|---:|
| Sia's Fancy Outfit | Light Armor (T15) | Tornado (T14 Air, match) | Behemoth (T14, no match) | 1695 | 1695 |
| Frogsong Gong | Instrument (T15) | Gaia (T14 Earth, match) | Griffin (T14, no match) | 2602 | 2602 |
| Malady's Robe | Clothes (T15) | Apotheosis (T14 Light, match) | Ouroboros (T14, match) | 1732 | 1732 |
| Mundra's Decree | Spell (T15) | Oblivion (T14 Dark, no match) | Mundra Spirit (built-in, locked) | 2596 | 2596 |

What each one verified:

- **Sia** — base AP formula `(0.8·atk + 1.2·def + 5·hp) × (1+10·crit) × (1+10·eva)` for def + evasion items; spirit non-match at item tier.
- **Frogsong** — T14 atk stat values; two stats getting enchanted in both slots.
- **Malady** — T14 hp stat values (the published Dragon-sheet HP row was wrong by ~25%).
- **Mundra** — built-in enchants are already in the base AP, so the locked slot contributes 0.

## Reporting format

When you craft something new, post it as:

```text
- Item: <name> (Common)
  Element: <name> e.g. "Apotheosis Element"
  Spirit: <name> e.g. "Ouroboros Spirit"  (or "(none)" if you skipped a slot)
  In-game AP: <number>
```

## Open verifications, ranked by usefulness

### 1. Lower-tier HP items

Biggest model leverage — confirms the HP column at tiers below T14. Pure HP-only Potions give the cleanest signal because the enchant gain is a single-stat number.

| Item | Type | Element to apply | Spirit to apply | What this verifies |
|---|---|---|---|---|
| Bottled Mirth | Potion (T7) | Sacred Element (T7 Light, match) | any T7 spirit (Horse, Owl, Lizard) | T7 HP values |
| Potion of Renewal | Potion (T7) | any T7 element (no affinity) | any T7 spirit | T7 HP non-match values |
| XL Healing Potion | Potion (T4) | any T4 element | any T4 spirit (Wolf, Ram, Cat…) | T4 HP values |
| XL Magic Potion | Potion (T5) | any T5 element | any T5 spirit (Xolotl) | T5 HP values |
| Propeller-Pike | Spear (T12) | Torrent (T12 Water, match) | any T12 spirit (Phoenix, Carbuncle…) | T12 HP, +20% Airship upgrade, atk+hp combo |

### 2. The +20 / +25% Bonus Airship Power upgrade

We've never actually compared this multiplier against the game. One reading on any of these would settle it. Common quality + the upgrade fully unlocked.

| Item | Type | Bonus | Element to apply | Spirit to apply |
|---|---|---|---|---|
| Sky Pirate Outfit | Light Armor (T5) | +25% | Gale (T5 Air, match) | any T5 spirit (Xolotl) |
| Copper Bite | Axe (T9) | +25% | any T9 element | Viper Spirit (T4, matches Viper Lethality — but T9 generic likely wins) |
| Cursed King's Aegis | Shield (T14) | +25% | Oblivion (T14 Dark, match) | any T14 spirit (Bahamut, Behemoth…) |
| Judgment Forgotten | Axe (T14) | +20% | Oblivion (T14 Dark, match) | any T14 spirit |
| Propeller-Pike | Spear (T12) | +20% | Torrent (T12 Water, match) | any T12 spirit |

### 3. Crit items at high tier

The `(1+10·crit)` multiplier wraps the whole stat sum in the base formula and we expect it to wrap the enchant gain the same way. A single high-tier crit-bearing reading confirms it.

| Item | Type | Element to apply | Spirit to apply | Notes |
|---|---|---|---|---|
| Twin Fangs | Sword (T14) | any T14 element (no elemental affinity) | Ouroboros (T14, match) | atk + 5% crit, spirit match |
| Sword of the Sightless | Sword (T15) | Apotheosis (T14 Light, match) | Ouroboros (T14, match) | atk + 5% crit, both slots match |
| Wolfbane Scissors | Sword (T16) | any T14 element | any T14 spirit | T16 with crit, both slots non-match |

### 4. Built-in element items

We treat the built-in element slot the same as built-in spirit — locked, 0 extra AP. Unverified. One reading would settle whether built-in elements really are folded into base AP.

| Item | Type | Element (built-in, locked) | Spirit to apply |
|---|---|---|---|
| Caladbolg | Sword (T10) | Flood Element (locked) | any T10 spirit (Quetzalcoatl) |
| Axe of Wroth | Axe (T14) | Blistering Element (locked) | any T14 spirit |
| Succubus Martyr | Sword (T15) | Oblivion Element (locked) | any T14 spirit |

### 5. Lower-tier enchants on multi-stat items

The T4/T5/T7/T9/T10/T12 enchant stat values are derived from the Dragon-sheet's per-tier power and the atk/def/hp pattern that held at T14. They look right but haven't been measured. One craft per tier confirms.

| Item | Type | Element to apply | Spirit to apply | Tier confirmed |
|---|---|---|---|---|
| Imbued Blade | Sword (T4) | Ember Element (T4 Fire, match — "All" affinity hits everything) | any T4 spirit (Wolf, Ram, Cat) | T4 atk + def |
| Hero's Sword | Sword (T5) | Holy Element (T5 Light, match) | any T5 spirit (Xolotl) | T5 atk + def |
| Chronos Runeblade | Sword (T7) | Primal Element (T7 Earth, match) | any T7 spirit (Horse, Owl, Lizard) | T7 atk + def |
| Tower of Thorns | Mace (T9) | Inferno-equivalent T9 Earth element (match) | any T9 spirit (Bear, Dinosaur, Tiger…) | T9 atk + def |
| Birdbane Halberd | Spear (T10) | T10 Air element (match) | Quetzalcoatl (T10, no Quetzalcoatl-affinity but tier-perfect) | T10 atk + def, low-tier spirit on item that has Griffin (T14) affinity — should pick the T10 generic |
| Titan Sword | Sword (T12) | Divine (T12 Light, match) | any T12 spirit (Phoenix, Carbuncle, Chimera…) | T12 atk + def — note Titan Solemnity spirit is T14, so the spirit slot picks generic T12 over Titan |

### 6. Quality multiplier

Currently treated as a linear post-multiplier (Superior 1.25, Flawless 1.5, Epic 2, Legendary 3). Easiest verification: take any item you've already crafted Common and craft it again at Superior with the same enchants. We expect the in-game AP to be `floor(CommonAP × 1.25)`.

## Things we don't think we need more data on

- **Base AP formula.** All 1527 stat-bearing blueprints in the canonical sheet match `(0.8·atk + 1.2·def + 5·hp) × (1+10·crit) × (1+10·eva)` exactly. This is the published ST Central formula.
- **The element + spirit slot model.** An item has one of each, gains stack. Confirmed by all four verified data points.
- **Spirit tier mapping.** The verified-tier list from the ST Central Affinities sheet (Bear T9, Bahamut T14, etc.) is treated as ground truth. The handful of inferred entries (Krampus, Mundra, Goose, Armadillo, Hippo, Squirrel, Rhino, Hydra, Tarrasque, Kirin, Ancestor) are flagged in the explainer panel.
