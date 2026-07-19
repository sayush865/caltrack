// Onboarding quiz model: answer shape, localStorage draft persistence, plan
// computation (all math delegated to lib/energy.ts) and guardrails.

import {
  bmr,
  tdee,
  dailyTarget,
  macroTargets,
  projectionDate,
  paceKgPerWeek,
  type EnergyInput,
  type Pace,
} from "@/lib/energy";
import { kgToLb, type Units } from "@/lib/units";

export type Sex = "female" | "male";
export type Goal = "lose" | "maintain" | "gain";
export type Activity = EnergyInput["activityLevel"];
export type ExerciseDays = "0-1" | "2-3" | "4-5" | "6+";
export type FoodStyle = "vegetarian" | "eggetarian" | "non_vegetarian" | "vegan";
export type FoodContext = "home_cooked" | "eat_out" | "glp1" | "none";
export type Obstacle = "chore" | "eating_out" | "late_night" | "motivation" | "new";

export interface QuizAnswers {
  goal?: Goal;
  experience?: "app" | "paper" | "never";
  discovery?: "friend" | "social" | "search" | "other";
  sex?: Sex;
  age?: number;
  /** Set by the height step's cm / ft-in toggle; drives ALL later inputs. */
  units: Units;
  heightCm?: number;
  weightKg?: number;
  activity?: Activity;
  exerciseDays?: ExerciseDays;
  goalWeightKg?: number;
  pace?: Pace;
  foodStyle?: FoodStyle;
  foodContext?: FoodContext[];
  obstacle?: Obstacle;
  reminders?: boolean;
}

export type Phase = "splash" | "quiz" | "build" | "reveal" | "commit" | "signup";

export type StepId =
  | "goal"
  | "experience"
  | "discovery"
  | "sex"
  | "age"
  | "height"
  | "weight"
  | "activity"
  | "exercise"
  | "goalWeight"
  | "pace"
  | "food"
  | "obstacle"
  | "expectations"
  | "notifications";

/** Step order with skip logic (goal weight + pace are meaningless on maintain). */
export function buildSteps(a: QuizAnswers): StepId[] {
  const steps: StepId[] = [
    "goal",
    "experience",
    "discovery",
    "sex",
    "age",
    "height",
    "weight",
    "activity",
    "exercise",
  ];
  if (a.goal !== "maintain") steps.push("goalWeight", "pace");
  steps.push("food", "obstacle", "expectations", "notifications");
  return steps;
}

/** Index of the first step whose answer is missing — for safe draft resume. */
export function firstIncompleteStep(a: QuizAnswers): number {
  const steps = buildSteps(a);
  const has = (id: StepId): boolean => {
    switch (id) {
      case "goal": return a.goal !== undefined;
      case "experience": return a.experience !== undefined;
      case "discovery": return a.discovery !== undefined;
      case "sex": return a.sex !== undefined;
      case "age": return a.age !== undefined && a.age >= 18;
      case "height": return a.heightCm !== undefined;
      case "weight": return a.weightKg !== undefined;
      case "activity": return a.activity !== undefined;
      case "exercise": return a.exerciseDays !== undefined;
      case "goalWeight": return a.goalWeightKg !== undefined;
      case "pace": return a.pace !== undefined;
      case "food": return a.foodStyle !== undefined;
      case "obstacle": return a.obstacle !== undefined;
      case "expectations": return false; // always re-show from here on resume
      case "notifications": return false;
    }
  };
  const idx = steps.findIndex((id) => !has(id));
  return idx === -1 ? steps.length - 1 : idx;
}

/* ── Draft persistence (localStorage, saved at every step) ────── */

const DRAFT_KEY = "ct-quiz-draft";
export const GLP1_KEY = "ct-glp1";

export interface QuizDraft {
  v: 1;
  answers: QuizAnswers;
  phase: Phase;
  stepIndex: number;
}

