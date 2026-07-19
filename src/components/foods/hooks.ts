// Data hooks for the Foods + Exercise library pages.
// NOTE: src/hooks/* is foundation-owned, so these page-scoped query hooks live
// here (still "hooks layer" — no supabase calls inside render components).

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { parseLogMeta, type DraftItem, type MacroSet } from "@/lib/types";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/* ── Food database search (server-side ilike, never a full-table fetch) ── */

export interface DbFood {
  id: string;
  name: string;
  category: string;
  serving_size: string;
  serving_unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  image_url: string | null;
}

const FOOD_COLUMNS =
  "id, name, category, serving_size, serving_unit, calories, protein, carbs, fat, fiber, sugar, sodium, image_url";

/** Server-side name search on food_database. `term` should already be debounced. */
export function useFoodSearch(term: string): UseQueryResult<DbFood[]> {
  const trimmed = term.trim();
  return useQuery({
    queryKey: ["foodSearch", trimmed.toLowerCase()],
    enabled: trimmed.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<DbFood[]> => {
      const { data, error } = await supabase
        .from("food_database")
        .select(FOOD_COLUMNS)
        .ilike("name", `%${trimmed}%`)
        .order("name")
        .limit(30);
      if (error) throw error;
      return (data ?? []) as DbFood[];
    },
  });
}

/** Per-serving DraftItem for a database food (base = per-serving macros). */
export function dbFoodToDraftItem(food: DbFood, servings = 1): DraftItem {
  const base: MacroSet = {
    calories: Number(food.calories ?? 0),
    protein: Number(food.protein ?? 0),
    carbs: Number(food.carbs ?? 0),
    fat: Number(food.fat ?? 0),
    fiber: food.fiber != null ? Number(food.fiber) : undefined,
    sugar: food.sugar != null ? Number(food.sugar) : undefined,
    sodium: food.sodium != null ? Number(food.sodium) : undefined,
  };
  return {
    id: newId(),
    name: food.name,
    portion: `${food.serving_size}${food.serving_unit}`,
    quantity: servings,
    base,
    calories: round1(base.calories * servings),
    protein: round1((base.protein ?? 0) * servings),
    carbs: round1((base.carbs ?? 0) * servings),
    fat: round1((base.fat ?? 0) * servings),
    fiber: base.fiber != null ? round1(base.fiber * servings) : undefined,
    sugar: base.sugar != null ? round1(base.sugar * servings) : undefined,
    sodium: base.sodium != null ? round1(base.sodium * servings) : undefined,
  };
}

/* ── Recents: last 10 distinct food names from the user's own log ── */

export interface RecentFood {
  name: string;
  calories: number;
  imageUrl: string | null;
  /** Ready-to-relog item (fresh id, base = per-1x macros). */
  item: DraftItem;
}

interface RecentRow {
  food_name: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  notes: string | null;
  image_url: string | null;
}

function rowToRecent(row: RecentRow): RecentFood {
  const meta = parseLogMeta(row.notes);
  const q = meta?.quantity && meta.quantity > 0 ? meta.quantity : 1;
  const base: MacroSet = {
    calories: (row.calories ?? 0) / q,
    protein: (row.protein ?? 0) / q,
    carbs: (row.carbs ?? 0) / q,
    fat: (row.fat ?? 0) / q,
    fiber: row.fiber != null ? row.fiber / q : undefined,
    sugar: row.sugar != null ? row.sugar / q : undefined,
    sodium: row.sodium != null ? row.sodium / q : undefined,
  };
  return {
    name: row.food_name ?? "Meal",
    calories: Math.round(row.calories ?? 0),
    imageUrl: row.image_url,
    item: {
      id: newId(),
      name: row.food_name ?? "Meal",
      portion: meta?.portion ?? "1 serving",
      quantity: q,
      base,
      calories: row.calories ?? 0,
      protein: row.protein ?? 0,
      carbs: row.carbs ?? 0,
      fat: row.fat ?? 0,
      fiber: row.fiber ?? undefined,
      sugar: row.sugar ?? undefined,
      sodium: row.sodium ?? undefined,
    },
  };
}

/** Last 10 distinct food_names from the user's food_logs (active rows, newest first). */
export function useRecentFoods(): UseQueryResult<RecentFood[]> {
  const { session } = useSession();
  const uid = session?.user.id;

  return useQuery({
    queryKey: ["recentFoods", uid],
    enabled: !!uid,
    queryFn: async (): Promise<RecentFood[]> => {
      const { data, error } = await supabase
        .from("food_logs")
        .select("food_name, calories, protein, carbs, fat, fiber, sugar, sodium, notes, image_url")
        .eq("user_id", uid!)
        .eq("status", 1)
        .not("food_name", "is", null)
        .order("logged_at", { ascending: false })
        .limit(60);
      if (error) throw error;

      const seen = new Set<string>();
      const out: RecentFood[] = [];
      for (const row of (data ?? []) as RecentRow[]) {
        const key = (row.food_name ?? "").trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(rowToRecent(row));
        if (out.length >= 10) break;
      }
      return out;
    },
  });
}

/* ── Exercise database ── */

export interface DbExercise {
  id: string;
  name: string;
  category: string;
  met_value: number;
  description: string | null;
}

/** Full exercise_database (small/seeded table; empty in prod → seed fallback in the page). */
export function useExerciseDatabase(): UseQueryResult<DbExercise[]> {
  return useQuery({
    queryKey: ["exerciseDatabase"],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<DbExercise[]> => {
      const { data, error } = await supabase
        .from("exercise_database")
        .select("id, name, category, met_value, description")
        .order("name");
      if (error) throw error;
      return (data ?? []) as DbExercise[];
    },
  });
}
