// Autocomplete sources built from the user's own history, so names stay
// consistent ("Palak paneer" not "palak panner") and typing gets shorter.
//
// Food suggestions carry their last-logged macros, so picking one can prefill
// the manual add form. Exercise suggestions carry minutes + kcal burned.

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./useSession";

export interface FoodSuggestion {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  uses: number;
}

export interface ExerciseSuggestion {
  name: string;
  minutes: number;
  calories: number;
  type: string | null;
  uses: number;
}

function dedupeKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Distinct past food names (most recent macros win), ordered by how often used. */
export function useFoodSuggestions(): FoodSuggestion[] {
  const { session } = useSession();
  const uid = session?.user.id;

  const { data } = useQuery({
    queryKey: ["food-suggestions", uid],
    enabled: !!uid,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_logs")
        .select("food_name, calories, protein, carbs, fat, logged_at")
        .eq("user_id", uid!)
        .eq("status", 1)
        .not("food_name", "is", null)
        .order("logged_at", { ascending: false })
        .limit(400);
      if (error) throw error;
      return data ?? [];
    },
  });

  return useMemo(() => {
    const map = new Map<string, FoodSuggestion>();
    for (const row of data ?? []) {
      const name = (row.food_name ?? "").trim();
      if (!name) continue;
      const key = dedupeKey(name);
      const existing = map.get(key);
      if (existing) {
        existing.uses += 1;
        continue;
      }
      map.set(key, {
        name,
        calories: Math.round(row.calories ?? 0),
        protein: Math.round(row.protein ?? 0),
        carbs: Math.round(row.carbs ?? 0),
        fat: Math.round(row.fat ?? 0),
        uses: 1,
      });
    }
    return [...map.values()].sort((a, b) => b.uses - a.uses);
  }, [data]);
}

/** Distinct past exercise names with their most recent minutes/kcal. */
export function useExerciseSuggestions(): ExerciseSuggestion[] {
  const { session } = useSession();
  const uid = session?.user.id;

  const { data } = useQuery({
    queryKey: ["exercise-suggestions", uid],
    enabled: !!uid,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_logs")
        .select("exercise_name, duration_minutes, calories_burned, exercise_type, logged_at")
        .eq("user_id", uid!)
        .eq("status", 1)
        .order("logged_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  return useMemo(() => {
    const map = new Map<string, ExerciseSuggestion>();
    for (const row of data ?? []) {
      const name = (row.exercise_name ?? "").trim();
      if (!name) continue;
      const key = dedupeKey(name);
      const existing = map.get(key);
      if (existing) {
        existing.uses += 1;
        continue;
      }
      map.set(key, {
        name,
        minutes: Math.round(row.duration_minutes ?? 0),
        calories: Math.round(Number(row.calories_burned) || 0),
        type: row.exercise_type ?? null,
        uses: 1,
      });
    }
    return [...map.values()].sort((a, b) => b.uses - a.uses);
  }, [data]);
}

/** Prefix matches first, then substring matches. Case/space insensitive. */
export function matchNames<T extends { name: string; uses: number }>(
  items: T[],
  query: string,
  limit = 6,
): T[] {
  const q = dedupeKey(query);
  if (q.length === 0) return items.slice(0, limit);
  const prefix: T[] = [];
  const partial: T[] = [];
  for (const item of items) {
    const n = dedupeKey(item.name);
    if (n === q) continue;
    if (n.startsWith(q)) prefix.push(item);
    else if (n.includes(q)) partial.push(item);
  }
  return [...prefix, ...partial].slice(0, limit);
}
