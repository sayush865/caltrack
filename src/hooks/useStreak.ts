import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dayKey, localDayStart, parseDayKey } from "@/lib/dates";
import { useSession } from "./useSession";

export interface StreakData {
  current: number;
  longest: number;
  daysThisWeek: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Round-based local-day difference (DST-safe). */
function dayDiff(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / DAY_MS);
}

export function computeStreak(loggedDayKeys: Set<string>, now: Date = new Date()): StreakData {
  const today = localDayStart(now);

  // Current streak: consecutive local days ending today or yesterday.
  let current = 0;
  const startOffset = loggedDayKeys.has(dayKey(today)) ? 0 : 1;
  for (let offset = startOffset; ; offset++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    if (loggedDayKeys.has(dayKey(d))) current++;
    else break;
  }

  // Longest run in the window.
  const sorted = [...loggedDayKeys].sort().map(parseDayKey);
  let longest = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 || dayDiff(sorted[i], sorted[i - 1]) === 1) run++;
    else run = 1;
    if (run > longest) longest = run;
  }
  if (current > longest) longest = current;

  // Days logged this week (Mon-start), up to today.
  const dow = today.getDay(); // 0 Sun .. 6 Sat
  const daysSinceMonday = (dow + 6) % 7;
  let daysThisWeek = 0;
  for (let offset = 0; offset <= daysSinceMonday; offset++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    if (loggedDayKeys.has(dayKey(d))) daysThisWeek++;
  }

  return { current, longest, daysThisWeek };
}

/**
 * Streak computed CLIENT-side from distinct LOCAL days with food logs (status=1, last 120 days).
 * Invalidated after every meal log.
 */
export function useStreak(): UseQueryResult<StreakData> {
  const { session } = useSession();
  const uid = session?.user.id;

  return useQuery({
    queryKey: ["streak", uid],
    enabled: !!uid,
    queryFn: async (): Promise<StreakData> => {
      const today = localDayStart();
      const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 120);

      const { data, error } = await supabase
        .from("food_logs")
        .select("logged_at")
        .eq("user_id", uid!)
        .eq("status", 1)
        .gte("logged_at", from.toISOString());
      if (error) throw error;

      const days = new Set<string>();
      for (const row of data ?? []) {
        if (row.logged_at) days.add(dayKey(new Date(row.logged_at)));
      }
      return computeStreak(days);
    },
  });
}
