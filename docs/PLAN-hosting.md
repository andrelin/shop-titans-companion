# Plan: custom domains (stc.lindjo.no + di.lindjo.no)

Host the app at **`stc.lindjo.no`**, and route **`di.lindjo.no`** to the Dragon Invasion power ranker.

Currently the site is a GitHub Pages *project* page served at `andrelin.github.io/shop-titans-companion/`, so Vite's `base`
is `/shop-titans-companion/`. A custom domain serves at the domain **root**, so `base` must become `/`.

> ⚠️ **Sequencing matters.** Flipping `base` to `/` and adding a CNAME *before* DNS + the GitHub Pages custom domain are live
> will break the current `github.io/shop-titans-companion/` site (assets 404 and github.io redirects to a domain that doesn't
> resolve yet). With the Dragon Invasion event ~1 day out, do **DNS first**, confirm it resolves, then flip the repo config.

## Implementation status

| Phase | Scope | Status |
| --- | --- | --- |
| 0. DNS + Pages (user) | CNAME records; set custom domain in repo Settings → Pages; enforce HTTPS | ⏳ PENDING (user) |
| 1. Repo flip (me) | `base` → `/` via `VITE_BASE`, add `public/CNAME`; push after DNS is live | ⏳ PENDING (blocked on 0) |
| 2. di.lindjo.no route | Redirect di.lindjo.no → the DI ranker | ⏸️ DEPRIORITIZED — already a www-forward to GitHub Pages; revisit later |
| 3. Firebase domains | Add stc.lindjo.no (and di.lindjo.no) to Firebase authorized domains | ⏳ PENDING (rolls with cloud-sync) |

## stc.lindjo.no — the app

1. **DNS (user):** at wherever `lindjo.no` is managed, add a CNAME record: `stc` → `andrelin.github.io`.
   (An apex would need A/ALIAS records, but a subdomain is a clean CNAME.)
2. **GitHub Pages (user):** repo Settings → Pages → *Custom domain* → `stc.lindjo.no` → Save; wait for the DNS check to go
   green, then tick **Enforce HTTPS**.
3. **Repo (me), after 1–2 are green:**
   - Set `VITE_BASE=/` for the production build. The Vite config already honours `VITE_BASE` (falls back to
     `/shop-titans-companion/`), so I'll set it in the `pages.yml` build step — no source change needed beyond the workflow.
   - Add **`public/CNAME`** containing `stc.lindjo.no` so the deployed artifact keeps the custom domain (Vite copies `public/`
     into `dist/`).
   - Push → the deploy publishes to `stc.lindjo.no`; `github.io/shop-titans-companion/` then 301s to it.

## di.lindjo.no — route to the DI ranker (DEPRIORITIZED)

**Currently `di.lindjo.no` is already a www-forward to the GitHub Pages site, so this needs no work right now** — it keeps
landing users on the app (which defaults to the DI ranker), and once `stc.lindjo.no` is canonical the forward chains through to
it. Revisit only if a cleaner direct route is wanted later.

GitHub Pages allows **one** custom domain per site (the CNAME), and it 301-redirects any other domain to that canonical one —
so a second GitHub-Pages custom domain can't serve a different route directly. The DI tool lives at the hash route
`stc.lindjo.no/#/dragon`. If revisited, options best first:

- **A. Redirect at the DNS/CDN layer (recommended).** If `lindjo.no` is on Cloudflare (or a host with redirect rules), add a
  rule: `di.lindjo.no/*` → `https://stc.lindjo.no/#/dragon` (301). Clean, no extra hosting. *Needs to know where DNS lives.*
- **B. Tiny redirect site.** A separate one-file GitHub Pages repo with `CNAME = di.lindjo.no` and an `index.html` that does
  `location.replace("https://stc.lindjo.no/#/dragon")`. Works anywhere, one more repo to keep.
- **C. Same-site hostname detection** — only viable if di.lindjo.no actually serves this app (it won't, under GH Pages'
  single-domain rule), so noted only for completeness. If we ever move to a host without that limit, the app can read
  `location.hostname` and default the tool to Dragon Invasion for `di.*`.

Once chosen, `di.lindjo.no` lands the user on the DI ranker. (The app already defaults to the Dragon Invasion tool, so even a
bare redirect to `stc.lindjo.no` shows it today; the `#/dragon` hash keeps it correct once more tools exist.)

## Interactions

- **Cloud sync:** add `stc.lindjo.no` (and `di.lindjo.no` if it serves the app) to Firebase → Authentication → authorized
  domains, alongside `localhost`. Tracked in `docs/PLAN-cloud-sync.md`.
- **Data sync workflow:** unaffected — it commits data and dispatches the existing deploy.

## Open question for the user

None blocking. (The `di.lindjo.no` redirect approach — which depended on where `lindjo.no` DNS is managed — is deprioritized
since it already www-forwards.) For `stc.lindjo.no` you just add the `stc` CNAME wherever `lindjo.no` DNS lives and set the
custom domain in repo Settings → Pages.
