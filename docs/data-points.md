# Dragon Invasion data points

In-game readings the model is calibrated against, plus the ones we still need.

Quick workflow: craft at Common, apply the listed element + spirit enchants, read the in-game airship power, and post the number back. The test suite at `src/data/enchant.test.ts` pins the verified cases — regressing one of them now breaks `npm test`.

## Verified data points (model matches in-game)

25 of 26 readings match the in-game value exactly under the current model. Sia is the lone +1 holdout (re-verified by the user; the model gives 1696 vs 1695 in-game). Superior Frogsong was −1 and is now exact thanks to stat-level integer rounding.

| Item | Type | Element | Spirit | In-game | App |
|---|---|---|---|---:|---:|
| Bottled Mirth | Potion (T7, hp 46, built-in Holy Element) | Holy (built-in, locked) | Walrus Spirit (T9 non-match) | 280 | 280 |
| Bottled Mirth | Potion (T7, hp 46, built-in Holy Element) | Holy (built-in, locked) | Horse Spirit (T7 non-match) | 270 | 270 |
| Cursed King's Aegis | Shield (T14, def 615 / hp 45, Dark, +25% Airship upgrade) | Oblivion (T14 Dark match) | Bahamut (T14 non-match) | 2099 | 2099 |
| Frogsong Gong | Instrument (T15, atk 1770 / def 443, Earth+Water) | Gaia (T14 Earth match) | Griffin (T14 non-match) | 2602 | 2602 |
| Frogsong Gong (Superior) | Instrument (T15, atk 1770 / def 443, Earth+Water) | Maelstrom (T14 Water match) | Bahamut (T14 non-match) | 3090 | 3090 (exact, after stat-level rounding) |
| Ghost Trap | Spell (T15, atk 2190 hp 75, no affinity) | Blistering (T14 Fire non-match) | Griffin (T14 non-match) | 2719 | 2719 |
| Imbued Blade | Sword (T4, atk 104 / def 26, "All" elemental affinity) | Oblivion (T14 match via "All") | Griffin (T14 non-match) | 343 | 343 |
| Lone Wolf Cowl + Starforged Milestone | Rogue Hat (T9, def 230 hp 19, Wolf Ferocity + Dark elem affinity, +25% Base ATK/DEF/HP milestone applied) | Oblivion (T14 Dark match) | Bahamut (T14 non-match) | 1027 | 1027 (pins the Starforged Milestone path; toggle `includeStarforgedStatBoosts` controls whether it flows through) |
| Malady's Robe | Clothes (T15, def 630 / hp 39, Light + Ouroboros) | Apotheosis (T14 Light match) | Ouroboros (T14 match) | 1732 | 1732 |
| Mundra's Decree | Spell (T15, atk 2205 / def 475, built-in Mundra Spirit) | Oblivion (T14 Dark non-match) | Mundra Spirit (built-in, 0 AP) | 2596 | 2596 |
| Potion of Renewal | Potion (T7, hp 32, no affinity) | Tornado (T14 non-match) | Behemoth (T14 non-match) | 480 | 480 |
| Rock Stompers | Heavy Footwear (T14, def 680 hp 42, Earth, Urist's Sturdiness artifact skill) | Gaia (T14 Earth match) | Bahamut (T14 non-match) | 1727 | 1727 (confirms artifact stat boosts don't affect AP) |
| Sia's Fancy Outfit | Light Armor (T15, def 670, eva 5%, Air affinity) | Tornado (T14 Air match) | Behemoth (T14 non-match) | 1695 | 1696 (+1) |
| Slathered Slippers | Light Footwear (T15, def 650, eva 7%, Earth+Water) | Gaia (T14 Earth match) | Bahamut (T14 non-match) | 1881 | 1881 |
| Squire Sword | Sword (T1, atk 16, no affinity) | Oblivion (T14 non-match) | Griffin (T14 non-match) | 38 | 38 |
| Titan Admiral Arms | Dual Wield (T15, atk 1630 / hp 51, Light+Water + Titan) | Apotheosis (T14 Light match) | Titan Spirit (T14 match) | 2443 | 2443 |
| Titan Sword | Sword (T12, atk 730 def 183, Light, Titan spirit, +25% Starforged Milestone available but not applied for this reading) | Divine (T12 Light match) | Carbuncle Spirit (T12 non-match) | 1199 | 1199 (third T12 confirmation; pins all four T12 atk/def values) |
| Torc of Peace | Amulet (T14, atk 180 def 720, Light, Myrthee's Left Hook artifact skill) | Apotheosis (T14 Light match) | Griffin (T14 non-match) | 1610 | 1610 (second confirmation that stat-boost artifacts don't affect AP) |
| Tower of Thorns | Mace (T9, atk 400 def 100, Earth) | Gaia (T14 Earth match) | Bahamut (T14 non-match) | 1008 | 1008 (def cap at 100 kicks in on both slots) |
| Tower of Thorns | Mace (T9, atk 400 def 100, Earth) | Oblivion (T14 non-match) | Mammoth Spirit (T9 non-match) | 768 | 768 (mixed-tier non-match: T14 + T9) |
| Tower of Thorns | Mace (T9, atk 400 def 100, Earth) | Primeval (T12 Earth match) | Carbuncle Spirit (T12 non-match) | 836 | 836 (pins T12 atk_base 99, atk_match 148, def_base 66, def_match 99) |
| Warrior Assegai | Spear (T7, atk 280 hp 10, no affinity, no Starforged stat boost) | — (unenchanted) | — (unenchanted) | 274 | 274 (sanity check on the canonical Common base AP) |
| Warrior Assegai (Superior) | same item | — (unenchanted) | — (unenchanted) | 345 | 345 (pins stat-level integer rounding: atk 350 + hp 13 → AP 345) |
| Warrior Assegai | Spear (T7) | Divine (T12 non-match, no Light affinity) | Carbuncle Spirit (T12 non-match) | 532 | 532 (second confirmation of T12 atk_base 99) |
| Wyrmbane Cannon | Gun (T14, atk 1600 hp 50, Bahamut spirit, Meirika's Secret artifact skill +20% AP) | Maelstrom (T14 Water non-match) | Bahamut (T14 spirit match) | 2722 | 2722 |
| XL Magic Potion | Potion (T5, hp 24, no affinity) — *spirit slot only, no element applied* | (none) | Xolotl Spirit (T5 non-match) | 145 | 145 (confirms T5 hp_base = 5) |

Sia is the only remaining mismatch:

- **Sia (model +1):** the raw computed value is 1695.6 → round-half-up gives 1696, but the in-game reading is 1695. Re-verified by the user on a freshly crafted Common Sia (2026-06-06). Every other item with a .6 fractional rounds up; Slathered Slippers (same eva-only shape, eva 7%) gives 1880.88 → 1881 exactly. No fractional def_match value or alternative rounding rule fits both Sia *and* Slathered (verified by hand), so this is a genuine open mystery — likely a subtle interaction between Sia's specific eva value (0.05) and the in-game rounding chain we haven't reverse-engineered yet.

Stat-level integer rounding (the rule "compute raw stats with quality + enchant caps, round each to integer, then run the AP formula") fixed the Superior Frogsong gap — confirmed against Superior Warrior Assegai (raw 12.5 hp → 13, AP 345) and Superior Frogsong (raw 2622.5 atk + 825.75 def → 2623, 826 → AP 3090).

## What the model is grounded on

1. **Base AP formula.** `(0.8·atk + 1.2·def + 5·hp) · (1 + 10·crit) · (1 + 10·eva)` — published by ST Central. Matches every stat-bearing blueprint in the canonical sheet within 1 AP.
2. **T14 atk + def + hp stat additions.**
   - `atk: base 164, match 246`  (verified across Frogsong, Mundra, Ghost Trap, Squire Sword, Imbued Blade, Titan)
   - `def: base 109, match 163`  (verified across Sia, Frogsong, Mundra, Malady, Slathered, Cursed King's Aegis, Imbued Blade)
   - `hp:  base  33, match  49`  (verified across Malady, Titan, Cursed King's Aegis, Wyrmbane, Ghost Trap, Potion of Renewal)
3. **Lower-tier stat values** (T4, T5, T7, T9, T10, T12) are derived from the Dragon-sheet's per-tier power and the atk/def/hp stat-weight pattern that held at T14. Confirmed: T5 hp_base = 5 (XL Magic Potion), T7 hp_base = 8 (Bottled Mirth + Horse), T9 hp_base = 10 (Bottled Mirth + Walrus), **T9 atk_base = 48, T9 def_base = 32** (Tower of Thorns + Mammoth), **T12 atk_base = 99, atk_match = 148, def_base = 66, def_match = 99** (Tower of Thorns + Primeval + Carbuncle, Warrior Assegai + Divine + Carbuncle, Titan Sword + Divine + Carbuncle — three independent T12 readings, all exact). T4 and T7 atk/def + T10 atk/def remain unverified.
4. **Each enchant's stat boost is capped at the (Starforged-boosted, quality-scaled) base value for that stat, per slot, as a raw float.** `enchant_atk_per_slot = min(enchant_atk, base.atk × (1 + starforged.atk) × q)` — same for def and hp. Verified across the cap-binding readings: Malady (hp), Squire Sword (atk), Imbued Blade and Tower of Thorns (def), and crucially Lone Wolf Cowl Common + Starforged (hp cap binds at 23.75/slot, not 24/slot — both slots sum to 47.5 → display 71; rounding the cap per slot to integer would predict 72, which contradicts the in-game reading). So the cap math stays in floats; only the final displayed stat rounds to integer.
5. **Element and spirit enchants apply at their own tier, not the item's.** Verified by Potion of Renewal (T7 item, T14 enchants applied). The `maxEnchantTier` control in the UI represents what the player has unlocked — the model uses it as the effective tier for both slots.
6. **Even T1 items can be enchanted.** Squire Sword + T14 enchants gave a valid in-game reading.
7. **Built-in enchant slots are locked and contribute 0 AP** — their stat boost is already in the item's base AP. Verified by Mundra's Decree.
8. **Spirit-tier tradeoff.** A matching spirit at a lower tier loses to a generic spirit at `maxEnchantTier`. The ranker compares both and picks whichever yields more AP, but always shows the matching spirit as an alternative when the player wants the skill effect.
9. **Quality multiplies base stats (atk / def / hp) before enchants are added; enchant table values themselves are not quality-scaled.** Common = 1, Superior = 1.25, Flawless = 1.5, Epic = 2, Legendary = 3. Verified by Superior Frogsong (raw atk 1770·1.25 + enchant 410 → display 2623; raw def 443·1.25 + enchant 272 → display 826; AP 3090 exact) and Superior Warrior Assegai unenchanted (raw atk 350, raw hp 12.5 → display 13, AP 345 exact). Quality also multiplies crit and eva by the same factor, though no Superior+ eva/crit reading has pinned that exactly yet.
10. **The +20/25% Bonus Airship Power upgrade is a flat multiplier on the unfloored enchanted AP, with one round at the end.** Cursed King's Aegis verified the application order: `(base + enchant) × upgrade → round`.
11. **Artifact-chest stat-boost skills are all hero-only.** Urist's Sturdiness (Rock Stompers, 1727 match), Myrthee's Left Hook (Torc of Peace, 1610 match), and Savard's Aloofness (Lone Wolf Cowl) all do *not* affect the item's airship contribution. Only flat-AP-multiplier skills (Meirika's Secret on Wyrmbane Cannon) affect AP. The model's `applyArtifactStatMods` stays for hero/quest tools but `computePower` ignores it. User note: the Rock Stompers and Torc of Peace readings were on items *without* Starforged Milestones applied (both items do have starforged versions, the user hadn't unlocked them) — which is exactly why those readings match the no-mod model.
12. **Starforged Milestones that add +X% to base ATK/DEF/HP affect AP — parsed and modelled.** The sync script parses strings like `"+25% Base ATK, DEF and HP"` into `Blueprint.starforgedStatBoosts: { atk, def, hp, eva, crit }` (currently only the +25%/all-three variant exists in the sheet). `computePower` applies them when `includeStarforgedStatBoosts: true`. The boost multiplies base stats *before* quality and enchant; the enchant cap operates on the raw (non-rounded) scaled base per slot. Verified by Lone Wolf Cowl Common + Oblivion + Bahamut = 1027 exact. The UI exposes the option as a "+25% Starforged stat boost" toggle (default off, since the player has to unlock the starforged version of the recipe for the boost to apply).
13. **Rounding.** Each displayed stat (atk / def / hp) is rounded to integer (round-half-up) *before* the AP formula runs; eva and crit stay as floats; final AP is round-half-up. Confirmed: Superior Warrior Assegai (raw atk 350.0 + raw hp 12.5 → display 350, 13 → AP 345 exact), Superior Frogsong (raw atk 2622.5 + raw def 825.75 → display 2623, 826 → AP 3090 exact), LWC Common + Starforged + Oblivion + Bahamut (raw def 559.5 + raw hp 71.25 → display 560, 71 → AP 1027 exact). The single exception is Sia: at Common (q=1) with no eva quality scaling, the stat-level rounding is a no-op since base+enchant=942 is already integer; the gap is elsewhere in the eva-multiplied AP chain.

## Unresolved data points

| Item | Element | Spirit | In-game | What it tells us |
|---|---|---|---:|---|
| Sky Pirate Outfit (T5 def 86 eva 5%, Air, +25% upgrade) | Gale (Air, applied at T5-item enchant level) | Xolotl Spirit (T5 — the only T5 enchant) | 317 | Model predicts 294. The +25% upgrade math and the round-half-up are now confirmed at T14, so the gap is in the lower-tier enchant stat values for T5 / T7 specifically. |
| XL Healing Potion (T4 hp 19, no affinity) | Ember (T4 non-match) | Ox Spirit (T4 non-match) | 130 | Model predicts 125 — implies T4 hp_base is closer to 3.5 stat than the derived 3, or only one slot adds hp on hp-only items. Another T4 hp item would confirm. |
| Chronos Runeblade (T7, atk 280 def 70, Earth) | Primal (T9 Earth match) | Horse Spirit (T7 non-match) | 488 | Model predicts 484 — off +4. T9 atk/def values are slightly low. |
| Chronos Runeblade (T7, atk 280 def 70, Earth) | Wild (T7 Earth match) | Horse Spirit (T7 non-match) | 463 | Model predicts 460 — off +3. T7 atk/def values are slightly low. |
| Lone Wolf Cowl Superior (same item, +25% Starforged Milestone applied) | Nightmare (T14 Dark match) | Wolf (T4 spirit match) | 758 | With milestone toggle on: scaled base = 230·1.25·1.25 = 359.375 + Nightmare def_match 163 + Wolf def_match 16 = 538 → display def. AP includes hp, so the exact prediction depends on hp interaction. Not yet pinned as exact — one **Superior LWC, no enchant** reading would settle it. |

T9 and T14 were both already exact (verified across Mammoth, Gaia, Bahamut, Oblivion combinations). T12 is now also exact across three independent readings (Tower + Primeval+Carbuncle, Warrior Assegai + Divine+Carbuncle, Titan Sword + Divine+Carbuncle). The remaining mismatches isolate to **T7** (Chronos ±3–4), **T4** (XL Healing Potion +5), the **Sia +1** mystery, and **Superior LWC with milestone + quality** (off −29 to +various depending on stacking theory).

### Lone Wolf Cowl — Starforged Milestone is now modelled

LWC has a **Starforged Milestone that adds +25% to base ATK/DEF/HP**. The sync script now parses this into `Blueprint.starforgedStatBoosts` and `computePower` applies it whenever `includeStarforgedStatBoosts: true`. Common LWC + Oblivion + Bahamut = 1027 is pinned as an exact match in the test suite.

**Common LWC math (with the milestone toggle on):**
- base def 230 × 1.25 = 287.5 → enchant 163 (Oblivion Dark match) + 109 (Bahamut non-match) = 272 (uncapped: both ≤ 287.5) → display def = round(559.5) = 560 ✓
- base hp 19 × 1.25 = 23.75 → enchant min(49, 23.75) + min(33, 23.75) = 47.5 (cap binds on both slots) → display hp = round(71.25) = 71 ✓
- AP = 1.2·560 + 5·71 = **1027** ✓

**Superior LWC (758) still doesn't fit a clean stacking rule.** Three theories considered:

- *Multiplicative stacking* (Starforged × Superior q): base def = 230 × 1.25 × 1.25 = 359.4. + Nightmare T14 Dark match 163 + Wolf T4 def_match 16 = 538. Off −115.
- *Replace stacking* (Starforged factor overridden at higher quality): base def = 230 × 1.25 = 287.5 + 179 enchant = 466. Off −43.
- *Starforged not applied at Superior reading*: base def = 230 × 1.25 = 287.5 + Nightmare nm 109 + Wolf match 16 = 412.5 → 413. Off +10.

None fits perfectly. The cleanest unblock is **Superior LWC, no enchant** (displayed def + hp) to isolate the Starforged × quality interaction from enchant-cap noise.

## Useful items to craft next, in priority order

### 1. Settle Superior LWC stacking (only remaining Starforged unknown)

The Starforged Milestone path is now parsed at sync and applied by `computePower` when `includeStarforgedStatBoosts: true`. Common LWC + Oblivion + Bahamut = 1027 lands exactly. The only remaining LWC question is how Starforged stacks with quality at Superior+.

| Reading needed | Why |
|---|---|
| **Superior LWC, no enchant** — displayed def and hp, plus AP | Three competing theories give different predictions for the unenchanted Superior base: 359 (multiplicative) / 288 (replace) / 288 (Starforged not applied). One unenchanted reading kills the wrong ones. |
| (optional) **Flawless or Epic LWC, no enchant** | Confirms the stacking rule at a third quality level. |

### 2. Sanity-check Rock Stompers / Torc of Peace displayed stats

The user confirmed both items have Starforged versions but they hadn't unlocked them when those readings were taken — which is exactly why the model's no-mod path matched (1727 and 1610 exact). Worth a cross-check on the displayed stats to lock in that nothing else is hidden.

| Reading needed | Why |
|---|---|
| **Rock Stompers Common, displayed def and hp** | Sheet has def 680, hp 42. Should display exactly 680/42 (no milestone unlocked → no boost). Confirms Urist's truly contributes nothing on the item. |
| **Torc of Peace Common, displayed def, hp, eva** | Sheet has def 720, hp 0, eva 0. Should display exactly those values. Confirms Myrthee's truly contributes nothing. |

### 3. T7 calibration — Chronos is off +3 to +4

Two Chronos Runeblade readings already pinned the gap. Solving them suggests T7 atk_base ≈ 39 (currently 38), T7 atk_match ≈ 60 (currently 58), T9 atk_match ≈ 76 (currently 73). One more T7 reading on a different stat distribution would confirm before changing the table.

**Craft one of these (both work; pick whichever is faster for you):**

| Item to craft | Element to apply | Spirit to apply | Model predicts (current values) | What the reading pins down |
|---|---|---|---:|---|
| **Owl Wing Wand** (Wand T7, atk 350 hp 11, Water + Air elem, Owl Wisdom spirit) | **Tide Element** (T7 Water match) | **Owl Spirit** (T7 match) | 538 | T7 atk_match (both slots match) + the T7 hp cap behaviour at hp 11 (T7 hp_match 12 > 11 → cap binds on both slots). The double-match is strongest for nailing atk_match cleanly. |
| **Bitterblack Blade** (Sword T7, atk 300 hp 9, Dark elem) | **Unholy Element** (T7 Dark match) | **Horse Spirit** (T7 non-match) | 447 | T7 atk_match + T7 atk_base + T7 hp_match + T7 hp_base in one go (small hp means caps bind on hp_match but not hp_base, so the two values separate). |

If both come back matching the current 538 / 447, the model is right and Chronos was a reading anomaly. If they come back +3 or so, the T7 calibration above is the fix.

### 4. T4 hp — XL Healing Potion off +5

If T4 hp_base is actually 3.5 (rather than the derived 3), the XL Healing Potion +5 gap closes exactly (19 + 3.5 + 3.5 = 26 → AP 130 ✓ vs current model 125). One more T4 hp-only reading would confirm.

**Craft this:**

| Item to craft | Element to apply | Spirit to apply | Model predicts (current values) | What the reading pins down |
|---|---|---|---:|---|
| **Shaved Ice** (Dessert T4, hp 20, Water elem) | **Ember Element** (T4 Fire non-match — keep both slots non-match for the cleanest hp_base read) | **Ox Spirit** (T4 non-match) | 130 | T4 hp_base alone (no atk/def on the item; both slots non-match, so no hp_match to muddy the math). If the in-game reading is 135 (i.e. +5 like XL Healing Potion), the hp_base = 3.5 theory is confirmed and we tighten the table. |

(Optional follow-up to pin T4 hp_match: **Shaved Ice + Bubble Element (T4 Water match) + Ram Spirit (T4 non-match)**. Predicts 135 currently; if hp_base is 3.5 and hp_match unchanged, predicts 138; if both are off, the gap tells us hp_match directly.)

### 5. Sia ±1 mystery (now genuine — re-verified)

Sia was re-verified by the user on a freshly crafted Common Sia (1695 in-game). Model still gives 1696. Slathered Slippers (same eva-only shape, eva 7%) lands exactly. No formula tweak fits both. Worth one more cross-check on a different eva-only item:

| Item to craft | Element to apply | Spirit to apply | Model predicts (current values) | What the reading pins down |
|---|---|---|---:|---|
| **Ghostbusters Suit** (Light Armor T15, def 690 eva 5%, no affinity) | **Blistering Element** (T14 Fire non-match) | **Bahamut Spirit** (T14 non-match) | 1634 (raw 1634.4 — `.4` fractional, rounds down) | A no-affinity eva-5% item gives a `.4` fractional instead of Sia's `.6`. If Ghostbusters reads 1634 exactly, Sia's +1 is specific to `.6` fractionals (a round-half-up edge case in the game). If it reads 1635, the +1 is a systemic eva-5% bias and we need to revisit the eva multiplier. |

### 6. Quality multipliers beyond Superior

Flawless (1.5), Epic (2), Legendary (3) all unverified. Legendary Q=3 amplifies any rounding artifacts by the largest factor, so non-integer stat values surface clearest there.

**Craft this:**

| Item to craft | Element to apply | Spirit to apply | Model predicts (current values) | What the reading pins down |
|---|---|---|---:|---|
| **Titan Admiral Arms (Legendary)** (Dual Wield T15, atk 1630 hp 51, Light + Water elem, Titan Solemnity spirit) | **Apotheosis Element** (T14 Light match) | **Titan Spirit** (T14 match) | 5561 (atk 5382 + hp 251) | Verifies the Legendary `×3` multiplier under stat-level rounding (no eva, no crit, hp cap doesn't bind, both slots match — the cleanest possible Legendary test). The Common reading (2443) is already pinned exact, so any deviation isolates to the quality multiplier and its rounding interaction. |

### Note on artifact stat-boost skills

The model carries `artifactStatMods` on the Blueprint (populated by `scripts/sync-data.ts` from a hardcoded map) for the three skills that modify base stats — Urist's Sturdiness, Savard's Aloofness, Myrthee's Left Hook. The `applyArtifactStatMods` helper applies them correctly. `computePower` deliberately does *not* apply them: in-game readings confirm all three are hero-only (the Lone Wolf Cowl +25% mystery turned out to be a Starforged Milestone, not Savard's). The fields are kept on the type for future tools (a hero / quest planner will want them).

## Artifact skills

Mapping from artifact-chest items to their unique artifact skills. The canonical sheet doesn't list this mapping anywhere; it's collected from in-game inspection. Most skills don't affect airship power — they're for combat, durability, or drop rates. The "Affects AP" column tracks what the ranker needs to model:

- **`+%`** — flat multiplier on the final AP. Modelled via `ARTIFACT_AP_BOOSTS` in `scripts/sync-data.ts`, folded into the existing `airshipPowerUpgradeBonus` field.
- **`no`** — the skill affects combat, durability, drop rates, or the wearer hero's stats — but does *not* affect the item's airship contribution. Confirmed empirically; the readings on Rock Stompers (1727) and Torc of Peace (1610) match the unmodified model exactly.

| Item | Type | Artifact skill | Skill effect | Affects AP? |
|---|---|---|---|---|
| Wyrmbane Cannon | Gun (T14) | Meirika's Secret | +20% airship power, +20% Dragon Invasion score | **+20% (modelled)** |
| Rock Stompers | Heavy Footwear (T14) | Urist's Sturdiness | +250 Defense, +25% Defense, eva fixed at 0 | no (hero-only; verified 1727 exact against the unmodified model) |
| Torc of Peace | Amulet (T14, atk 180, def 720) | Myrthee's Left Hook | +20% Health, +10% Evasion, equipped weapons grant no bonuses | no (hero-only; verified 1610 exact against the unmodified model — if Myrthee's `+10% Evasion` applied to the item, AP would double via the `1+10·eva` factor) |
| Kiku-Ichimonji | Sword (T14) | Muramonji's Style | +200% critical hit damage, crit chance fixed at 20% | no |
| Backfire Hammer | Mace (T14) | Bagginbak's Temper | +100% bonus from all items with Mace, user starts combat at 75% HP | no |
| Armor of Invincibility | Heavy Armor (T14) | Aster's Invincibility | Item cannot break | no |
| Thinkin' Cap | Magician Hat (T16) | Central Thinking | +50% XP → Attack (runtime effect on the wearer) | no |
| Pickaxe of Greed | Axe (T8) | Smidgen's Greed | User deals 2× damage against Golems and Keybearers | no |
| Lone Wolf Cowl | Rogue Hat (T9) | Savard's Aloofness | +40% Attack, +40% Defense, nullifies effects from Champions | no (hero-only — the LWC +25% mystery turned out to be a Starforged Milestone, not Savard's) |
| Grimar's Collection | Spell (T8) | Grimar's Collection (same name as the item) | This item's collection value is 5× higher than normal | no |
| Binder of Memories | Spell (T9) | Everyone's Memories | +50000% of your Card Collection Score is added to this item's value | no |

## Reporting format

```text
- Item: <name> (Common quality, or note quality)
  Element: <enchant name>   e.g. "Apotheosis Element"
  Spirit:  <enchant name>   e.g. "Titan Spirit"   (or "(none)")
  Starforged Milestone: yes / no — does the item have the "+25% Base
                        ATK/DEF/HP" milestone unlocked AND applied?
                        (For unenchanted base reads, also include the
                        displayed in-game ATK / DEF / HP so we can
                        decompose stat-cap and quality interactions
                        directly — saved us on the LWC mystery.)
  In-game AP: <number>
```

## Where we are (snapshot for picking this back up)

- **Tests:** `npm test` is green — 38 passing, 3 skipped (in-game readings the user hasn't taken yet). Run before any commit; main auto-deploys to Pages.
- **Model status:** 25 of 26 verified readings exact. Sia (Common, eva 5%) is the lone +1 holdout — re-verified by the user; no formula tweak fits both Sia and Slathered.
- **Recently landed:** T12 stat values calibrated (Tower of Thorns + Warrior Assegai + Titan Sword, all exact); Starforged Milestone parsing + UI toggle; stat-level integer rounding (closed Superior Frogsong −1).
- **Next up, ordered:**
  1. Superior LWC, no enchant — pins how Starforged stacks with quality.
  2. Rock Stompers / Torc of Peace displayed stats — sanity check that nothing hidden is in play.
  3. T7 calibration reading (any T7 with hp > 0).
  4. T4 hp reading (any T4 hp-only item that isn't XL Healing Potion).
  5. Sia anomaly — a second eva-only T14 item to see whether the +1 reproduces.
- **Don't forget:** every new in-game reading becomes a `.toBe(<exact>)` test in `src/data/enchant.test.ts` and a row in the verified table above. Re-tighten before pushing.
