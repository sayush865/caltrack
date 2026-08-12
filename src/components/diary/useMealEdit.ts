// Diary/MealDetail-owned data hooks (Agent S-C). The foundation hooks layer has no
// row-update / meal-delete / exercise-delete / add-item-to-existing-meal mutations,
// so per GATE-1 note 8 + the MealDetail brief they live here (hard rule 9: pages
// never touch supabase directly — this file IS the hooks layer for the diary scope).

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { mapFoodRow } from "@/hooks/useDay";
import type { FoodLogRow, LogMeta, MacroSet, MealType } from "@/lib/types";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/* ── Save meal edits (batch row updates) ─────────────────────── */

export interface FoodLogRowUpdate {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  vitamin_a: number;
  vitamin_c: number;
  calcium: number;
  iron: number;
  meal_type: MealType;
  logged_at: string;
  notes: string;
}

export interface SaveMealEditsVars {
  updates: FoodLogRowUpdate[];
  /** Every local dayKey the rows may live on after the edit (old + new). */
  dayKeys: string[];
}

/** NON-DESTRUCTIVE: callers must send display = base × quantity, never overwrite base in meta. */
export function useSaveMealEdits(): UseMutationResult<void, Error, SaveMealEditsVars, unknown> {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: SaveMealEditsVars): Promise<void> => {
      if (!uid) throw new Error("Not authenticated");
      const results = await Promise.all(
        vars.updates.map(({ id, ...patch }) =>
          supabase.from("food_logs").update(patch).eq("id", id).eq("user_id", uid),
        ),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },

    onError: () => toast.error("Couldn't save your changes."),

    onSettled: (_data, _err, vars) => {
      for (const key of new Set(vars.dayKeys)) {
        qc.invalidateQueries({ queryKey: ["day", uid, key] });
      }
      qc.invalidateQueries({ queryKey: ["streak", uid] });
    },
  });
}

/* ── Add an item to an EXISTING meal (shared mealId) ─────────── */

export interface AddMealItemVars {
  name: string;
  base: MacroSet; // per-1x nutrition
  mealId: string; // the group's shared LogMeta.mealId
  mealType: MealType;
  loggedAt: string; // ISO — matches the group's logged_at
  dayKey: string;
}

/** useLogMeal always mints a NEW mealId, so joining an existing group needs this. */
export function useAddMealItem(): UseMutationResult<FoodLogRow, Error, AddMealItemVars, unknown> {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: AddMealItemVars): Promise<FoodLogRow> => {
      if (!uid) throw new Error("Not authenticated");
      const meta: LogMeta = { v: 2, source: "manual", portion: "1 serving", quantity: 1, mealId: vars.mealId };
      const { data, error } = await supabase
        .from("food_logs")
        .insert({
          user_id: uid,
          food_name: vars.name,
          calories: round1(vars.base.calories ?? 0),
          protein: round1(vars.base.protein ?? 0),
          carbs: round1(vars.base.carbs ?? 0),
          fat: round1(vars.base.fat ?? 0),
          fiber: round1(vars.base.fiber ?? 0),
          sugar: round1(vars.base.sugar ?? 0),
          sodium: round1(vars.base.sodium ?? 0),
          vitamin_a: round1(vars.base.vitaminA ?? 0),
          vitamin_c: round1(vars.base.vitaminC ?? 0),
          calcium: round1(vars.base.calcium ?? 0),
          iron: round1(vars.base.iron ?? 0),
          meal_type: vars.mealType,
          logged_at: vars.loggedAt,
          notes: JSON.stringify(meta),
          status: 1,
        })
        .select("*")
        .single();
      if (error) throw error;
      return mapFoodRow(data);
    },

    onError: () => toast.error("Couldn't add the item."),

    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ["day", uid, vars.dayKey] });
    },
  });
}

/* ── Delete a whole meal (all rows, ONE undo toast) ──────────── */

export interface DeleteMealVars {
  ids: string[];
  dayKey: string;
  name?: string;
}

/** Soft delete (status=2) for every row + a single 5s sonner Undo restoring all. */
export function useDeleteMeal(): UseMutationResult<void, Error, DeleteMealVars, unknown> {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();

  const invalidate = (dayKey: string) => {
    qc.invalidateQueries({ queryKey: ["day", uid, dayKey] });
    qc.invalidateQueries({ queryKey: ["streak", uid] });
  };

  return useMutation({
    mutationFn: async (vars: DeleteMealVars): Promise<void> => {
      if (!uid) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("food_logs")
        .update({ status: 2 })
        .in("id", vars.ids)
        .eq("user_id", uid);
      if (error) throw error;
    },

    onError: () => toast.error("Couldn't delete the meal."),

    onSuccess: (_data, vars) => {
      toast(`${vars.name ?? "Meal"} deleted`, {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: async () => {
            const { error } = await supabase.from("food_logs").update({ status: 1 }).in("id", vars.ids);
            if (error) {
              toast.error("Couldn't restore the meal.");
              return;
            }
            invalidate(vars.dayKey);
          },
        },
      });
    },

    onSettled: (_data, _err, vars) => invalidate(vars.dayKey),
  });
}

/* ── Delete an exercise row ──────────────────────────────────── */

export interface DeleteExerciseVars {
  id: string;
  dayKey: string;
  name?: string;
}

export function useDeleteExercise(): UseMutationResult<void, Error, DeleteExerciseVars, unknown> {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: DeleteExerciseVars): Promise<void> => {
      if (!uid) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("exercise_logs")
        .update({ status: 2 })
        .eq("id", vars.id)
        .eq("user_id", uid);
      if (error) throw error;
    },

    onError: () => toast.error("Couldn't remove the exercise."),

    onSuccess: (_data, vars) => toast(`${vars.name ?? "Exercise"} removed`),

    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ["day", uid, vars.dayKey] });
    },
  });
}
