// Single source of truth for ALL metabolic math (onboarding, goals, insights).
// Mifflin-St Jeor, 7700 kcal/kg, deficit cap 35% TDEE, floors 1200 (F) / 1500 (M).

import { dayKey } from "./dates";

export interface EnergyInput {
  gender: "male" | "female";
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extra_active";
}

const ACTIVITY_MULTIPLIERS: Record<EnergyInput["activityLevel"], number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

const KCAL_PER_KG = 7700;

/** Mifflin-St Jeor BMR (kcal/day). */
export function bmr(i: EnergyInput): number {
  const base = 10 * i.weightKg + 6.25 * i.heightCm - 5 * i.age;
  return Math.round(i.gender === "male" ? base + 5 : base - 161);
}

export function tdee(i: EnergyInput): number {
  return Math.round(bmr(i) * (ACTIVITY_MULTIPLIERS[i.activityLevel] ?? 1.2));
}

export type Pace = "gentle" | "steady" | "ambitious"; // 0.25 / 0.5 / 0.75 kg per week

export function paceKgPerWeek(p: Pace): number {
  switch (p) {
    case "gentle":
      return 0.25;
    case "steady":
      return 0.5;
    case "ambitious":
      return 0.75;
  }
}

/**
 * Daily calorie target. Lose: deficit capped at 35% of TDEE, floored at 1200 (F) / 1500 (M).
 * Gain: surplus capped at +20% of TDEE. Maintain: TDEE.
 */
export function dailyTarget(
  tdeeKcal: number,
  goal: "lose" | "maintain" | "gain",
  p: Pace,
  gender: "male" | "female",
): number {
  if (goal === "maintain") return Math.round(tdeeKcal);
  const dailyDelta = (paceKgPerWeek(p) * KCAL_PER_KG) / 7;
  if (goal === "lose") {
    const deficit = Math.min(dailyDelta, tdeeKcal * 0.35);
    const floor = gender === "female" ? 1200 : 1500;
    return Math.round(Math.max(tdeeKcal - deficit, floor));
  }
  const surplus = Math.min(dailyDelta, tdeeKcal * 0.2);
  return Math.round(tdeeKcal + surplus);
}

/**
 * Macro split: protein 1.8 g/kg (lose) or 1.6 g/kg (maintain/gain),
 * fat 25% of calories, carbs the remainder, fiber 14 g / 1000 kcal.
 */
export function macroTargets(
  calories: number,
  weightKg: number,
  goal: string,
): { protein: number; carbs: number; fat: number; fiber: number } {
  const protein = Math.round((goal === "lose" ? 1.8 : 1.6) * weightKg);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.round(Math.max(0, calories - protein * 4 - fat * 9) / 4);
  const fiber = Math.round((14 * calories) / 1000);
  return { protein, carbs, fat, fiber };
}

/** Projected date of reaching goalKg at the given pace; null if already there / maintain. */
export function projectionDate(currentKg: number, goalKg: number, p: Pace, from: Date = new Date()): Date | null {
  const deltaKg = Math.abs(goalKg - currentKg);
  const pace = paceKgPerWeek(p);
  if (deltaKg < 0.05 || pace <= 0) return null;
  const days = Math.ceil((deltaKg / pace) * 7);
  const out = new Date(from);
  out.setDate(out.getDate() + days);
  return out;
}

/** EWMA-smoothed weight trend, alpha 0.25, seeded on the first raw reading. Input any order; output ascending. */
export function smoothWeights(
  rows: Array<{ logged_at: string; weight: number }>,
  alpha = 0.25,
): Array<{ date: string; raw: number; trend: number }> {
  const sorted = [...rows].sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());
  const out: Array<{ date: string; raw: number; trend: number }> = [];
  let trend: number | null = null;
  for (const row of sorted) {
    const raw = Number(row.weight);
    if (!Number.isFinite(raw)) continue;
    trend = trend === null ? raw : trend + alpha * (raw - trend);
    out.push({ date: dayKey(new Date(row.logged_at)), raw, trend: Math.round(trend * 100) / 100 });
  }
  return out;
}

/**
 * Adaptive TDEE estimate: avg daily intake + energy of trend-weight change over the window.
 * trendDeltaKg = trendEnd - trendStart (negative when losing). Null with <5 logged days.
 */
export function weeklyExpenditure(intakeKcalByDay: number[], trendDeltaKg: number): number | null {
  const days = intakeKcalByDay.length;
  if (days < 5) return null;
  const avgIntake = intakeKcalByDay.reduce((sum, kcal) => sum + kcal, 0) / days;
  return Math.round(avgIntake + (-trendDeltaKg * KCAL_PER_KG) / days);
}
