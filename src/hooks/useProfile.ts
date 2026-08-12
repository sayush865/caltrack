import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/types";
import { useSession } from "./useSession";

/** Profile query keyed by user id. staleTime Infinity — invalidated by useUpdateProfile. */
export function useProfile(): UseQueryResult<Profile | null> {
  const { session } = useSession();
  const uid = session?.user.id;

  return useQuery({
    queryKey: ["profile", uid],
    enabled: !!uid,
    staleTime: Infinity,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        username: data.username,
        email: data.email,
        age: data.age === null ? null : Number(data.age),
        gender: data.gender,
        height: data.height === null ? null : Number(data.height),
        activity_level: data.activity_level,
        units_preference: data.units_preference === "imperial" ? "imperial" : "metric",
        onboarding_completed: !!data.onboarding_completed,
        has_seen_tutorial: !!data.has_seen_tutorial,
        diet_type: data.diet_type ?? null,
        cuisines: data.cuisines ?? null,
        allergies: data.allergies ?? null,
        dislikes: data.dislikes ?? null,
        meals_per_day: data.meals_per_day === null || data.meals_per_day === undefined ? null : Number(data.meals_per_day),
        cooking_style: data.cooking_style ?? null,
        food_notes: data.food_notes ?? null,
      };
    },
  });
}
