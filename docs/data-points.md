# Dragon Invasion data points

In-game readings the model is calibrated against, plus the ones we still need.

Quick workflow: craft at Common, apply the listed element + spirit enchants, read the in-game airship power, and post the number back. The test suite at `src/data/enchant.test.ts` pins the verified cases — regressing one of them now breaks `npm test`.

## Verified data points (model matches in-game within 1 AP)

| Item | Type | Element | Spirit | In-game | App |
|---|---|---|---|---:|---:|
| Sia's Fancy Outfit | Light Armor (T15, def 670, eva 5%, Air affinity) | Tornado (T14 Air match) | Behemoth (T14 non-match) | 1695 | 1695 |
| Frogsong Gong | Instrument (T15, atk 1770 / def 443, Earth+Water) | Gaia (T14 Earth match) | Griffin (T14 non-match) | 2602 | 2602 |
| Mundra's Decree | Spell (T15, atk 2205 / def 475, built-in Mundra Spirit) | Oblivion (T14 Dark non-match) | Mundra Spirit (built-in, 0 AP) | 2596 | 2596 |
| Titan Admiral Arms | Dual Wield (T15, atk 1630 / hp 51, Light+Water + Titan) | Apotheosis (T14 Light match) | Titan Spirit (T14 match) | 2443 | 2442 |
| Slathered Slippers | Light Footwear (T15, def 650, eva 7%, Earth+Water) | Gaia (T14 Earth match) | Bahamut (T14 non-match) | 1881 | 1880 |

The two "off-by-1" rows (Titan, Slathered) are very likely a final-AP rounding direction — the game appears to round-half-up while the model floors. The hp_match=49 stat for T14 is otherwise sound across both readings.

## Unresolved data points

These match the model on the parts the model has confidence in but disagree on a specific dimension. They need more readings to disambiguate.

| Item | Type | Element | Spirit | In-game | App | Off by | What it tells us |
|---|---|---|---|---:|---:|---:|---|
| Malady's Robe | Clothes (T15, def 630 / hp 39, Light + Ouroboros) | Apotheosis (T14 Light match) | Ouroboros (T14 match) | 1732 | 1832 | −100 | Implies T14 hp_match ≈ 39 stat, contradicting Titan's hp_match ≈ 49 stat |
| Sky Pirate Outfit | Light Armor (T5, def 86, eva 5%, Air, +25% Airship Power upgrade) | Gale (T5 Air match) | Xolotl Spirit (T5 non-match) | 317 | 294 | −23 | Either T5 def stats are ~25% higher than derived, or the +25% Airship upgrade behaves differently than a flat post-multiplier |
| XL Healing Potion | Potion (T4, hp 19, no affinities) | Ember Element (Fire, T4 non-match) | Ox Spirit (T4 non-match) | 130 | 125 | −5 | Implies T4 hp_base ≈ 3.5 stat, not the 3 we derived from Dragon-power parity |
| Bottled Mirth | Potion (T7, hp 46, built-in Holy Element) | Holy (built-in, locked) | Walrus Spirit (T9 applied to T7 item, non-match) | 280 | 270 | −10 | Either Walrus stays at T9 stat values when applied to a T7 item, or T7 hp_base is higher than 8 |

### What we'd need to disambiguate

- **Malady vs Titan hp conflict.** A third T14 hp-bearing item, crafted Common with two known matches, would tell us whether the hp_match stat varies between items (e.g. capped at base hp, varies by weapon vs armor, varies by spirit family) or my Malady/Titan readings have an unrelated factor.
- **The +25% Airship Power upgrade.** A second item with the upgrade — ideally a T14 item where the rest of the model is solid (Cursed King's Aegis or Judgment Forgotten) — would let us pin down how the bonus is actually applied.
- **Lower-tier (T4, T5, T7) values.** One more reading per tier on an hp-only or def-only item.

## Useful items still to test

Same format: craft Common, apply both enchants, post the AP.

### Lower-tier HP items (highest priority — locks down the HP column)

| Item | Type | Element | Spirit |
|---|---|---|---|
| Phoenix Tonic | Potion (T6, hp 28) | any T5 element (Wild for Earth, Tide for Water, etc.) | any T5 spirit (Xolotl) |
| Potion of Renewal | Potion (T7, hp 32) | any T7 element | any T7 spirit (Horse / Owl / Lizard) |
| Propeller-Pike | Spear (T12, atk 690 hp 21, Water, +20% upgrade) | Torrent (T12 Water match) | any T12 spirit (Phoenix / Carbuncle) |

### Bonus Airship Power upgrade (confirms how it interacts with enchants)

| Item | Type | Upgrade | Element | Spirit |
|---|---|---|---|---|
| Cursed King's Aegis | Shield (T14, def 615 hp 45, Dark) | +25% | Oblivion (T14 Dark match) | any T14 spirit |
| Judgment Forgotten | Axe (T14, atk 1090 hp 34, Dark) | +20% | Oblivion (T14 Dark match) | any T14 spirit |

### Crit at high tier (confirms the crit multiplier inside the enchant gain path)

| Item | Type | Element | Spirit |
|---|---|---|---|
| Twin Fangs | Sword (T14, atk 1160, crit 5%, Ouroboros) | any T14 element | Ouroboros (T14 match) |
| Sword of the Sightless | Sword (T15, atk 1340, crit 5%, Light + Ouroboros) | Apotheosis (T14 Light match) | Ouroboros (T14 match) |

### Built-in element items

| Item | Type | Element (built-in, locked) | Spirit |
|---|---|---|---|
| Succubus Martyr | Sword (T15, atk 1586) | Oblivion Element (locked) | any T14 spirit |
| Caladbolg | Sword (T10, atk 542) | Flood Element (locked) | any T10 spirit (Quetzalcoatl) |

### Quality multiplier

Re-craft any verified item at Superior with the same enchants. We expect the AP to be `floor(CommonAP × 1.25)`.

## What the model is grounded on

- **Base AP formula.** All 1527 stat-bearing blueprints match `(0.8·atk + 1.2·def + 5·hp) · (1 + 10·crit) · (1 + 10·eva)` exactly — published ST Central formula.
- **T14 atk + def stat values.** Confirmed by Sia, Frogsong, Mundra: `atk_base 164, atk_match 246; def_base 109, def_match 163`.
- **T14 hp value.** Currently `hp_base 33, hp_match 49` (Titan + Slathered fit); Malady contradicts.
- **Built-in spirit/element slots.** Locked, contribute 0 AP, already in base — verified by Mundra's Decree.
- **Spirit-tier tradeoff.** A T9 spirit on a T14 item loses to a generic T14 spirit — derived from the stat values and consistent with the verified readings.

## Reporting format

```text
- Item: <name> (Common quality)
  Element: <enchant name>   e.g. "Apotheosis Element"
  Spirit:  <enchant name>   e.g. "Titan Spirit"   (or "(none)")
  In-game AP: <number>
```
