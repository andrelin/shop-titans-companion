# Design conventions (visual language)

Keep the UI consistent with Shop Titans and internally coherent as more tools are added.
When adding UI, match these; when changing them, update this doc in the same change.

## Upgrade-path colour themes — distinguish by COLOUR

Shop Titans gives each blueprint-upgrade path a **whole colour theme** — borders, a tinted panel background, **and** stars —
not just an icon. It tells the paths apart by **colour**, and reuses the same 5-pointed star shape across all of them. Mirror
that: when building path-specific UI (e.g. the transcendence recommender, or richer transcendence panels), theme the whole
surface in the path's colour, not only the marker.

| Path | Theme colour | In-game look | In app |
| --- | --- | --- | --- |
| **Starforged** | iridescent / **rainbow** | rainbow stars, holographic accents | `.sf-star.on` — a pink→purple→blue→green→gold gradient clipped to the star |
| **Ascension** | **gold / amber** | gold borders, gold-tinted bg, gold stars | not surfaced yet; use gold if added |
| **Transcendence** | **blue** | blue borders, blue-tinted bg, blue stars | `.transc-seal` / `.transc-select` in `#4a90e2` |

Other in-game cues worth matching if we theme these surfaces: the **confirm/action button is green** (Transcend / Ascend /
Craft), and each path has its own **currency icon** (Transcendence Seals = a blue rosette/ribbon; Ascension Shards; etc.) — the
currency art can't be an inline marker (see the `<select>` constraint), so represent the path with its coloured star glyph.

Colour is the real differentiator; shape is secondary (we use a 4-pointed `✦` for transcendence vs the 5-pointed `★` for
Starforged just to add separation, but **don't rely on shape alone** — match the colour).

Glyph notes / rejected alternatives:

- `✦` (U+2726, four-pointed star) — the transcendence marker.
- `❖` (U+2756) — **rejected**: renders as a plain tilted square in common fonts.
- teal/cyan — **rejected**: the in-game star/seal is blue, not teal.
- The rosette **Seal** currency icon can't be used as the marker — see the `<select>` constraint below.

## Experimental / unverified cue

Anything **not calibrated against in-game readings** (today: the transcendence power estimate) is flagged with one consistent
**amber** language, kept SEPARATE from the feature's identity colour:

- Amber `#fbbf24` accent + a `🧪` flask + the word "(experimental)" + **dashed** borders/dividers
  (`.transc-select` dashed-amber frame, `.experimental-banner`, `.transcendence-row` dashed divider).
- Two signals shown together: the blue `✦` says *"this is Transcendence"*; the amber `🧪`/dashed says *"the numbers are
  estimates"*. Don't collapse them into one.
- Experimental controls get their **own row/section**, visually divided from the verified controls.

## Acquisition badges (not-freely-craftable items)

`src/data/acquisition.ts` → `.bonus-*` chips in `ItemBonuses`. One badge, three states by priority:

- **🏺 in Antiques** (`.bonus-antique`, tan) — a premium item past its **UTC** antique-rotation date; buyable by anyone now.
- **🎁 from chest** (`.bonus-chest`, cyan) — a random chest drop; can't be crafted or bought directly (RNG ownership).
- **💎 premium** (`.bonus-premium`, magenta) — a pack/pass the player may or may not own.

Craftable items get no badge. Antique dates are UTC — parse with `Date.parse(\`${date} UTC\`)`, never local time.

## Chip / accent palette (`src/index.css` `.bonus-*`)

element affinity `#7aa9ff` (blue) · spirit `#c084fc` (purple) · built-in `--accent` (gold) · +Airship-Power `#fbbf24` (gold) ·
premium `#f0abfc` (magenta) · in-Antiques `#d6b98c` (tan) · from-chest `#67e8f9` (cyan) · transcendence seal `#4a90e2` (blue) ·
experimental `#fbbf24` (amber). Quality colours live in `src/data/types.ts` (`QUALITY_COLOR`).

## Hard constraint: `<select>` options are text-only

A `<select>`'s `<option>`s can render **plain text only** — no SVG, no recolourable image, no styled markup. Any marker that
must appear inside a dropdown option (like the per-item transcendence level control) has to be a **text glyph/emoji**. This is
why the transcendence marker is the `✦` glyph, not the game's rosette Seal artwork.

## Per-user state / persistence

Per-user selections (Starforged unlocks, transcendence levels, future prefs) go through `useSettings` /
`src/data/settings.ts` — one `st-settings` blob (migrated from the legacy `sf-unlocked` / `transcendence-levels` keys). New
synced preferences should join that blob so they cloud-sync for free once the Firebase backend lands (`docs/PLAN-cloud-sync.md`).
