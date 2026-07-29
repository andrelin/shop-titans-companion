// Per-user selections that should follow the player across devices — currently
// their Starforged unlocks and per-item transcendence levels. Kept as one plain
// blob so it maps 1:1 to a single Firestore document when cloud sync lands
// (docs/PLAN-cloud-sync.md); the localStorage backend and the future Firestore
// backend both round-trip this shape.
//
// This module is pure (no localStorage / no React) so the normalize + merge
// logic is unit-tested in isolation.

export interface SyncedSettings {
  starforged: string[]; // item names with Starforged unlocked
  transcendenceLevels: Record<string, number>; // item name → 1–3 (0/absent = none)
}

export const EMPTY_SETTINGS: SyncedSettings = {
  starforged: [],
  transcendenceLevels: {},
};

// The number of transcendence slots an item can have. Levels are clamped to
// this; bump it here (one place) if the game ever adds a fourth slot.
export const MAX_TRANSCENDENCE_LEVEL = 3;

// Clamp a raw level to the valid 0..MAX range (0 = none/invalid). Shared by the
// store's normalize step and the per-item setter so they can never disagree.
export function clampLevel(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(MAX_TRANSCENDENCE_LEVEL, n);
}

// localStorage keys: the combined blob, plus the two legacy per-feature keys
// migrated in once so existing selections survive the switch.
export const SETTINGS_KEY = "st-settings";
export const LEGACY_STARFORGED_KEY = "sf-unlocked";
export const LEGACY_TRANSCENDENCE_KEY = "transcendence-levels";

// Load settings from a storage getter (localStorage.getItem, or a fake in
// tests). Prefers the combined blob; on its first absence, migrates the two
// legacy keys. Pure and never throws, so the migration is unit-testable without
// a DOM.
export function loadSettings(
  getItem: (key: string) => string | null,
): SyncedSettings {
  try {
    const raw = getItem(SETTINGS_KEY);
    if (raw) return normalizeSettings(JSON.parse(raw));
    const sf = getItem(LEGACY_STARFORGED_KEY);
    const tl = getItem(LEGACY_TRANSCENDENCE_KEY);
    if (sf || tl) {
      return normalizeSettings({
        starforged: sf ? JSON.parse(sf) : [],
        transcendenceLevels: tl ? JSON.parse(tl) : {},
      });
    }
  } catch {
    /* corrupt/unavailable storage — fall through to empty */
  }
  return EMPTY_SETTINGS;
}

// Coerce arbitrary parsed JSON (localStorage or a Firestore doc) into a valid,
// deduped SyncedSettings — dropping junk, clamping levels to 1–3, and discarding
// zero/absent levels. Never throws.
export function normalizeSettings(raw: unknown): SyncedSettings {
  const r = (raw ?? {}) as Partial<SyncedSettings>;
  const starforged = Array.isArray(r.starforged)
    ? [...new Set(r.starforged.filter((x): x is string => typeof x === "string"))]
    : [];
  const transcendenceLevels: Record<string, number> = {};
  if (r.transcendenceLevels && typeof r.transcendenceLevels === "object") {
    for (const [name, v] of Object.entries(r.transcendenceLevels)) {
      const n = clampLevel(v);
      if (n > 0) transcendenceLevels[name] = n;
    }
  }
  return { starforged, transcendenceLevels };
}

// Union two settings blobs — used for the first-sign-in migration (seed the
// cloud from the device's local selections) once cloud sync exists. On a
// per-item conflict `b` wins, so pass the authoritative side as `b`.
export function mergeSettings(
  a: SyncedSettings,
  b: SyncedSettings,
): SyncedSettings {
  return {
    starforged: [...new Set([...a.starforged, ...b.starforged])],
    transcendenceLevels: { ...a.transcendenceLevels, ...b.transcendenceLevels },
  };
}
