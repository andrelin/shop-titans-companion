# Next steps (session pickup)

Where things stand as of the 2026-07-29 session, so work can resume on any machine. Everything below is committed and pushed.
Detailed designs live in the linked plan docs.

## Shipped & live this session

- CI: the scheduled data sync now dispatches the Pages deploy **only when it actually commits** a data change.
- Data **changelog + commit summaries** (`scripts/sync-data.ts`, `docs/data-changelog.md`).
- Transcendence + acquisition **data parsing** (slots, seal costs, unlock/antique/premium).
- **Acquisition badges** (💎 premium / 🏺 in Antiques / 🎁 from chest) in the Dragon Invasion table.
- **Experimental transcendence AP** — opt-in, default-off, loudly flagged: a global override + **per-item level** control,
  blue-themed to match the game, with the amber "experimental/unverified" overlay.
- Per-user selections moved behind a **`useSettings` store seam** (`st-settings` blob, migrates the old keys) — ready for
  cloud sync to plug in.
- Docs: `PLAN-transcendence.md`, `PLAN-cloud-sync.md`, `PLAN-hosting.md`, `design-conventions.md`.

## Waiting on YOU (do at your leisure — unblocks the next builds)

1. **Cloud sync** (`docs/PLAN-cloud-sync.md`): create a free Firebase project (Firestore + a Web app), enable **Google + Apple**
   sign-in + **account linking (same email)**, and send me the web `firebaseConfig`. (Apple uses your existing Developer
   membership — a Services ID + key.)
2. **Custom domain `stc.lindjo.no`** (`docs/PLAN-hosting.md`): add a DNS `CNAME stc → andrelin.github.io`, set the custom domain
   in repo Settings → Pages, wait for the green check + enforce HTTPS. (`di.lindjo.no` already www-forwards — no action.)
3. **Transcendence calibration** (`docs/PLAN-transcendence.md`, Phase 2): **only possible during an active Dragon Invasion
   event** (monthly — effective AP isn't visible otherwise). When one is live, transcend **Chapter Cauchemar slot 1** (safe:
   it's your Accessories leader) and report its **Common** AP immediately before and after, same enchants. That converts the
   experimental estimate into a verified model.

## Ready for ME to build next session

- **Firebase auth + Firestore sync** behind the `useSettings` seam + sign-in UI — once the `firebaseConfig` arrives (Phase 1–4).
- **Flip to `stc.lindjo.no`** — set `VITE_BASE=/` in the deploy workflow + add `public/CNAME` + push — once DNS is green.
- **Calibrate the transcendence model** and pin the reading as a `.toBe` test; tighten `docs/data-points.md` — once a reading
  arrives.
- **Transcendence Seal Recommender tool** (`docs/PLAN-transcendence.md`, Phase 6) — fully designed (net-lineup-gain vs the free
  category leader → opportunity cost → AP-per-seal → 1/2/3 target depth defaulting to 3 → ownership badges → gem/hero
  disclaimer). Can be built now on the experimental model (flagged) or after calibration. Blue-themed per `design-conventions.md`.

## Parked

- **Item images** (task): the site's icons key off the game's internal item `uid`, which isn't in the official sheet — needs a
  separate uid source. Low priority.
