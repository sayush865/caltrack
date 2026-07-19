import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Goals } from "@/lib/types";
import { useSession } from "./useSession";

function toGoalType(value: string | null): Goals["goal_type"] {
  return value === "lose" || value === "gain" ? value : "maintain";
}

/** Goals query keyed by user id. staleTime Infinity — invalidated by useUpdateGoals / useLogWeight. */
export function useGoals(): UseQueryResult<Goals | null> {
  const { session } = useSession();
  const uid = session?.user.id;

  return useQuery({
    queryKey: ["goals", uid],
    enabled: !!uid,
    staleTime: Infinity,
    queryFn: async (): Promise<Goals | null> => {
      const { data, error } = await supabase
        .from("user_goals")
        .select("*")
        .eq("user_id", uid!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        daily_calories: Number(data.daily_calories),
        daily_protein: Number(data.daily_protein),
        daily_carbs: Number(data.daily_carbs),
        daily_fat: Number(data.daily_fat),
        daily_fiber: Number(data.daily_fiber),
        daily_water: Number(data.daily_water),
        goal_type: toGoalType(data.goal_type),
        current_weight: data.current_weight === null ? null : Number(data.current_weight),
        goal_weight: data.goal_weight === null ? null : Number(data.goal_weight),
        daily_active_calories: Number(data.daily_active_calories),
        daily_exercise_minutes: Number(data.daily_exercise_minutes),
        weekly_exercise_days: Number(data.weekly_exercise_days),
      };
    },
  });
}
