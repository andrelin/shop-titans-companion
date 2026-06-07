# Dragon Invasion data points

In-game readings the model is calibrated against, plus the ones we still need. Visual/mechanical reference screenshots (Starforged borders, the AP readings behind key fixes) live in [`game-reference/`](game-reference/).

Quick workflow: craft at Common, apply the listed element + spirit enchants, read the in-game airship power, and post the number back. The test suite at `src/data/enchant.test.ts` pins the verified cases — regressing one of them now breaks `npm test`.

## Verified data points (model matches in-game)

All verified readings match the in-game value exactly except one: Sia (+1; re-verified, model 1696 vs 1695). Two things drove the recent work. (1) The Ghostbusters Suit starforged reading (2043) corrected the Starforged-Milestone math — the +25% boost multiplies the base **plus enchant** total and is applied as a *second rounding step* (round the quality+enchant stat, ×1.25, round again); confirmed by Lone Wolf Cowl unenchanted Superior (582) / Flawless (697) and enchanted Superior (758). (2) The enchant tiers **and base stats** were found to live authoritatively in the Blueprints tab; the enchant tables are now derived from synced data, distinguishing element vs spirit base (they differ below T9) with match = floor(1.5 × base). That re-grounding closed XL Healing (130) and both Chronos readings (463, 488) exactly. See point 12 and the "Enchant stats are authoritative in the sheet" section.

