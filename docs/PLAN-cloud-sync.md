# Plan: cloud sync of per-user selections

Sync the player's per-user state — Starforged unlocks (`sf-unlocked`), per-item transcendence levels
(`transcendence-levels`), and any future preferences — across their **iPhone, iPad, and Mac**, with minimal login.
Chosen approach: **Firebase Auth (Google + Apple) + Cloud Firestore**, client-side only (the app stays a static GitHub Pages
SPA — no server to run).

The user already has an **Apple Developer Program** membership (used for their app *Planechaser*), so native "Sign in with
Apple" is viable at no extra cost — it just needs a Service ID + key configured for this web app.

## Principles

- **Opt-in and non-breaking.** Signed out, the app behaves exactly as today (localStorage, offline-capable). Signing in turns
  on cloud sync; signing out returns to localStorage. No account is ever required to use the tool.
- **Keep it a static site.** Everything runs in the browser via the Firebase JS SDK. Firebase web config keys are *public by
  design* (security comes from Firestore rules + Auth), so they can live in the committed bundle.
- **Small, single-user data.** One Firestore document per user holds a small settings blob; last-write-wins is fine (a single
  person across their own devices, not concurrent editors).

## Implementation status

| Phase | Scope | Status |
| --- | --- | --- |
| 0. Setup (user) | Create Firebase project, enable Google + Apple providers, add web app, share config | ⏳ PENDING (user) |
| 1. Firebase init + auth | SDK install, config module, auth hook (Google + Apple), sign-in/out UI | ⏳ PENDING (blocked on 0) |
| 2. Settings store | Firestore read/write/subscribe; localStorage fallback; first-sign-in migration | ⏳ PENDING (blocked on 1) |
| 3. Wire existing state | Route `sf-unlocked` + `transcendence-levels` through the synced store | ⏳ PENDING (blocked on 2) |
| 4. Rules + tests | Firestore security rules; unit-test the store's merge/serialize logic | ⏳ PENDING (rolls with 2–3) |

## Data model

Firestore, one document per user:

```
users/{uid} = {
  starforged: string[],                    // item names with Starforged unlocked
  transcendenceLevels: { [name]: number }, // item name → 0–3
  schemaVersion: 1,
  updatedAt: <server timestamp>,
}
```

Security rules (a user can only touch their own doc):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## Sync behaviour

- **Signed out:** read/write `localStorage` exactly as now.
- **On first sign-in (no cloud doc yet):** upload the current localStorage selections to the user's new doc (so the device you
  sign in from seeds the cloud). Keep writing localStorage too, as an offline cache.
- **On sign-in (cloud doc exists):** the cloud is the source of truth — load it into state and mirror to localStorage. (Simple
  and predictable; a smarter union-merge can come later if it ever matters.)
- **On change while signed in:** write to Firestore (debounced ~500 ms) and to localStorage.
- **Live updates:** subscribe to the doc so a change on the iPad shows on the Mac without a reload.
- **On sign-out:** stop syncing; keep the last localStorage snapshot so nothing is lost.

## Account linking (either provider opens the same account)

Requirement: signing in with **both** Google and Apple must thereafter open the **same** account and data — not two separate
ones. Firebase creates a distinct `uid` per provider by default, so this needs handling:

- **Firebase setting:** Authentication → Settings → *User account linking* → **"Link accounts that use the same email
  address."** With this on, Google and Apple sign-ins that share the same verified email resolve to one `uid`, so the
  `users/{uid}` doc is shared automatically.
- **Apple "Hide My Email" caveat:** Apple can issue a private relay address that won't match the Google email, defeating
  email-based linking. Mitigations:
  - Sign in with Apple using **"Share My Email"** (not "Hide"), so both providers carry the same address — simplest for a
    personal account.
  - **Explicit linking** for full robustness: when already signed in, offer *Link Google / Link Apple* which calls
    `linkWithPopup(auth.currentUser, provider)` — attaching the second credential to the current `uid` regardless of email.
    Also catch `auth/account-exists-with-different-credential` on sign-in and link the pending credential into the existing
    account. This guarantees the requirement even when emails differ.
- Data is keyed by `uid` throughout, so once the two providers share a `uid` (via either mechanism) sync is automatic.

