// All write paths. Optimistic where cheap; every mutation invalidates the affected
// ["day", uid, dayKey] cache (+ streak for food). Toasts via sonner ONLY.

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isToday, parseDayKey } from "@/lib/dates";
import type { DayData, DraftItem, FoodLogRow, Goals, LogMeta, LogSource, MealType, Profile } from "@/lib/types";
import { buildDayData, mapFoodRow } from "./useDay";
import { useSession } from "./useSession";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** time ?? (today: now; past day: noon local of that day). */
function loggedAtFor(dayKey: string, time?: Date): string {
  if (time) return time.toISOString();
  if (isToday(dayKey)) return new Date().toISOString();
  const d = parseDayKey(dayKey);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

// ---------------------------------------------------------------- useLogMeal

export interface LogMealVars {
  items: DraftItem[];
  mealType: MealType;
  dayKey: string;
  source: LogSource;
  imageUrl?: string;
  time?: Date;
}

/** Inserts ONE food_logs row PER DraftItem (single batched insert), notes = LogMeta JSON with shared mealId. */
export function useLogMeal(): UseMutationResult<FoodLogRow[], Error, LogMealVars, { previous?: DayData }> {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: LogMealVars): Promise<FoodLogRow[]> => {
      if (!uid) throw new Error("Not authenticated");
      const mealId = crypto.randomUUID();
      const loggedAt = loggedAtFor(vars.dayKey, vars.time);

      const rows = vars.items.map((item, idx) => {
        const q = item.quantity || 1;
        const meta: LogMeta = {
          v: 2,
          source: vars.source,
          portion: item.portion,
          confidence: item.confidence,
          quantity: q,
          mealId,
        };
        return {
          user_id: uid,
          food_name: item.name,
          calories: round1((item.base.calories ?? 0) * q),
          protein: round1((item.base.protein ?? 0) * q),
          carbs: round1((item.base.carbs ?? 0) * q),
          fat: round1((item.base.fat ?? 0) * q),
          fiber: round1((item.base.fiber ?? 0) * q),
          sugar: round1((item.base.sugar ?? 0) * q),
          sodium: round1((item.base.sodium ?? 0) * q),
          meal_type: vars.mealType,
          logged_at: loggedAt,
          image_url: idx === 0 ? (vars.imageUrl ?? null) : null, // image on FIRST item only
          notes: JSON.stringify(meta),
          status: 1,
        };
      });

      const { data, error } = await supabase.from("food_logs").insert(rows).select("*");
      if (error) throw error;
      return (data ?? []).map(mapFoodRow);
    },

    onMutate: async (vars) => {
      if (!uid) return {};
      const key = ["day", uid, vars.dayKey];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<DayData>(key);
      if (previous) {
        const loggedAt = loggedAtFor(vars.dayKey, vars.time);
        const optimistic: FoodLogRow[] = vars.items.map((item) => {
          const q = item.quantity || 1;
          return {
            id: `optimistic-${item.id}`,
            user_id: uid,
            food_name: item.name,
            image_url: vars.imageUrl ?? null,
            calories: round1((item.base.calories ?? 0) * q),
            protein: round1((item.base.protein ?? 0) * q),
            carbs: round1((item.base.carbs ?? 0) * q),
            fat: round1((item.base.fat ?? 0) * q),
            fiber: round1((item.base.fiber ?? 0) * q),
            sugar: round1((item.base.sugar ?? 0) * q),
            sodium: round1((item.base.sodium ?? 0) * q),
            meal_type: vars.mealType,
            notes: JSON.stringify({ v: 2, source: vars.source, portion: item.portion, quantity: q } satisfies LogMeta),
            logged_at: loggedAt,
            status: 1,
          };
        });
        // Diary is chronological (earliest first) — keep the optimistic rows in place.
        const merged = [...previous.all, ...optimistic].sort(
          (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
        );
        qc.setQueryData<DayData>(key, buildDayData(merged, previous.water, previous.exercise));

      }
      return { previous };
    },

    onError: (_err, vars, context) => {
      if (uid && context?.previous) qc.setQueryData(["day", uid, vars.dayKey], context.previous);
      toast.error("Couldn't save your meal. Please try again.");
    },

    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ["day", uid, vars.dayKey] });
      qc.invalidateQueries({ queryKey: ["streak", uid] }); // streak recompute after success
    },
  });
}

// -------------------------------------------------------------- useDeleteLog

export interface DeleteLogVars {
  id: string;
  dayKey: string;
  name?: string;
}

