// Local-only preferences for v1 (schema is frozen — no columns for these).
// Pace powers projections; GLP-1 flips protein-first framing.

import type { Pace } from "@/lib/energy";

const PACE_KEY = "ct-pace";
const GLP1_KEY = "ct-glp1";

export function getPace(): Pace {
  const v = localStorage.getItem(PACE_KEY);
  return v === "gentle" || v === "ambitious" ? v : "steady";
}

export function setPace(p: Pace): void {
  localStorage.setItem(PACE_KEY, p);
}

export function isGlp1(): boolean {
  return localStorage.getItem(GLP1_KEY) === "1";
}

export function setGlp1(on: boolean): void {
  if (on) localStorage.setItem(GLP1_KEY, "1");
  else localStorage.removeItem(GLP1_KEY);
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