| Item | Type | Element | Spirit | In-game | App |
|---|---|---|---|---:|---:|
| Bottled Mirth | Potion (T7, hp 46, built-in Holy Element) | Holy (built-in, locked) | Walrus Spirit (T9 non-match) | 280 | 280 |
| Bottled Mirth | Potion (T7, hp 46, built-in Holy Element) | Holy (built-in, locked) | Horse Spirit (T7 non-match) | 270 | 270 |
| Chronos Runeblade | Sword (T7, atk 280 / def 70, Earth) | Wild (T7 element Earth match) | Horse Spirit (T7 non-match) | 463 | 463 (element/spirit split + match=floor(1.5×base)) |
| Chronos Runeblade | Sword (T7, atk 280 / def 70, Earth) | Primal (T9 element Earth match) | Horse Spirit (T7 non-match) | 488 | 488 (mixed-tier: T9 element + T7 spirit) |
| Cursed King's Aegis | Shield (T14, def 615 / hp 45, Dark, +25% Airship upgrade) | Oblivion (T14 Dark match) | Bahamut (T14 non-match) | 2099 | 2099 |
| Frogsong Gong | Instrument (T15, atk 1770 / def 443, Earth+Water) | Gaia (T14 Earth match) | Griffin (T14 non-match) | 2602 | 2602 |
| Frogsong Gong (Superior) | Instrument (T15, atk 1770 / def 443, Earth+Water) | Maelstrom (T14 Water match) | Bahamut (T14 non-match) | 3090 | 3090 (exact, after stat-level rounding) |
| Ghost Trap | Spell (T15, atk 2190 hp 75, no affinity) | Blistering (T14 Fire non-match) | Griffin (T14 non-match) | 2719 | 2719 |
| Ghostbusters Suit | Light Armor (T15, def 690, eva 5%, no affinity) | Oblivion (T14 Dark non-match) | Ouroboros (T14 non-match) | 1634 | 1634 (displayed def 908 = 690 + 109 + 109, both non-match) |
| Ghostbusters Suit + Starforged Milestone | Light Armor (T15, def 690, eva 5%, no affinity, +25% Base ATK/DEF/HP applied) | Oblivion (T14 Dark non-match) | Ouroboros (T14 non-match) | 2043 | 2043 (displayed def 1135 = 908 × 1.25 — pins that Starforged boosts base+enchant, not just base) |
| Imbued Blade | Sword (T4, atk 104 / def 26, "All" elemental affinity) | Oblivion (T14 match via "All") | Griffin (T14 non-match) | 343 | 343 |
| Lone Wolf Cowl + Starforged Milestone | Rogue Hat (T9, def 230 hp 19, Wolf Ferocity spirit only, no elem affinity, +25% Base ATK/DEF/HP applied) | Oblivion (T14 non-match — no Dark affinity on the item) | Bahamut (T14 non-match) | 1027 | 1027 (round(230 + 109 + 109) × 1.25 = 560 def; toggle `includeStarforgedStatBoosts` controls whether it flows through) |
| Lone Wolf Cowl + Starforged Milestone (Superior) | Rogue Hat (T9, def 230 hp 19, +25% Base ATK/DEF/HP applied), unenchanted | — (unenchanted) | — (unenchanted) | 582 | 582 (def round(230×1.25)=288 → round(288×1.25)=360; hp round(19×1.25)=24 → round(24×1.25)=30 — pins two-step rounding) |
| Lone Wolf Cowl + Starforged Milestone (Flawless) | Rogue Hat (T9, def 230 hp 19, +25% Base ATK/DEF/HP applied), unenchanted | — (unenchanted) | — (unenchanted) | 697 | 697 (def round(230×1.5)=345 → round(345×1.25)=431; hp round(19×1.5)=29 → round(29×1.25)=36 — second quality tier confirming two-step) |
| Lone Wolf Cowl + Starforged Milestone (Superior) | Rogue Hat (T9, def 230 hp 19, +25% applied) | Nightmare (T9 Dark element, non-match) | Wolf (T4 spirit, match) | 758 | 758 (displayed def 423, hp 50; pins Starforged two-step with enchants at Superior + the T4 spirit-match values def 18 / hp 6) |
| Malady's Robe | Clothes (T15, def 630 / hp 39, Light + Ouroboros) | Apotheosis (T14 Light match) | Ouroboros (T14 match) | 1732 | 1732 |
| Mundra's Decree | Spell (T15, atk 2205 / def 475, built-in Mundra Spirit) | Oblivion (T14 Dark non-match) | Mundra Spirit (built-in, 0 AP) | 2596 | 2596 |
| Potion of Renewal | Potion (T7, hp 32, no affinity) | Tornado (T14 non-match) | Behemoth (T14 non-match) | 480 | 480 |
| Rock Stompers | Heavy Footwear (T14, def 680 hp 42, Earth, Urist's Sturdiness artifact skill) | Gaia (T14 Earth match) | Bahamut (T14 non-match) | 1727 | 1727 (confirms artifact stat boosts don't affect AP) |
| Sia's Fancy Outfit | Light Armor (T15, def 670, eva 5%, Air affinity) | Tornado (T14 Air match) | Behemoth (T14 non-match) | 1695 | 1696 (+1) |
| Sky Pirate Outfit | Light Armor (T5, def 86, eva 5%, Air, +25% Airship upgrade) | Gale (T7 Air element match) | Xolotl Spirit (T5 non-match) | 317 | 317 (re-grounding: Gale T7 def-match 37 + Xolotl T5 def 18 → def 141) |
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
| XL Healing Potion | Potion (T4, hp 19, no affinity) | Ember (T4 element non-match, hp 3) | Ox Spirit (T4 spirit non-match, hp 4) | 130 | 130 (element/spirit hp split: 3 + 4) |
| XL Magic Potion | Potion (T5, hp 24, no affinity) — *spirit slot only, no element applied* | (none) | Xolotl Spirit (T5 non-match) | 145 | 145 (confirms T5 hp_base = 5) |

**Sia (model +1)** is the lone open case: raw 1695.6 → model rounds to 1696, in-game is 1695 (re-verified on a freshly crafted Common Sia). A non-eva item with a `.6` fractional rounds *up* (Titan Admiral Arms 2442.6 → 2443), so the down-rounding is specific to the eva chain, and no single rule fits both Sia and Slathered (1880.88 → 1881). See "Plan to close Sia" below — it needs one more eva-5% reading before any formula change.

## What the model is grounded on