export function loadDraft(): QuizDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuizDraft;
    if (!parsed || parsed.v !== 1 || typeof parsed.answers !== "object") return null;
    return {
      v: 1,
      answers: { units: "metric", ...parsed.answers },
      phase: parsed.phase ?? "quiz",
      stepIndex: typeof parsed.stepIndex === "number" ? parsed.stepIndex : 0,
    };
  } catch {
    return null;
  }
}

export function saveDraft(draft: QuizDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage full/blocked — quiz continues in memory */
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function saveGlp1Flag(on: boolean): void {
  try {
    localStorage.setItem(GLP1_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/* ── Plan computation ─────────────────────────────────────────── */

export interface Plan {
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  goal: Goal;
  pace: Pace;
  paceKg: number;
  glp1: boolean;
  projection: Date | null;
  name: string;
}

export function planName(goal: Goal, pace: Pace): string {
  if (goal === "maintain") return "Your Maintenance Plan";
  const p = pace === "gentle" ? "Gentle" : pace === "ambitious" ? "Ambitious" : "Steady";
  return goal === "lose" ? `Your ${p}-Cut Plan` : `Your ${p}-Gain Plan`;
}

/** null until the computational answers (sex/age/height/weight/activity/goal) exist. */
export function computePlan(a: QuizAnswers): Plan | null {
  if (!a.sex || !a.age || !a.heightCm || !a.weightKg || !a.activity || !a.goal) return null;
  const input: EnergyInput = {
    gender: a.sex,
    age: a.age,
    heightCm: a.heightCm,
    weightKg: a.weightKg,
    activityLevel: a.activity,
  };
  const b = bmr(input);
  const t = tdee(input);
  const pace: Pace = a.goal === "maintain" ? "steady" : (a.pace ?? "steady");
  const calories = dailyTarget(t, a.goal, pace, a.sex);
  const macros = macroTargets(calories, a.weightKg, a.goal);
  const glp1 = (a.foodContext ?? []).includes("glp1");
  const projection =
    a.goal !== "maintain" && a.goalWeightKg !== undefined
      ? projectionDate(a.weightKg, a.goalWeightKg, pace)
      : null;
  return {
    bmr: b,
    tdee: t,
    calories,
    ...macros,
    goal: a.goal,
    pace,
    paceKg: paceKgPerWeek(pace),
    glp1,
    projection,
    name: planName(a.goal, pace),
  };
}

/* ── Guardrails ───────────────────────────────────────────────── */

export interface GoalWeightIssue {
  suggestedKg: number;
}

/**
 * Blocks goal weights implying >25% body-weight loss or a target BMI < 18.5.
 * Returns the nearest safe target when blocked, null when the goal is fine.
 */
export function checkGoalWeight(
  weightKg: number,
  heightCm: number,
  goalKg: number,
): GoalWeightIssue | null {
  if (goalKg >= weightKg) return null; // gaining/holding — loss guardrail doesn't apply
  const heightM = heightCm / 100;
  const lossFraction = (weightKg - goalKg) / weightKg;
  const targetBmi = goalKg / (heightM * heightM);
  if (lossFraction <= 0.25 && targetBmi >= 18.5) return null;
  const safe = Math.max(weightKg * 0.75, 18.5 * heightM * heightM);
  return { suggestedKg: Math.round(safe * 2) / 2 };
}

/** A pace is unavailable when its deficit would exceed 35% of TDEE (lose only). */
export function paceUnavailable(p: Pace, a: QuizAnswers): boolean {
  if (a.goal !== "lose") return false;
  const plan = computePlan(a);
  if (!plan) return false;
  const dailyDeficit = (paceKgPerWeek(p) * 7700) / 7;
  return dailyDeficit > plan.tdee * 0.35;
}

/* ── Formatting ───────────────────────────────────────────────── */

/** "November 9" — pace-step projection copy. */
export function formatLongDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

/** "Nov 9" — plan-reveal projection copy. */
export function formatShortDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** "0.5 kg" or "1.1 lb" per week in the user's units. */
export function formatPace(paceKg: number, units: Units): string {
  if (units === "imperial") return `${(Math.round(kgToLb(paceKg) * 10) / 10).toFixed(1)} lb`;
  return `${paceKg} kg`;
}
