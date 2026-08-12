import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dayRangeISO } from "@/lib/dates";
import type { DayData, ExerciseRow, FoodLogRow, MacroSet, MealType } from "@/lib/types";
import { useSession } from "./useSession";

type DbFoodLog = {
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
  logged_at: string | null;
  created_at: string | null;
  status: number;
};

export function mapFoodRow(row: DbFoodLog): FoodLogRow {
  return {
    id: row.id,
    user_id: row.user_id,
    food_name: row.food_name,
    image_url: row.image_url,
    calories: row.calories === null ? null : Number(row.calories),
    protein: row.protein === null ? null : Number(row.protein),
    carbs: row.carbs === null ? null : Number(row.carbs),
    fat: row.fat === null ? null : Number(row.fat),
    fiber: row.fiber === null ? null : Number(row.fiber),
    sugar: row.sugar === null ? null : Number(row.sugar),
    sodium: row.sodium === null ? null : Number(row.sodium),
    vitamin_a: row.vitamin_a == null ? null : Number(row.vitamin_a),
    vitamin_c: row.vitamin_c == null ? null : Number(row.vitamin_c),
    calcium: row.calcium == null ? null : Number(row.calcium),
    iron: row.iron == null ? null : Number(row.iron),
    meal_type: row.meal_type,
    notes: row.notes,
    logged_at: row.logged_at ?? row.created_at ?? new Date().toISOString(),
    status: row.status,
  };
}

export function normalizeMealType(value: string | null | undefined): MealType {
  const v = (value ?? "").toLowerCase();
  if (v === "breakfast" || v === "lunch" || v === "dinner" || v === "snack") return v;
  return "snack"; // unknown/null -> snack
}

export function groupMeals(rows: FoodLogRow[]): Record<MealType, FoodLogRow[]> {
  const meals: Record<MealType, FoodLogRow[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
  for (const row of rows) meals[normalizeMealType(row.meal_type)].push(row);
  return meals;
}

export function sumTotals(rows: FoodLogRow[]): MacroSet {
  const totals = {
    calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0,
    vitaminA: 0, vitaminC: 0, calcium: 0, iron: 0,
  };
  for (const row of rows) {
    totals.calories += row.calories ?? 0;
    totals.protein += row.protein ?? 0;
    totals.carbs += row.carbs ?? 0;
    totals.fat += row.fat ?? 0;
    totals.fiber += row.fiber ?? 0;
    totals.sugar += row.sugar ?? 0;
    totals.sodium += row.sodium ?? 0;
    totals.vitaminA += row.vitamin_a ?? 0;
    totals.vitaminC += row.vitamin_c ?? 0;
    totals.calcium += row.calcium ?? 0;
    totals.iron += row.iron ?? 0;
  }
  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    fiber: Math.round(totals.fiber * 10) / 10,
    sugar: Math.round(totals.sugar * 10) / 10,
    sodium: Math.round(totals.sodium * 10) / 10,
    vitaminA: Math.round(totals.vitaminA),
    vitaminC: Math.round(totals.vitaminC * 10) / 10,
    calcium: Math.round(totals.calcium),
    iron: Math.round(totals.iron * 10) / 10,
  };
}

/** Rebuild derived fields (meals/totals) from `all` — used by optimistic cache updates too. */
export function buildDayData(
  all: FoodLogRow[],
  water: number,
  exercise: { rows: ExerciseRow[]; calories: number },
): DayData {
  return { meals: groupMeals(all), all, totals: sumTotals(all), water, exercise };
}

/**
 * ONE parallel fetch for a local day: food_logs (status=1), water total, exercise rows.
 * queryKey ["day", uid, dayKey].
 */
export function useDay(dayKey: string): UseQueryResult<DayData> {
  const { session } = useSession();
  const uid = session?.user.id;

  return useQuery({
    queryKey: ["day", uid, dayKey],
    enabled: !!uid && !!dayKey,
    queryFn: async (): Promise<DayData> => {
      const { fromISO, toISO } = dayRangeISO(dayKey);

      const [foodRes, waterRes, exerciseRes] = await Promise.all([
        supabase
          .from("food_logs")
          .select("*")
          .eq("user_id", uid!)
          .eq("status", 1)
          .gte("logged_at", fromISO)
          .lt("logged_at", toISO)
          .order("logged_at", { ascending: true }),
        supabase
          .from("water_logs")
          .select("amount_ml")
          .eq("user_id", uid!)
          .gte("logged_at", fromISO)
          .lt("logged_at", toISO),
        supabase
          .from("exercise_logs")
          .select("id, exercise_name, exercise_type, duration_minutes, calories_burned, intensity, logged_at")
          .eq("user_id", uid!)
          .eq("status", 1)
          .gte("logged_at", fromISO)
          .lt("logged_at", toISO)
          .order("logged_at", { ascending: true }),
      ]);

      if (foodRes.error) throw foodRes.error;
      if (waterRes.error) throw waterRes.error;
      if (exerciseRes.error) throw exerciseRes.error;

      const all = (foodRes.data ?? []).map((row) => mapFoodRow(row as DbFoodLog));

      const water = Math.max(
        0,
        (waterRes.data ?? []).reduce((sum, row) => sum + (row.amount_ml ?? 0), 0),
      );

      const exerciseRows: ExerciseRow[] = (exerciseRes.data ?? []).map((row) => ({
        id: row.id,
        exercise_name: row.exercise_name,
        exercise_type: row.exercise_type,
        duration_minutes: Number(row.duration_minutes),
        calories_burned: Number(row.calories_burned),
        intensity: row.intensity,
        logged_at: row.logged_at ?? new Date().toISOString(),
      }));
      const exerciseCalories = Math.round(exerciseRows.reduce((sum, row) => sum + row.calories_burned, 0));

      return buildDayData(all, water, { rows: exerciseRows, calories: exerciseCalories });
    },
  });
}