1. **Base AP formula.** `(0.8·atk + 1.2·def + 5·hp) · (1 + 10·crit) · (1 + 10·eva)` — published by ST Central. Matches every stat-bearing blueprint in the canonical sheet within 1 AP.
2. **T14 atk + def + hp stat additions.**
   - `atk: base 164, match 246`  (verified across Frogsong, Mundra, Ghost Trap, Squire Sword, Imbued Blade, Titan)
   - `def: base 109, match 163`  (verified across Sia, Frogsong, Mundra, Malady, Slathered, Cursed King's Aegis, Imbued Blade)
   - `hp:  base  33, match  49`  (verified across Malady, Titan, Cursed King's Aegis, Wyrmbane, Ghost Trap, Potion of Renewal)
3. **Enchant stat values are now read from the authoritative Blueprints tab** (each enchant is a craftable blueprint with Tier + base ATK/DEF/HP), with **elements and spirits tracked separately** because they differ below T9 (see the "Enchant stats are authoritative in the sheet" section) and the match value = floor(1.5 × base). In-game readings cross-confirm the data: T5 hp_base 5 (XL Magic Potion), T7 hp_base 8 (Bottled Mirth + Horse), T9 hp_base 10 (Bottled Mirth + Walrus), T9 atk_base 48 / def_base 32 (Tower + Mammoth), T12 atk_base 99 / def_base 66 (three T12 readings), T4 element hp 3 + spirit hp 4 (XL Healing Potion), T7 spirit atk 41 / def 27 (Chronos), and T4 spirit def_match 18 / hp_match 6 (LWC Superior + Wolf).
4. **Each enchant's stat boost is capped at the (quality-scaled, *un*-Starforged) base value for that stat, per slot, as a raw float.** `enchant_atk_per_slot = min(enchant_atk, base.atk × q)` — same for def and hp. The Starforged Milestone boost is applied *after* the enchant is added (point 12), so it does not enter the cap. Verified across the cap-binding readings: Malady (hp), Squire Sword (atk), Imbued Blade and Tower of Thorns (def), and crucially Lone Wolf Cowl Common + Starforged (hp cap binds at base hp 19/slot → enchant hp 19 + 19, total raw hp (19 + 38) × 1.25 = 71.25 → display 71; capping at the Starforged-boosted 23.75 instead would predict 83, contradicting the in-game 1027). So the cap math stays in floats; only the final displayed stat rounds to integer.
5. **Element and spirit enchants apply at their own tier, not the item's.** Verified by Potion of Renewal (T7 item, T14 enchants applied). The `maxEnchantTier` control in the UI represents what the player has unlocked — the model uses it as the effective tier for both slots.
6. **Even T1 items can be enchanted.** Squire Sword + T14 enchants gave a valid in-game reading.
7. **Built-in enchant slots are locked and contribute 0 AP** — their stat boost is already in the item's base AP. Verified by Mundra's Decree.
8. **Spirit-tier tradeoff.** A matching spirit at a lower tier loses to a generic spirit at `maxEnchantTier`. The ranker compares both and picks whichever yields more AP, but always shows the matching spirit as an alternative when the player wants the skill effect.
9. **Quality multiplies base stats (atk / def / hp) before enchants are added; enchant table values themselves are not quality-scaled.** Common = 1, Superior = 1.25, Flawless = 1.5, Epic = 2, Legendary = 3. Verified by Superior Frogsong (raw atk 1770·1.25 + enchant 410 → display 2623; raw def 443·1.25 + enchant 272 → display 826; AP 3090 exact) and Superior Warrior Assegai unenchanted (raw atk 350, raw hp 12.5 → display 13, AP 345 exact). Quality also multiplies crit and eva by the same factor, though no Superior+ eva/crit reading has pinned that exactly yet.
10. **The +20/25% Bonus Airship Power upgrade is a flat multiplier on the unfloored enchanted AP, with one round at the end.** Cursed King's Aegis verified the application order: `(base + enchant) × upgrade → round`.
11. **Artifact-chest stat-boost skills are all hero-only.** Urist's Sturdiness (Rock Stompers, 1727 match), Myrthee's Left Hook (Torc of Peace, 1610 match), and Savard's Aloofness (Lone Wolf Cowl) all do *not* affect the item's airship contribution. Only flat-AP-multiplier skills (Meirika's Secret on Wyrmbane Cannon) affect AP. The model's `applyArtifactStatMods` stays for hero/quest tools but `computePower` ignores it. User note: the Rock Stompers and Torc of Peace readings were on items *without* Starforged Milestones applied (both items do have starforged versions, the user hadn't unlocked them) — which is exactly why those readings match the no-mod model.
12. **Starforged Milestones that add +X% to base ATK/DEF/HP affect AP — parsed and modelled, with two rounding steps.** The sync script parses strings like `"+25% Base ATK, DEF and HP"` into `Blueprint.starforgedStatBoosts: { atk, def, hp, eva, crit }` (currently only the +25%/all-three variant exists in the sheet). `computePower` applies them when `includeStarforgedStatBoosts: true`. The order is: quality-scale the base, add the capped enchant stats, **round to integer**, **then** multiply by the +X% milestone, **then round again**. The boost is on the **base + enchant** total (not base-only), and the intermediate round is load-bearing. Verified across four readings:
    - Ghostbusters Suit (no affinity, two non-match): un-starforged def 908 → 1634; starforged round(908 × 1.25) = 1135 → 2043.
    - Lone Wolf Cowl Common (no affinity, two non-match): round(230 + 109 + 109) × 1.25 = 560 def, round(57 × 1.25) = 71 hp → 1027.
    - Lone Wolf Cowl Superior unenchanted: round(230 × 1.25) = 288 → round(288 × 1.25) = 360 def → 582. A single combined round (230 × 1.25 × 1.25 = 359.375) gives 359, missing the in-game 360.
    - Lone Wolf Cowl Flawless unenchanted: round(230 × 1.5) = 345 → round(345 × 1.25) = 431 def → 697.

    The UI exposes the option as a "+25% Starforged stat boost" toggle (default off, since the player has to unlock the starforged version of the recipe for the boost to apply). *History:* an earlier model boosted base-only and the LWC test fabricated a Dark affinity so Oblivion "matched"; the two errors cancelled to the same def 560. The Ghostbusters readings (a genuinely no-affinity item) exposed it; the unenchanted Superior/Flawless LWC readings pinned the two-step rounding.
13. **Rounding.** Each displayed stat (atk / def / hp) is rounded to integer (round-half-up) *before* the AP formula runs; eva and crit stay as floats; final AP is round-half-up. When a Starforged Milestone applies there is a **second** round: the quality+enchant stat is rounded, multiplied by the +X% boost, then rounded again (point 12). Confirmed: Superior Warrior Assegai (raw atk 350.0 + raw hp 12.5 → display 350, 13 → AP 345 exact), Superior Frogsong (raw atk 2622.5 + raw def 825.75 → display 2623, 826 → AP 3090 exact), LWC Common + Starforged (round(230 + 218) × 1.25 = 560 + round(57) × 1.25 = 71.25 → 71 → AP 1027 exact), LWC Superior unenchanted + Starforged (round(287.5)=288 → round(360)=360 def → AP 582), LWC Flawless unenchanted + Starforged (round(345)=345 → round(431.25)=431 def → AP 697). The single exception is Sia: at Common (q=1) with no eva quality scaling, the stat-level rounding is a no-op since base+enchant=942 is already integer; the gap is elsewhere in the eva-multiplied AP chain.

## Unresolved data points

**Sia (Common, eva 5%) is the only remaining mismatch — model 1696 vs in-game 1695.** Everything else is exact, including the cases the re-grounding just closed (XL Healing 130, Chronos 463 & 488) and Sky Pirate Outfit (317 — Gale is a T7 element, Xolotl a T5 spirit; the re-grounded tiers make it exact). T9/T12/T14 stat values, spirit tiers, the Starforged two-step rounding, and match = floor(1.5 × base) are all grounded in the authoritative Blueprints-tab data.

### Plan to close Sia (the eva-rounding edge case)

The conflict, stated precisely (both user-verified, Common):

| Item | eva | raw AP | in-game | round() |
|---|---|---:|---:|---:|
| Sia's Fancy Outfit (def 942 after enchant) | 5% | 1695.6 | **1695** | 1696 ✗ |
| Slathered Slippers (def 922 after enchant) | 7% | 1880.88 | **1881** | 1881 ✓ |

A single rounding rule can't fit both: floor gives Sia 1695 ✓ but Slathered 1880 ✗; round gives Slathered 1881 ✓ but Sia 1696 ✗. Every intermediate-rounding decomposition tried (round the stat-sum before ×eva; round the eva bonus separately) reproduces Sia 1695 but lands Slathered at 1880, off −1. So the eva multiplier interacts with rounding in a way one more eva-5% data point should pin.

**Do NOT change the shared AP formula speculatively** — any tweak that fixes Sia currently turns the exact Slathered (1881) into a miss, which the calibration policy forbids. Gather data first.

Key observation: for a def-only eva-5% item the raw AP is `1.2 × def × 1.5 = 1.8 × def`, whose fractional part is set by `def`'s last digit (`8·d mod 10`: ends in 2 or 7 → `.6`). The three items below all land on exactly `.6` after a one-match-one-non-match enchant — Sia (def 942), Phoenix Feathers (922), Zephyr's Dampener (1027) — so they're direct comparables to Sia. The decisive question: do eva-5% items *systematically* round `.6` down (making Sia normal, and giving a rule we can apply to eva-5% without touching eva-7%), or is Sia a lone anomaly?

**Craft (Common), in priority order — model prediction noted so you can compare instantly:**

| Item to craft | Element | Spirit | Model predicts | What it decides |
|---|---|---|---:|---|
| **Phoenix Feathers** (Clothes T15, def 650, eva 5%, Fire+Air) | **Tornado** (T14 Air match) | **Behemoth** (T14 non-match) | **1660** (raw 1659.6; displayed def should be 922) | The decisive one — same post-enchant def 922 as Slathered but at eva 5%, so raw `.6`. In-game **1659** ⇒ eva-5% rounds `.6` down systematically (Sia is normal); **1660** ⇒ Sia is a lone anomaly. |
| **Zephyr's Dampener** (Amulet T15, def 755, eva 5%, Air) | **Tornado** (T14 Air match) | **Behemoth** (T14 non-match) | **1849** (raw 1848.6) | Second eva-5% `.6` point at a different def — confirms the pattern (expect 1848 if the rule holds). |

The eva-7% side is already anchored by Slathered (1880.88 → 1881, exact), so no eva-7% reading is needed. If Phoenix Feathers reads 1659, the fix is small and safe: apply the eva-5%-specific rounding the data shows (e.g. flooring the eva-5% AP), add Phoenix Feathers + Zephyr's Dampener as pinned tests, and tighten Sia from `±1` to `.toBe(1695)`. Re-run the full suite to confirm Slathered and every other reading stay exact — a fix that regresses Slathered is wrong.

### Lone Wolf Cowl — Starforged Milestone is fully modelled

LWC has a **Starforged Milestone that adds +25% to base ATK/DEF/HP**. The sync script parses this into `Blueprint.starforgedStatBoosts` and `computePower` applies it whenever `includeStarforgedStatBoosts: true`. The real blueprint has **no elemental affinity** (only a Wolf Ferocity spirit, which loses the spirit slot to a generic T14), so both enchant slots are non-match. Four readings pin the math, including the two-step rounding and the Starforged × quality stacking.

**Common LWC + Oblivion + Bahamut = 1027** (boost on base + enchant, then round):
- def: round(230 + 109 + 109) × 1.25 = round(448 × 1.25) = 560 ✓
- hp: round(19 + min(33,19) + min(33,19)) × 1.25 = round(57 × 1.25) = round(71.25) = 71 ✓ (cap binds at base hp 19 per slot, before the boost)
- AP = 1.2·560 + 5·71 = **1027** ✓

**Superior LWC unenchanted = 582** and **Flawless LWC unenchanted = 697** pin the two-step rounding and the Starforged × quality stacking (they stack multiplicatively, but with an intermediate round):
- Superior def: round(230 × 1.25) = 288 → round(288 × 1.25) = 360; hp: round(19 × 1.25) = 24 → round(24 × 1.25) = 30; AP = 1.2·360 + 5·30 = **582** ✓
- Flawless def: round(230 × 1.5) = 345 → round(345 × 1.25) = 431; hp: round(19 × 1.5) = 29 → round(29 × 1.25) = 36; AP = 1.2·431 + 5·36 = **697** ✓
- A single combined round (e.g. 230 × 1.25 × 1.25 = 359.375 → 359) misses the in-game 360 — the intermediate round is load-bearing.

*History:* an earlier version of the Common calc fabricated a Dark elemental affinity so Oblivion matched (def 163), and boosted base-only: 230 × 1.25 + 163 + 109 = 559.5 → also def 560. The two errors cancelled, so 1027 fit either way. The Ghostbusters Suit (genuinely no affinity, two non-match enchants) read 2043 starforged vs the base-only model's 1946 — only the boost-on-base+enchant rule reproduces it.

**Enchanted Superior LWC + Nightmare + Wolf = 758 (re-confirmed by the user, starforged — LWC can only be crafted starforged once unlocked).** This was the case that finally proved the Starforged two-step rounding is correct *with enchants at Superior quality*, once two old errors were corrected: Nightmare is **T9** (the old note said T14), and the spirit slot (Wolf, T4) uses the *spirit* base values, not the element ones.
- def: round(230×1.25 + 32 [Nightmare T9 def_base] + 18 [Wolf T4 def_match]) = round(337.5) = 338 → round(338×1.25) = round(422.5) = **423**
- hp: round(19×1.25 + 10 [Nightmare T9 hp_base] + 6 [Wolf T4 hp_match]) = round(39.75) = 40 → round(40×1.25) = **50**
- AP = 1.2·423 + 5·50 = **758** ✓ (in-game displayed def 423, hp 50)

Wolf's T4 spirit match (def 18, hp 6) = round(1.5 × the T4 *spirit* base def 12 / hp 4) — which is exactly the element/spirit split the Blueprints tab confirms below. Nightmare's T9 non-match values (32/10) were already pinned by Tower of Thorns + Mammoth and Bottled Mirth + Walrus.

### Enchant stats are authoritative in the sheet (Blueprints tab) — re-grounded ✅

Every element and spirit enchant is itself a craftable blueprint in the **Blueprints tab** (Type = "Enchantment"), carrying its **Tier** (col 5) and **base ATK/DEF/HP** (cols 44/45/46). The sync script now writes those into `data/enchantments.json`, and `enchant.ts` derives all the enchant tables from them at module load — so the values are authoritative and self-updating, no longer hand-maintained. This grounded two things we previously reverse-engineered or guessed:

1. **Spirit tiers** — read directly from the sheet into `SPIRIT_TIERS` (Squirrel/Armadillo/Hippo are T7 not T4/T5; Hydra/Tarrasque are T12 not T9). Mundra Spirit isn't in the list — it's always built-in, so it has no craftable tier.
2. **Enchant base stats per tier** — and crucially, **elements and spirits have different base stats at the lower tiers** (the model now reads the element slot from `ELEMENT_TABLE` and the spirit slot from `SPIRIT_TABLE` / per-family stats):

   | Tier | Element base (atk/def/hp) | Spirit base (atk/def/hp) | Notes |
   |---|---|---|---|
   | T4 | 16 / 11 / 3 | **19 / 12 / 4** | |
   | T5 | 26 / 18 / 5 | 26 / 18 / 5 | only Xolotl (spirit) |
   | T7 | 38 / 25 / 8 | **41 / 27 / 8** | |
   | T9 | 48 / 32 / 10 | 48 / 32 / 10 | Tiger spirit buffed → 50 / 33 / 10 |
   | T10 | 63 / 42 / 13 | 63 / 42 / 13 | only Quetzalcoatl (spirit) |
   | T12 | 99 / 66 / **20** | 99 / 66 / 20 | Christmas/Krampus/Kirin buffed → 104 / 69 / 21 |
   | T14 | 164 / 109 / 33 | 164 / 109 / 33 | |

   The **affinity-match value = floor(1.5 × base)** (verified: T14 def 109 → 163, hp 33 → 49; T12 atk 99 → 148; T4 spirit def 12 → 18, hp 4 → 6). A few event spirits (Tiger, Christmas, Krampus, Kirin) get a one-notch-higher base, applied when that spirit is matched.

This split closed every open low-tier gap, all now pinned exact:
- **XL Healing Potion** (Ember element hp 3 + Ox spirit hp 4) → 95 + 35 = **130** (was 125).
- **Chronos Runeblade + Wild + Horse** → **463** (was +3); **+ Primal(T9) + Horse(T7)** → **488** (was +4).
- The old element-only `hp[12].base = 18` is corrected to 20 (no T12 hp reading had caught it; the Warrior Assegai T12 reading still passes because its hp cap binds at the item's base 10).

All 30+ previously-exact readings stayed exact (full suite re-run). The model structure (two-step Starforged rounding, caps, quality) was unchanged — only the stat *source* moved to the authoritative data.

## Useful items to craft next, in priority order

### 1. Sia — the one open mismatch

Covered in detail under "Plan to close Sia" above. Top priority: craft **Phoenix Feathers (Common) + Tornado + Behemoth** (model 1660 / raw 1659.6). 1659 ⇒ eva-5% systematically rounds `.6` down; 1660 ⇒ Sia is a lone anomaly. Do not touch the AP formula before this reading — any current fix regresses the exact Slathered (1881).

### 2. Sanity-check Rock Stompers / Torc of Peace displayed stats

Both items have Starforged versions the user hadn't unlocked when the readings were taken — which is why the no-mod model matched (1727 and 1610 exact). A cross-check on the displayed stats locks in that nothing else is hidden.

| Reading needed | Why |
|---|---|
| **Rock Stompers Common, displayed def and hp** | Sheet has def 680, hp 42. Should display exactly 680/42 (no milestone unlocked → no boost). Confirms Urist's contributes nothing on the item. |
| **Torc of Peace Common, displayed def, hp, eva** | Sheet has def 720, hp 0, eva 0. Should display exactly those. Confirms Myrthee's contributes nothing. |

### 3. Quality multipliers above Flawless

Common, Superior (1.25) and Flawless (1.5) are all verified; Epic (2) and Legendary (3) are not. Legendary's ×3 amplifies any rounding artifact the most, so it surfaces issues clearest.

| Item to craft | Element to apply | Spirit to apply | Model predicts | What the reading pins down |
|---|---|---|---:|---|
| **Titan Admiral Arms (Legendary)** (Dual Wield T15, atk 1630 hp 51, Light + Water elem, Titan spirit) | **Apotheosis Element** (T14 Light match) | **Titan Spirit** (T14 match) | 5561 (atk 5382 + hp 251) | Verifies the Legendary ×3 multiplier under stat-level rounding (no eva/crit, hp cap doesn't bind, both slots match — the cleanest Legendary test). The Common reading (2443) is already exact, so any deviation isolates to the quality multiplier. |

### 4. (Maintenance) Rewrite the skipped Bottled Mirth test

The Bottled Mirth readings (280 with Walrus, 270 with Horse) are correct and listed in the verified table, but the test is skipped because it calls `computePower` with `maxEnchantTier` 14 instead of 9 / 7. Rewrite it to pass the right tier (the model already produces 280 / 270 there) and un-skip.

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

- **Tests:** `npm test` is green — 47 passing, 1 skipped (Bottled Mirth — needs the test rewritten to use the right maxEnchantTier; the reading itself is verified in the table). Run before any commit; main auto-deploys to Pages.
- **Model status:** all verified readings exact except **Sia (+1)** — the one open item. See "Plan to close Sia" above (gather one eva-5% reading, e.g. Phoenix Feathers, before touching the formula).
- **Recently landed:** (1) Starforged Milestone math corrected and fully pinned — the +25% boosts base **+ enchant** (not base-only) and is applied as a *second rounding step*. Pinned by Ghostbusters Suit (1634 / 2043) and LWC Superior/Flawless unenchanted (582 / 697) + Superior enchanted (758). (2) **Enchant tables re-grounded on the authoritative Blueprints tab** — sync now writes each enchant's tier + base stats to `data/enchantments.json`, and `enchant.ts` derives `ELEMENT_TABLE` / `SPIRIT_TABLE` / `SPIRIT_TIERS` from it (element≠spirit base below T9; event-spirit buffs; match = floor(1.5×base)). Closed XL Healing (130) and both Chronos (463, 488) exactly; corrected spirit tiers (Squirrel/Armadillo/Hippo → T7, Hydra/Tarrasque → T12) and T12 hp_base (18→20). Per-item bonus badges + explainer updates landed too.
- **Next up, ordered:**
  1. **Sia** — craft Phoenix Feathers (Common) + Tornado + Behemoth (predicted 1660 / raw 1659.6). 1659 ⇒ eva-5% rounds `.6` down systematically (add an eva-5% rule, keep eva-7% exact); 1660 ⇒ Sia is a lone anomaly. See "Plan to close Sia".
  2. Rock Stompers / Torc of Peace displayed stats — sanity check that nothing hidden is in play.
  3. Rewrite the skipped Bottled Mirth test to use maxEnchantTier 9 / 7 (it currently uses 14 and so doesn't reproduce the 280 / 270 readings).
- **Don't forget:** every new in-game reading becomes a `.toBe(<exact>)` test in `src/data/enchant.test.ts` and a row in the verified table above. Re-tighten before pushing. Never fabricate item data (affinities, bonuses) to make a test pass — see the calibration policy in CLAUDE.md.
