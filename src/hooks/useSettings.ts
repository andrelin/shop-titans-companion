import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clampLevel,
  loadSettings,
  SETTINGS_KEY,
  type SyncedSettings,
} from "../data/settings";

// Player selections that should eventually sync across devices. Today they are
// persisted to localStorage; this hook is the single seam the future Firestore
// backend (docs/PLAN-cloud-sync.md) plugs into without touching callers.
export function useSettings() {
  const [settings, setSettings] = useState<SyncedSettings>(() =>
    loadSettings((k) => localStorage.getItem(k)),
  );

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable — selection just won't persist this session */
    }
  }, [settings]);

  // Exposed as a Set for ergonomic .has()/.size at call sites.
  const starforged = useMemo(
    () => new Set(settings.starforged),
    [settings.starforged],
  );

  const toggleStarforged = useCallback((name: string) => {
    setSettings((prev) => {
      const has = prev.starforged.includes(name);
      return {
        ...prev,
        starforged: has
          ? prev.starforged.filter((n) => n !== name)
          : [...prev.starforged, name],
      };
    });
  }, []);

  const setItemTranscendence = useCallback((name: string, level: number) => {
    setSettings((prev) => {
      const next = { ...prev.transcendenceLevels };
      const n = clampLevel(level);
      if (n <= 0) delete next[name];
      else next[name] = n;
      return { ...prev, transcendenceLevels: next };
    });
  }, []);

  return {
    starforged,
    toggleStarforged,
    transcendenceLevels: settings.transcendenceLevels,
    setItemTranscendence,
  };
}
