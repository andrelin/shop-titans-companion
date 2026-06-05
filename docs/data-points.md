# Dragon Invasion data points

The ranker derives its enchant model from a small set of in-game readings. This file lists the data points already collected (and how they shaped the formula), plus the data points that would most usefully tighten the model further.

Workflow when reporting a new reading: craft an item at the lowest quality you have, apply the listed element + spirit enchants, read the displayed airship power in-game, and post it back in the repo. I'll re-verify the math and patch the model if it drifts.

## Verified data points

All four were measured at Common quality; current model matches each in-game reading exactly.

| Item | Build | In-game AP | App AP | Used to verify |
|---|---|---|---|---|
| Sia's Fancy Outfit (T15 Light Armor, def 670, eva 5%) | Tornado (T14 Air match) + Behemoth (T14 spirit non-match) | 1695 | 1695 | Base formula `(0.8a + 1.2d + 5h)·(1+10c)·(1+10e)`. Def-only with eva. |
| Frogsong Gong (T15 Instrument, atk 1770, def 443) | Gaia (T14 Earth match) + Griffin (T14 spirit non-match) | 2602 | 2602 | T14 atk values (164 base / 246 match); two-stat enchant stacking. |
| Malady's Robe (T15 Clothes, def 630, hp 39) | Apotheosis (T14 Light match) + Ouroboros (T14 spirit match) | 1732 | 1732 | T14 hp values (26 base / 39 match) — the published Dragon-sheet HP row was off by ~25%. |
| Mundra's Decree (T15 Spell, atk 2205, def 475, built-in Mundra Spirit) | Oblivion (T14 Dark non-match) + Mundra Spirit (built-in, locked) | 2596 | 2596 | Built-in enchant stats are already in the base AP value — the locked slot adds 0. |

## How a data point gets recorded

Format:

```text
- Item: <Name>
  Quality: Common | Superior | Flawless | Epic | Legendary
  Element applied: <enchant name> (e.g. "Apotheosis Element")
  Spirit applied: <enchant name> (e.g. "Ouroboros Spirit", or "(none)" if you left it empty)
  In-game AP: <number>
```

Common is cheapest to craft and easiest to verify — quality just multiplies the result linearly. If you want to confirm the quality multiplier itself, please include the same item at two qualities.

## Open verifications, ranked by usefulness

These would each tighten a specific part of the model. The model values are predictions — if the in-game readout differs, we patch.

### 1. Lower-tier HP-bearing items

Most leverage. The T14 HP enchant value was wrong in the published Dragon-sheet; the lower-tier HP values are derived by the same pattern (`hp_stat = base_power / 5`) but have not been confirmed. Crafting a Common version of one of these and reporting the enchanted AP would lock down a whole column of the table.

Suggested items (all are atk-free / def-free hp-only Potions, so the enchant gain is a clean single-stat number):

- **T7 Bottled Mirth** (hp 46, Holy Element affinity) — apply Sacred (T7 Light match) + any T7 spirit
- **T10 (any hp-bearing item)** — there are few pure HP T10 items; the Misc Armor list has some hp + def, but pure HP is rare
- **T12 Propeller-Pike** (atk 690, hp 21, Water affinity, +20% Bonus Airship Power upgrade) — covers HP gain *and* the +20% Bonus AP upgrade at one go

### 2. The Bonus Airship Power upgrade (+20% / +25%)

The toggle is applied as a flat multiplier after the enchant gain. We've never read this against the game. Any one of these would settle it:

- **+25%**: Sky Pirate Outfit (T5 Light Armor, def 86, eva 5%, Air); Copper Bite (T9 Axe, atk 380, hp 12, Viper Lethality); Cursed King's Aegis (T14 Shield, def 615, hp 45, Dark)
- **+20%**: Judgment Forgotten (T14 Axe, atk 1090, hp 34, Dark); Propeller-Pike (T12 Spear, atk 690, hp 21, Water)

For each, craft Common, fully unlock the bonus upgrade, enchant element + spirit, report the in-game AP. The model expects `floor((base + element gain + spirit gain) × (1 + 0.20))` or `× 1.25` respectively.

### 3. Crit-bearing items at high tier

The `(1 + 10·crit)` multiplier across the entire stat sum has been validated indirectly (matching the canonical base AP for every crit-bearing blueprint), but not against a full enchant readout. Crafting one of these confirms the multiplier still applies inside the enchant gain path:

- **Twin Fangs** (T14 Sword, atk 1160, crit 5%, Ouroboros Eternity spirit) — Inferno or any T14 element + Ouroboros (match)
- **Sword of the Sightless** (T15 Sword, atk 1340, crit 5%, Light affinity, Ouroboros spirit) — Apotheosis + Ouroboros (both match — best case for verifying high-end stack)
- **Wolfbane Scissors** (T16 Sword, atk 1420, crit 5%, no affinities) — Any T14 element + any T14 spirit. Pure non-match case at T16.

### 4. Built-in element items

We treat built-in elements (Inferno, Blistering, Oblivion, etc.) the same as built-in spirits — locked slot, 0 gain. This is unverified. One reading would settle whether built-in elements really are pre-baked into base AP, or whether they contribute beyond the base in some way.

- **Succubus Martyr** (T15 Sword, atk 1586, built-in Oblivion Element) — leave element slot at Oblivion, apply any T14 spirit (Ouroboros for affinity if it has one, otherwise generic). Report AP.
- **Caladbolg** (T10 Sword, atk 542, built-in Flood Element) — same procedure at lower tier.
- **Axe of Wroth** (T14 Axe, atk 1336, built-in Blistering Element) — high tier built-in.

### 5. Lower-tier enchants on multi-stat items

Most of the lower-tier enchant values (T4, T5, T7, T9, T10, T12) are derived from the Dragon-sheet's per-tier base power and the atk/def/hp pattern that worked at T14. They look right but haven't been measured. One craft per tier would confirm:

- **T4** Imbued Blade (Sword, atk 104, def 26, "All" affinity) — pick Ember (T4 Fire match) + any T4 spirit (e.g. Wolf or Ram)
- **T7** Chronos Runeblade (Sword, atk 280, def 70, Earth) — Blaze of Earth (Primal T7?) + Horse / Owl T7 spirit
- **T10** Birdbane Halberd (Spear, atk 440, def 110, Air, Griffin Freedom spirit — note Griffin is T14, so non-match best) — pick Hurricane (T10 Air match) + Quetzalcoatl T10 spirit
- **T12** Titan Sword (Sword, atk 730, def 183, Light affinity, Titan Solemnity spirit) — Divine (T12 Light match) + Phoenix or Carbuncle T12 spirit

### 6. Quality multipliers

Currently treated as a linear post-multiplier (Superior 1.25×, Flawless 1.5×, Epic 2×, Legendary 3×). One reading per quality on a known item would verify whether the multiplier is applied (a) on top of base + enchant or (b) compounded into the stat additions.

Easiest data point: take any item from section 1 above and craft it at Superior. Report the AP. We expect `floor((CommonAP) × 1.25)`.

## Things we don't think we need more data on

- Base AP formula: all 1527 stat-bearing blueprints in the canonical sheet match `(0.8a + 1.2d + 5h)·(1+10c)·(1+10e)` exactly (within rounding). This is the published ST Central formula.
- The element-vs-spirit slot model: an item has one of each, and the gains stack. Confirmed by the four verified data points.
- Spirit tier mapping: the verified-tier list from the ST Central Affinities sheet (Bear T9, Bahamut T14, etc.) is treated as ground truth. Inferred entries (Krampus, Mundra, Goose, etc.) are flagged in the explainer panel.
