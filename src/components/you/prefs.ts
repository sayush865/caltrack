// Local-only preferences for v1 (schema is frozen — no columns for these).
// Pace powers projections.

import type { Pace } from "@/lib/energy";

const PACE_KEY = "ct-pace";

export function getPace(): Pace {
  const v = localStorage.getItem(PACE_KEY);
  return v === "gentle" || v === "ambitious" ? v : "steady";
}

export function setPace(p: Pace): void {
  localStorage.setItem(PACE_KEY, p);
}

export const PACE_LABELS: Record<Pace, string> = {
  gentle: "Gentle · 0.25 kg/wk",
  steady: "Steady · 0.5 kg/wk",
  ambitious: "Ambitious · 0.75 kg/wk",
};

export const GOAL_TYPE_LABELS: Record<"lose" | "maintain" | "gain", string> = {
  lose: "Losing weight",
  maintain: "Maintaining",
  gain: "Gaining muscle",
};