## Setup steps (user — can start now, in parallel)

1. **Firebase project:** [console.firebase.google.com](https://console.firebase.google.com) → *Add project* (free "Spark"
   plan). Then *Build → Firestore Database → Create* (production mode).
2. **Web app:** Project settings → *Your apps* → add a **Web** app; copy the `firebaseConfig` object (apiKey, authDomain,
   projectId, appId, …) and send it to me.
3. **Google provider:** *Build → Authentication → Sign-in method →* enable **Google** (one click).
4. **Apple provider:** enable **Apple** in the same list. Under your Apple Developer account: create a **Services ID**
   (identifier for the web app), an **Apple sign-in Key**, and configure the return URL Firebase shows
   (`https://<authDomain>/__/auth/handler`). Paste the Services ID + Key ID + Team ID + private key into the Firebase Apple
   provider config. (I'll give you the exact click-path once we're at this step.)
5. **Account linking:** Authentication → Settings → *User account linking* → **"Link accounts that use the same email
   address"** (see the section above; combined with explicit linking in code for the Hide-My-Email case).
6. **Authorized domains:** Authentication → Settings → *Authorized domains* → add the custom domain `stc.lindjo.no` (and
   `di.lindjo.no` if it serves the app), the GitHub Pages domain `andrelin.github.io`, and `localhost` for dev. See
   `docs/PLAN-hosting.md`.
7. Send me the web `firebaseConfig`. Apple's secrets stay in the Firebase console — I never need them in code.

1. **Firebase project:** [console.firebase.google.com](https://console.firebase.google.com) → *Add project* (free "Spark"
   plan). Then *Build → Firestore Database → Create* (production mode).
2. **Web app:** Project settings → *Your apps* → add a **Web** app; copy the `firebaseConfig` object (apiKey, authDomain,
   projectId, appId, …) and send it to me.
3. **Google provider:** *Build → Authentication → Sign-in method →* enable **Google** (one click).
4. **Apple provider:** enable **Apple** in the same list. Under your Apple Developer account: create a **Services ID**
   (identifier for the web app), an **Apple sign-in Key**, and configure the return URL Firebase shows
   (`https://<authDomain>/__/auth/handler`). Paste the Services ID + Key ID + Team ID + private key into the Firebase Apple
   provider config. (I'll give you the exact click-path once we're at this step.)
5. **Authorized domains:** Authentication → Settings → *Authorized domains* → add the GitHub Pages domain
   (`andrelin.github.io`) and `localhost` for dev.
6. Send me the web `firebaseConfig`. Apple's secrets stay in the Firebase console — I never need them in code.

## Code plan (once config is in hand)

- `npm i firebase`.
- `src/data/firebase.ts` — init `initializeApp(firebaseConfig)`, export `auth` and `db`. Config imported from
  `src/firebase-config.ts` (committed — public keys) with a `.example` template; nothing secret is committed.
- `src/data/auth.ts` — `signInWithPopup` for `GoogleAuthProvider` and `OAuthProvider('apple.com')`; `signOut`; an
  `onAuthStateChanged` subscription.
- `src/data/settingsStore.ts` — a framework-agnostic store: `load()`, `save(partial)`, `subscribe(cb)`, backed by Firestore
  when signed in and localStorage otherwise, with the migration logic above. Pure serialization/merge helpers are unit-tested.
- `src/hooks/useSyncedSettings.ts` — React hook exposing `{ user, signIn, signOut, starforged, transcendenceLevels, set… }`.
- Wire `DragonInvasion.tsx` to read/write those two pieces of state through the hook instead of its local `useState` +
  `localStorage` effects (keeping the exact same behaviour when signed out).
- `src/App.tsx` — a small **Sign in** / avatar + **Sign out** control in the header.
- Commit the Firestore rules to `firestore.rules` for reference (deployed via the console or CLI).

## Notes / trade-offs

- Adds the Firebase SDK (~tens of KB gzipped, tree-shaken to Auth + Firestore) — the app's first runtime dependency. Justified
  by the cross-device requirement and kept opt-in.
- Offline: Firestore's local cache keeps it working offline while signed in; our localStorage mirror is the extra safety net.
- This is independent of the Dragon Invasion event, so no event-timing pressure.
