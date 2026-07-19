import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./useSession";

export interface WeightRow {
  id: string;
  logged_at: string;
  weight: number; // ALWAYS kg
}

/** All weight logs (kg), ascending by time. Invalidated by useLogWeight. */
export function useWeights(): UseQueryResult<WeightRow[]> {
  const { session } = useSession();
  const uid = session?.user.id;

  return useQuery({
    queryKey: ["weights", uid],
    enabled: !!uid,
    queryFn: async (): Promise<WeightRow[]> => {
      const { data, error } = await supabase
        .from("weight_logs")
        .select("id, logged_at, weight")
        .eq("user_id", uid!)
        .order("logged_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        logged_at: row.logged_at,
        weight: Number(row.weight),
      }));
    },
  });
}