/** Soft delete (status=2) with a 5s sonner Undo that restores status=1. */
export function useDeleteLog(): UseMutationResult<void, Error, DeleteLogVars, { previous?: DayData }> {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();

  const invalidate = (dayKey: string) => {
    qc.invalidateQueries({ queryKey: ["day", uid, dayKey] });
    qc.invalidateQueries({ queryKey: ["streak", uid] });
  };

  return useMutation({
    mutationFn: async (vars: DeleteLogVars): Promise<void> => {
      if (!uid) throw new Error("Not authenticated");
      const { error } = await supabase.from("food_logs").update({ status: 2 }).eq("id", vars.id).eq("user_id", uid);
      if (error) throw error;
    },

    onMutate: async (vars) => {
      if (!uid) return {};
      const key = ["day", uid, vars.dayKey];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<DayData>(key);
      if (previous) {
        const remaining = previous.all.filter((row) => row.id !== vars.id);
        qc.setQueryData<DayData>(key, buildDayData(remaining, previous.water, previous.exercise));
      }
      return { previous };
    },

    onError: (_err, vars, context) => {
      if (uid && context?.previous) qc.setQueryData(["day", uid, vars.dayKey], context.previous);
      toast.error("Couldn't delete the entry.");
    },

    onSuccess: (_data, vars) => {
      toast(`${vars.name ?? "Entry"} deleted`, {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: async () => {
            const { error } = await supabase.from("food_logs").update({ status: 1 }).eq("id", vars.id);
            if (error) {
              toast.error("Couldn't restore the entry.");
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

// --------------------------------------------------------------- useLogWater

export interface LogWaterVars {
  dayKey: string;
  deltaMl: number; // negative to remove
}

export function useLogWater(): UseMutationResult<void, Error, LogWaterVars, { previous?: DayData }> {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: LogWaterVars): Promise<void> => {
      if (!uid) throw new Error("Not authenticated");
      const { error } = await supabase.from("water_logs").insert({
        user_id: uid,
        amount_ml: Math.round(vars.deltaMl),
        logged_at: loggedAtFor(vars.dayKey),
      });
      if (error) throw error;
    },

    onMutate: async (vars) => {
      if (!uid) return {};
      const key = ["day", uid, vars.dayKey];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<DayData>(key);
      if (previous) {
        qc.setQueryData<DayData>(key, { ...previous, water: Math.max(0, previous.water + vars.deltaMl) });
      }
      return { previous };
    },

    onError: (_err, vars, context) => {
      if (uid && context?.previous) qc.setQueryData(["day", uid, vars.dayKey], context.previous);
      toast.error("Couldn't log water.");
    },

    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ["day", uid, vars.dayKey] });
    },
  });
}

// ------------------------------------------------------------ useLogExercise

export interface LogExerciseVars {
  name: string;
  minutes: number;
  calories: number;
  dayKey: string;
  type?: string;
  intensity?: string;
}

export function useLogExercise(): UseMutationResult<void, Error, LogExerciseVars, unknown> {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: LogExerciseVars): Promise<void> => {
      if (!uid) throw new Error("Not authenticated");
      const { error } = await supabase.from("exercise_logs").insert({
        user_id: uid,
        exercise_name: vars.name,
        exercise_type: vars.type ?? "general",
        duration_minutes: Math.round(vars.minutes),
        calories_burned: Math.round(vars.calories),
        intensity: vars.intensity ?? null,
        logged_at: loggedAtFor(vars.dayKey),
        status: 1,
      });
      if (error) throw error;
    },

    onError: () => toast.error("Couldn't log the exercise."),

    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ["day", uid, vars.dayKey] });
    },
  });
}

// -------------------------------------------------------------- useLogWeight

export interface LogWeightVars {
  kg: number; // ALWAYS kg — convert from display units before calling
  when?: Date;
}

/** Inserts a weight_logs row (kg) and keeps user_goals.current_weight in sync. */
export function useLogWeight(): UseMutationResult<void, Error, LogWeightVars, unknown> {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: LogWeightVars): Promise<void> => {
      if (!uid) throw new Error("Not authenticated");
      const { error } = await supabase.from("weight_logs").insert({
        user_id: uid,
        weight: Math.round(vars.kg * 10) / 10,
        logged_at: (vars.when ?? new Date()).toISOString(),
      });
      if (error) throw error;

      const { error: goalsError } = await supabase
        .from("user_goals")
        .update({ current_weight: Math.round(vars.kg * 10) / 10, updated_at: new Date().toISOString() })
        .eq("user_id", uid);
      if (goalsError) throw goalsError;
    },

    onError: () => toast.error("Couldn't save your weight."),

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["weights", uid] });
      qc.invalidateQueries({ queryKey: ["goals", uid] });
    },
  });
}

// ------------------------------------------------------------ useUpdateGoals

/** Partial upsert of user_goals (update if a row exists, insert otherwise). */
export function useUpdateGoals(): UseMutationResult<void, Error, Partial<Goals>, unknown> {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<Goals>): Promise<void> => {
      if (!uid) throw new Error("Not authenticated");
      const { data: existing, error: selectError } = await supabase
        .from("user_goals")
        .select("id")
        .eq("user_id", uid)
        .maybeSingle();
      if (selectError) throw selectError;

      if (existing) {
        const { error } = await supabase
          .from("user_goals")
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq("user_id", uid);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_goals").insert({ ...patch, user_id: uid });
        if (error) throw error;
      }
    },

    onError: () => toast.error("Couldn't update your goals."),

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["goals", uid] });
    },
  });
}

// ---------------------------------------------------------- useUpdateProfile

export function useUpdateProfile(): UseMutationResult<void, Error, Partial<Omit<Profile, "id">>, unknown> {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<Omit<Profile, "id">>): Promise<void> => {
      if (!uid) throw new Error("Not authenticated");
      const { error } = await supabase.from("profiles").update(patch).eq("id", uid);
      if (error) throw error;
    },

    onError: () => toast.error("Couldn't update your profile."),

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["profile", uid] });
    },
  });
}
