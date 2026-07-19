// Insights-tab history hook — the ONLY data-access module for /insights beyond
// the shared foundation hooks (useGoals/useWeights/useProfile). Lives in the
// insights dir (agent ownership boundary) but is hooks-layer code per hard rule 9:
// no page/component below this file touches supabase directly.

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dayKey, dayRangeISO, parseDayKey } from "@/lib/dates";
import { useSession } from "@/hooks/useSession";

/** One local day's food totals (zeros when nothing was logged). */
export interface DailyTotal {
  day: string; // local dayKey "2026-07-20"
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  logged: boolean; // any food logged that day
}

export interface ExerciseWeekTotals {
  minutes: number;
  calories: number;
  sessions: number;
}

export interface InsightsHistory {
  /** Last HISTORY_DAYS local days, ascending, exactly one entry per day. */
  days: DailyTotal[];
  /** Distinct logged days within the window. */
  loggedDays: number;
  /** Exercise totals for the last 7 local days. */
  exercise: ExerciseWeekTotals;
}

export const HISTORY_DAYS = 21;

/**
 * One parallel fetch: food_logs daily kcal/macro totals for the last 21 LOCAL
 * days + exercise totals for the last 7. Bucketing is user-local via lib/dates.
 */
export function useInsightsHistory(): UseQueryResult<InsightsHistory> {
  const { session } = useSession();
  const uid = session?.user.id;
  const todayKey = dayKey(new Date());

  return useQuery({
    queryKey: ["insights-history", uid, todayKey],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async (): Promise<InsightsHistory> => {
      const today = parseDayKey(todayKey);
      const start = new Date(today);
      start.setDate(start.getDate() - (HISTORY_DAYS - 1));
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 6);

      const fromISO = dayRangeISO(dayKey(start)).fromISO;
      const weekFromISO = dayRangeISO(dayKey(weekStart)).fromISO;
      const toISO = dayRangeISO(todayKey).toISO;

      const [foodRes, exerciseRes] = await Promise.all([
        supabase
          .from("food_logs")
          .select("calories, protein, carbs, fat, fiber, logged_at")
          .eq("user_id", uid!)
          .eq("status", 1)
          .gte("logged_at", fromISO)
          .lt("logged_at", toISO),
        supabase
          .from("exercise_logs")
          .select("duration_minutes, calories_burned, logged_at")
          .eq("user_id", uid!)
          .eq("status", 1)
          .gte("logged_at", weekFromISO)
          .lt("logged_at", toISO),
      ]);
      if (foodRes.error) throw foodRes.error;
      if (exerciseRes.error) throw exerciseRes.error;

      // One bucket per local day, insertion order = ascending.
      const byDay = new Map<string, DailyTotal>();
      for (let i = 0; i < HISTORY_DAYS; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const key = dayKey(d);
        byDay.set(key, { day: key, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, logged: false });
      }

      for (const row of foodRes.data ?? []) {
        if (!row.logged_at) continue;
        const bucket = byDay.get(dayKey(new Date(row.logged_at)));
        if (!bucket) continue;
        bucket.calories += Number(row.calories ?? 0);
        bucket.protein += Number(row.protein ?? 0);
        bucket.carbs += Number(row.carbs ?? 0);
        bucket.fat += Number(row.fat ?? 0);
        bucket.fiber += Number(row.fiber ?? 0);
        bucket.logged = true;
      }

      const days = [...byDay.values()].map((d) => ({
        ...d,
        calories: Math.round(d.calories),
        protein: Math.round(d.protein * 10) / 10,
        carbs: Math.round(d.carbs * 10) / 10,
        fat: Math.round(d.fat * 10) / 10,
        fiber: Math.round(d.fiber * 10) / 10,
      }));

      const exerciseRows = exerciseRes.data ?? [];
      const exercise: ExerciseWeekTotals = {
        minutes: Math.round(exerciseRows.reduce((sum, r) => sum + Number(r.duration_minutes ?? 0), 0)),
        calories: Math.round(exerciseRows.reduce((sum, r) => sum + Number(r.calories_burned ?? 0), 0)),
        sessions: exerciseRows.length,
      };

      return { days, loggedDays: days.filter((d) => d.logged).length, exercise };
    },
  });
}

/** Average of a field over LOGGED days only; null when nothing was logged. */
export function avgOverLogged(days: DailyTotal[], field: "calories" | "protein" | "carbs" | "fat" | "fiber"): number | null {
  const logged = days.filter((d) => d.logged);
  if (logged.length === 0) return null;
  return logged.reduce((sum, d) => sum + d[field], 0) / logged.length;
}
