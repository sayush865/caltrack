// Shared domain types for the CalTrack rebuild.
// See docs/CONTRACTS.md — these are the binding interfaces between layers.

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type LogSource = "photo" | "text" | "quick" | "library" | "manual";

export interface MacroSet {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  /** Micronutrients — vitamin A in mcg RAE, vitamin C / calcium / iron in mg. */
  vitaminA?: number;
  vitaminC?: number;
  calcium?: number;
  iron?: number;
}

/** One editable item row in the review sheet (from AI or manual). */
export interface DraftItem extends MacroSet {
  id: string; // client uuid
  name: string;
  portion: string; // "1 cup", "150 g"
  quantity: number; // multiplier applied to base macros (default 1)
  confidence?: number; // 0-100 from AI
  base: MacroSet; // immutable per-1x nutrition; display = base * quantity
  /** Hydration contributed by this item at quantity 1 (drinks only). */
  waterMl?: number;
}

/** Deployed analyze-food response (DO NOT change client expectations). */
export interface AnalyzeFoodResponse {
  items: Array<{ name: string; portion: string; confidence: number } & MacroSet & Record<string, number | string>>;
  nutritionData: { food_name: string } & MacroSet & Record<string, number | string>;
  analysis: { visual_analysis: string; portion_estimation: string; nutritional_reasoning: string };
  meta: { items_count: number; processing_time_ms: number };
}

/** Deployed analyze-food-text response: single blob — map to ONE DraftItem. */
export interface AnalyzeTextResponse {
  nutritionData: { food_name: string } & MacroSet & Record<string, number | string>;
  analysis?: Record<string, string>;
}

export interface FoodLogRow {
  /* mirrors DB */
  id: string;
  user_id: string;
  food_name: string | null;
  image_url: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  vitamin_a: number | null;
  vitamin_c: number | null;
  calcium: number | null;
  iron: number | null;
  meal_type: string | null;
  notes: string | null;
  logged_at: string;
  status: number;
}

/** Per-item metadata packed into food_logs.notes as JSON (schema is frozen; notes is our extension point). */
export interface LogMeta {
  v: 2;
  source: LogSource;
  portion?: string;
  confidence?: number;
  quantity?: number;
  mealId?: string;
}

export function parseLogMeta(notes: string | null): LogMeta | null {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as { v?: unknown }).v === 2 &&
      typeof (parsed as { source?: unknown }).source === "string"
    ) {
      return parsed as LogMeta;
    }
    return null;
  } catch {
    return null;
  }
}

export interface Profile {
  id: string;
  username: string | null;
  email: string | null;
  age: number | null;
  gender: string | null;
  height: number | null;
  activity_level: string | null;
  units_preference: "metric" | "imperial";
  onboarding_completed: boolean;
  has_seen_tutorial: boolean;
  /* ── meal / food preferences (feed the AI coach) ── */
  diet_type: string | null;
  cuisines: string[] | null;
  allergies: string[] | null;
  dislikes: string[] | null;
  meals_per_day: number | null;
  cooking_style: string | null;
  food_notes: string | null;
}

export interface Goals {
  daily_calories: number;
  daily_protein: number;
  daily_carbs: number;
  daily_fat: number;
  daily_fiber: number;
  daily_water: number;
  goal_type: "lose" | "maintain" | "gain";
  current_weight: number | null;
  goal_weight: number | null;
  daily_active_calories: number;
  daily_exercise_minutes: number;
  weekly_exercise_days: number;
}

/** Exercise row shape used across the app (mirrors exercise_logs). */
export interface ExerciseRow {
  id: string;
  exercise_name: string;
  exercise_type: string;
  duration_minutes: number;
  calories_burned: number;
  intensity: string | null;
  logged_at: string;
}

/** Result of useDay — one parallel fetch for a local day. */
export interface DayData {
  meals: Record<MealType, FoodLogRow[]>;
  all: FoodLogRow[];
  totals: MacroSet;
  water: number; // ml
  exercise: { rows: ExerciseRow[]; calories: number };
}

export type InsightActionKind = "exercise" | "describe" | "scan" | "water" | "weight";

export interface InsightAction {
  kind: InsightActionKind;
  label: string;
}

/** generate-insights item. `headline` + `action` are v2 fields (optional for cached v1 payloads). */
export interface Insight {
  category: string;
  emoji?: string;
  headline?: string;
  message: string;
  action?: InsightAction;
}

/** Deterministic day snapshot the insight was written from. */
export interface InsightSnapshot {
  state: string;
  hour: number;
  goal: number;
  goalType: string;
  eaten: number;
  burned: number;
  net: number;
  remaining: number;
  projected: number;
  protein: number;
  goalProtein: number;
  fiber: number;
  goalFiber: number;
  water: number;
  goalWater: number;
  mealsLogged: number;
  firstMealHour: number | null;
  lastMealHour: number | null;
  avg7Cal: number;
  avg14Cal: number;
  avg14Protein: number;
  avg14Fiber: number;
  avg7Water: number;
  weekNet: number;
  daysLogged: number;
  streak: number;
  latestWeight: number | null;
  weightChange: number | null;
  exerciseMinutesToday: number;
}

/** One aggregate-level finding across the rolling 28-day window. */
export interface InsightTrend {
  tag: "win" | "risk" | "pattern" | "experiment" | string;
  title: string;
  message: string;
  metric: string;
}

export interface InsightPayload {
  insights: Insight[];
  snapshot: InsightSnapshot | null;
  state: string | null;
  /** Week-over-week findings from the aggregate pass. */
  trends: InsightTrend[];
  /** One-sentence read on where the last week landed. */
  verdict: string | null;
}

/** A saved favorite (meal_templates row, items snapshot decoded). */
export interface Favorite {
  id: string;
  name: string;
  items: DraftItem[];
  totals: MacroSet;
  imageUrl: string | null;
  mealType: string | null;
  useCount: number;
}
