import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, subWeeks, startOfWeek, endOfWeek } from "date-fns";

interface TrendData {
  currentWeekCalories: number;
  lastWeekCalories: number;
  currentWeekProtein: number;
  lastWeekProtein: number;
  currentWeekWater: number;
  lastWeekWater: number;
  todayCalories: number;
  yesterdayCalories: number;
  loading: boolean;
}

export function useTrends() {
  const [trends, setTrends] = useState<TrendData>({
    currentWeekCalories: 0,
    lastWeekCalories: 0,
    currentWeekProtein: 0,
    lastWeekProtein: 0,
    currentWeekWater: 0,
    lastWeekWater: 0,
    todayCalories: 0,
    yesterdayCalories: 0,
    loading: true,
  });

  useEffect(() => {
    fetchTrends();
  }, []);

  const fetchTrends = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      const yesterday = subDays(today, 1);
      const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
      const lastWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });

      // Fetch food logs for current week
      const { data: currentWeekLogs } = await supabase
        .from("food_logs")
        .select("calories, protein, logged_at")
        .eq("user_id", user.id)
        .eq("status", 1)
        .gte("logged_at", thisWeekStart.toISOString())
        .lte("logged_at", today.toISOString());

      // Fetch food logs for last week
      const { data: lastWeekLogs } = await supabase
        .from("food_logs")
        .select("calories, protein, logged_at")
        .eq("user_id", user.id)
        .eq("status", 1)
        .gte("logged_at", lastWeekStart.toISOString())
        .lte("logged_at", lastWeekEnd.toISOString());

      // Fetch water logs for current week
      const { data: currentWeekWater } = await supabase
        .from("water_logs")
        .select("amount_ml")
        .eq("user_id", user.id)
        .gte("logged_at", thisWeekStart.toISOString())
        .lte("logged_at", today.toISOString());

      // Fetch water logs for last week
      const { data: lastWeekWater } = await supabase
        .from("water_logs")
        .select("amount_ml")
        .eq("user_id", user.id)
        .gte("logged_at", lastWeekStart.toISOString())
        .lte("logged_at", lastWeekEnd.toISOString());

      // Fetch today's and yesterday's logs for daily comparison
      const { data: todayLogs } = await supabase
        .from("food_logs")
        .select("calories")
        .eq("user_id", user.id)
        .eq("status", 1)
        .gte("logged_at", startOfDay(today).toISOString())
        .lte("logged_at", endOfDay(today).toISOString());

      const { data: yesterdayLogs } = await supabase
        .from("food_logs")
        .select("calories")
        .eq("user_id", user.id)
        .eq("status", 1)
        .gte("logged_at", startOfDay(yesterday).toISOString())
        .lte("logged_at", endOfDay(yesterday).toISOString());

      // Calculate totals
      const currentWeekCalories = currentWeekLogs?.reduce((sum, log) => sum + (Number(log.calories) || 0), 0) || 0;
      const lastWeekCalories = lastWeekLogs?.reduce((sum, log) => sum + (Number(log.calories) || 0), 0) || 0;
      const currentWeekProtein = currentWeekLogs?.reduce((sum, log) => sum + (Number(log.protein) || 0), 0) || 0;
      const lastWeekProtein = lastWeekLogs?.reduce((sum, log) => sum + (Number(log.protein) || 0), 0) || 0;
      const currentWeekWaterTotal = currentWeekWater?.reduce((sum, log) => sum + (log.amount_ml || 0), 0) || 0;
      const lastWeekWaterTotal = lastWeekWater?.reduce((sum, log) => sum + (log.amount_ml || 0), 0) || 0;
      const todayCalories = todayLogs?.reduce((sum, log) => sum + (Number(log.calories) || 0), 0) || 0;
      const yesterdayCalories = yesterdayLogs?.reduce((sum, log) => sum + (Number(log.calories) || 0), 0) || 0;

      setTrends({
        currentWeekCalories,
        lastWeekCalories,
        currentWeekProtein,
        lastWeekProtein,
        currentWeekWater: currentWeekWaterTotal,
        lastWeekWater: lastWeekWaterTotal,
        todayCalories,
        yesterdayCalories,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching trends:", error);
      setTrends((prev) => ({ ...prev, loading: false }));
    }
  };

  return trends;
}
