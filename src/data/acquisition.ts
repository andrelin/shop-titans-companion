// How a blueprint is obtained, for the "acquisition badge" shown on
// not-freely-craftable items. Shared so the Dragon Invasion table and the
// transcendence recommender render identical badges.
import type { Blueprint } from "./types";

export type AcquisitionState = "premium" | "antiques" | "chest";

export interface AcquisitionBadge {
  state: AcquisitionState;
  cls: string;
  label: string;
  title: string;
}

// Returns the badge for a premium (non-craftable) item, or null for a freely
// craftable one. Three states, in priority order:
//   • antiques — a premium item whose Antiques rotation date has passed, so it's
//     buyable by anyone now (most actionable, wins over the source).
//   • chest    — a random drop from opening chests (can't be crafted or bought
//     directly), so ownership is pure RNG.
//   • premium  — a pack/pass the player may or may not have bought.
// `now` is injectable for testing; defaults to the current time.
export function acquisitionBadge(
  bp: Blueprint,
  now: number = Date.now(),
): AcquisitionBadge | null {
  if (!bp.premium) return null;
  const antiqueMs = bp.antiqueFrom ? Date.parse(bp.antiqueFrom) : NaN;
  const inAntiques = Number.isFinite(antiqueMs) && antiqueMs <= now;
  const fromChest = /chest/i.test(bp.unlockPrerequisite ?? "");
  const source = bp.unlockPrerequisite ?? "a premium source";
  if (inAntiques) {
    return {
      state: "antiques",
      cls: "bonus-chip bonus-antique",
      label: "🏺 in Antiques",
      title: `Premium item (${source}) — now buyable from the Antiques store (since ${bp.antiqueFrom}), so you can obtain it without the original pack.`,
    };
  }
  if (fromChest) {
    return {
      state: "chest",
      cls: "bonus-chip bonus-chest",
      label: "🎁 from chest",
      title: `Random drop from ${source} — can't be crafted or bought directly, only obtained by opening chests, so you may or may not have it.`,
    };
  }
  return {
    state: "premium",
    cls: "bonus-chip bonus-premium",
    label: "💎 premium",
    title: bp.antiqueFrom
      ? `Premium item — obtained from ${source}. Not freely craftable; enters the Antiques store on ${bp.antiqueFrom}.`
      : `Premium item — obtained from ${source}. Not freely craftable.`,
  };
}
