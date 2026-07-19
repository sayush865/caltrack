// Data hooks for the You cluster (milestones, achievements, export, weight delete).
// Lives under components/you/* because S-F's ownership doesn't include src/hooks —
// this file IS the hooks layer for these queries (no supabase access in the pages).

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { dayKey } from "@/lib/dates";
import { parseLogMeta } from "@/lib/types";
import { computeStreak } from "@/hooks/useStreak";
import { useSession } from "@/hooks/useSession";
import { BADGES, computeEarnedBadges, type BadgeInputs } from "./badges";

// ------------------------------------------------------------- useAchievements

export interface AchievementRow {
  achievement_id: string;
  earned_at: string;
}

/** Read-only user_achievements (newest first). Used by the You-tab preview. */
export function useAchievements(): UseQueryResult<AchievementRow[]> {
  const { session } = useSession();
  const uid = session?.user.id;

  return useQuery({
    queryKey: ["achievements", uid],
    enabled: !!uid,
    queryFn: async (): Promise<AchievementRow[]> => {
      const { data, error } = await supabase
        .from("user_achievements")
        .select("achievement_id, earned_at")
        .eq("user_id", uid!)
        .order("earned_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// -------------------------------------------------------------- useMilestones

export interface MilestoneStats {
  daysLogged: number;
  longestStreak: number;
  mealsLogged: number;
}

export interface MilestonesData {
  /** badge id -> earned_at ISO (server rows + freshly awarded). */
  earned: Record<string, string>;
  /** Badge ids newly detected + awarded during THIS fetch. */
  newlyEarned: string[];
  stats: MilestoneStats;
}

/**
 * Full milestones computation: reads real logs, computes the ~8 earnable badges
 * client-side, awards any newly-earned rows into user_achievements, and returns
 * earned map + stats. Confetti is the caller's job (fire once per newlyEarned).
 */
export function useMilestones(): UseQueryResult<MilestonesData> {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();

  return useQuery({
    queryKey: ["milestones", uid],
    enabled: !!uid,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<MilestonesData> => {
      const [achRes, foodRes, weightRes, goalsRes] = await Promise.all([
        supabase.from("user_achievements").select("achievement_id, earned_at").eq("user_id", uid!),
        supabase
          .from("food_logs")
          .select("logged_at, protein, notes")
          .eq("user_id", uid!)
          .eq("status", 1)
          .order("logged_at", { ascending: true })
          .limit(5000),
        supabase.from("weight_logs").select("id", { count: "exact", head: true }).eq("user_id", uid!),
        supabase.from("user_goals").select("daily_protein").eq("user_id", uid!).maybeSingle(),
      ]);
      if (achRes.error) throw achRes.error;
      if (foodRes.error) throw foodRes.error;
      if (weightRes.error) throw weightRes.error;
      if (goalsRes.error) throw goalsRes.error;

      const foodRows = foodRes.data ?? [];

      // --- derive inputs from real data ---
      const loggedDays = new Set<string>();
      const proteinByDay = new Map<string, number>();
      const mealIds = new Set<string>();
      const photoMealIds = new Set<string>();
      let looseRows = 0;
      let loosePhotoRows = 0;

      for (const row of foodRows) {
        if (!row.logged_at) continue;
        const key = dayKey(new Date(row.logged_at));
        loggedDays.add(key);
        proteinByDay.set(key, (proteinByDay.get(key) ?? 0) + (Number(row.protein) || 0));

        const meta = parseLogMeta(row.notes);
        if (meta?.mealId) {
          mealIds.add(meta.mealId);
          if (meta.source === "photo") photoMealIds.add(meta.mealId);
        } else {
          looseRows += 1;
          if (meta?.source === "photo") loosePhotoRows += 1;
        }
      }

      const mealsLogged = mealIds.size + looseRows;
      const photosLogged = photoMealIds.size + loosePhotoRows;
      const streak = computeStreak(loggedDays);

      const proteinTarget = goalsRes.data?.daily_protein ? Number(goalsRes.data.daily_protein) : 0;
      let proteinHitDays = 0;
      if (proteinTarget > 0) {
        for (const total of proteinByDay.values()) if (total >= proteinTarget) proteinHitDays += 1;
      }

      // Best week: max distinct logged days within any Monday-start week.
      const daysPerWeek = new Map<string, number>();
      for (const key of loggedDays) {
        const [y, m, d] = key.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        const monday = new Date(date);
        monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
        const wk = dayKey(monday);
        daysPerWeek.set(wk, (daysPerWeek.get(wk) ?? 0) + 1);
      }
      const bestWeekDays = Math.max(0, ...daysPerWeek.values());

      const inputs: BadgeInputs = {
        mealsLogged,
        photosLogged,
        longestStreak: streak.longest,
        bestWeekDays,
        weightLogCount: weightRes.count ?? 0,
        proteinHitDays,
      };
      const earnedIds = computeEarnedBadges(inputs);

      // --- award newly earned rows ---
      const earned: Record<string, string> = {};
      for (const row of achRes.data ?? []) earned[row.achievement_id] = row.earned_at;

      const knownIds = new Set(BADGES.map((b) => b.id));
      const newlyEarned = earnedIds.filter((id) => knownIds.has(id) && !(id in earned));

      if (newlyEarned.length > 0) {
        const now = new Date().toISOString();
        try {
          const { error } = await supabase.from("user_achievements").upsert(
            newlyEarned.map((id) => ({ user_id: uid!, achievement_id: id, earned_at: now })),
            { onConflict: "user_id,achievement_id" },
          );
          if (error) throw error;
          for (const id of newlyEarned) earned[id] = now;
          qc.invalidateQueries({ queryKey: ["achievements", uid] });
        } catch {
          // Awarding is best-effort — never fail the whole milestones view over it.
        }
      }

      return {
        earned,
        newlyEarned,
        stats: { daysLogged: loggedDays.size, longestStreak: streak.longest, mealsLogged },
      };
    },
  });
}

// ------------------------------------------------------------ useDeleteWeight

/** Removes one weigh-in row. Trend + goals refresh after. */
export function useDeleteWeight(): UseMutationResult<void, Error, { id: string }, unknown> {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }): Promise<void> => {
      if (!uid) throw new Error("Not authenticated");
      const { error } = await supabase.from("weight_logs").delete().eq("id", id).eq("user_id", uid);
      if (error) throw error;
    },
    onError: () => toast.error("Couldn't remove that weigh-in."),
    onSuccess: () => toast("Weigh-in removed"),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["weights", uid] });
    },
  });
}

// -------------------------------------------------------------- useExportData

/** Client-side data export: fetches the user's logs and downloads a JSON file. */
export function useExportData(): UseMutationResult<void, Error, void, unknown> {
  const { session } = useSession();
  const uid = session?.user.id;

  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!uid) throw new Error("Not authenticated");
      const [food, water, weight, exercise] = await Promise.all([
        supabase.from("food_logs").select("*").eq("user_id", uid).order("logged_at", { ascending: true }),
        supabase.from("water_logs").select("*").eq("user_id", uid).order("logged_at", { ascending: true }),
        supabase.from("weight_logs").select("*").eq("user_id", uid).order("logged_at", { ascending: true }),
        supabase.from("exercise_logs").select("*").eq("user_id", uid).order("logged_at", { ascending: true }),
      ]);
      const firstError = food.error ?? water.error ?? weight.error ?? exercise.error;
      if (firstError) throw firstError;

      const payload = {
        exported_at: new Date().toISOString(),
        food_logs: food.data ?? [],
        water_logs: water.data ?? [],
        weight_logs: weight.data ?? [],
        exercise_logs: exercise.data ?? [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `caltrack-export-${dayKey(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.success("Your data is downloading."),
    onError: () => toast.error("Export failed. Please try again."),
  });
}
