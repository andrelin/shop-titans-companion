# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev        # Vite dev server
npm run build      # tsc -b (type-check) + vite build → dist/
npm run lint       # tsc -b --noEmit (type-check only; no ESLint in this repo)
npm run test       # vitest run (one-shot)
npm run test:watch # vitest watch
npm run sync       # tsx scripts/sync-data.ts — re-download CSVs → data/*.json
```

Run a single test by name: `npx vitest run -t "<test name substring>"`. The only test file is `src/data/enchant.test.ts`, which pins the in-game-verified power calculations.

## Architecture

A Vite + React + TypeScript single-page app deployed to GitHub Pages, structured as a collection of independent "tools" sharing one game-data layer. Only one tool exists so far (Dragon Invasion item-power ranker); the layout anticipates more.

**Data pipeline (build-time, not runtime).** `scripts/sync-data.ts` downloads tabs from the canonical community Google Sheet as CSV, parses them by fixed column index, and writes typed JSON to `data/` — which is committed to git. The app loads that committed JSON via a static import (`src/data/load.ts`), so there is no runtime fetch of game data. A scheduled GitHub Action (`.github/workflows/sync-data.yml`, daily 06:00 UTC) re-runs the sync and commits any diff. A separate Action (`pages.yml`) builds and deploys on push to `main`.

- The CSV column indices in `scripts/sync-data.ts` (`COL`) are hardcoded against a merged-cell header layout. `parseBlueprints` asserts the header labels match and throws if the upstream sheet shifts columns — if a sync breaks, check those indices first.
- `src/data/freshness.ts` runs in the browser to compare the committed sheet version against the live sheet's Home tab and show a "data is stale" banner. This is only a notice; it never fetches the actual data.

**Power model (`src/data/enchant.ts`).** This is the heart of the project and the part worth understanding before changing anything. It reverse-engineers Shop Titans' airship-power formula, calibrated against real in-game readings. Key facts encoded here:

- Base AP: `(0.8·atk + 1.2·def + 5·hp) · (1 + 10·crit) · (1 + 10·eva)`, with stats stored as decimals.
- Quality is a **linear post-multiplier** on base AP (Common 1 → Legendary 3); enchant stat additions stay flat and are *not* quality-scaled.
- Each item has two enchant slots (element + spirit). Element/spirit enchants apply at the **player's** unlocked tier (`maxEnchantTier`), not the item's tier. `ENCHANT_TABLE` holds per-tier stat additions; affinity-matched enchants use the higher `match` value.
- Enchant stat gain per slot is **capped at the item's own base stat** for that stat (`min(enchantValue, baseStat)`).
- Built-in (locked) element/spirit enchants are already baked into the sheet's listed AP, so they contribute **0 additional** AP.
- `+X% Bonus Airship Power` upgrades (and known artifact-skill boosts, see `ARTIFACT_AP_BOOSTS`) are a multiplier applied to the **un-rounded** AP; the result is rounded once at the very end. Intermediate rounding loses fractional AP the game keeps.
- The final rounding is **`Math.round` (round-half-up)**, not `Math.floor`. Verified empirically: round matches 13 of 14 in-game readings exactly; floor only matched 9. The game rounds half-up at the displayed AP integer.

## Calibration policy (non-negotiable)

- **The goal is to reproduce the in-game AP exactly, not "approximately."** The model already matches 13 of 14 verified readings to the exact integer; the remaining gaps are the next thing to fix, not slack to live with. Don't introduce changes that widen any existing exact match into a tolerance.
- **Every in-game reading becomes a pinned test in `src/data/enchant.test.ts`.** Use `.toBe(<exact value>)`. Only fall back to `Math.abs(got - X) <= 1` when the user hasn't re-verified the reading and we already know the model is off — and the inline comment must explain why. Tightening a tolerance back to `.toBe` is always preferred over loosening one further.
- **`npm test` must pass before committing AND before pushing.** A red suite means the model and the in-game truth have diverged, which is exactly when you must not commit. Always re-run the full suite after staging a change and before `git push` — pushing a broken main branch poisons the shared history and the deployed site. If a test fails, fix it (or revert the offending change) before pushing; never push "and fix in a follow-up."
- **`docs/data-points.md` must stay current with every code change that touches the power model.** When you add a verified reading, add the row to the table *and* tighten the test. When you change a stat value, a cap, a rounding step, or anything else that affects the calibrated math, revisit both the "What the model is grounded on" section and the verified table to confirm they still match reality. Out-of-date docs here cause real confusion — they are the load-bearing reference for which behaviours are confirmed vs guessed.
- **The verified data-points table in `docs/data-points.md` stays sorted alphabetically by item name (case-insensitive, parenthetical suffixes like "(Superior)" ignored as sort key, stable for multiple readings on the same item).** When you add a new row, drop it in the right alphabetical slot — don't append to the bottom. Other tables in the file (unresolved, useful-to-craft, artifact skills) don't need to be sorted.
- **When recommending an in-game reading to collect, always name the specific item, the specific element enchant, and the specific spirit enchant — never "any T7 item with hp > 0", never "any T15 Light Armor with eva 5%".** The user is the one crafting these in-game and doesn't want to scan menus to find candidates. If multiple items would work, pick one and name it (preferably the one already most-confirmed in the data sheet, or the one that gives the cleanest decomposition for the unknown you're trying to pin). State the model's predicted AP next to each recommendation so the user can compare instantly against the in-game value.

**`docs/data-points.md`** is the calibration log: a table of in-game AP readings the model is verified against, what each reading nailed down, the open unresolved cases, and a to-craft priority list of useful future readings. When the user reports a new in-game number, this is where it gets recorded *and* a corresponding case is added to `enchant.test.ts`. Several spirit/enchant tiers in `enchant.ts` are marked "inferred" / "unverified" — treat those as approximate until a reading confirms them, and flip them to "verified" in the docs the moment they do.

## Conventions

- Shared game-data types live in `src/data/types.ts` so every tool imports the same shapes. New tools go under `src/tools/<Name>/` and are registered in the `TOOLS` array in `src/App.tsx` (the active tool is reflected in the URL hash for shareable links).
- `docs/future-tools.md` is the roadmap for additional tools (quest planner, hero loadouts, crafting ROI, etc.).
