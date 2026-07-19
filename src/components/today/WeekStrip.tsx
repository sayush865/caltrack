// Mon-start week strip: 7 day circles, filled = a food log exists that local day.
// Owns a tiny dedicated query of this week's logged dayKeys (sanctioned exception
// to hard rule 9 — see agent brief). queryKey is prefixed ["streak", uid] so the
// existing meal-log/delete invalidations refresh it for free.

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { dayKey, dayRangeISO, localDayStart } from "@/lib/dates";
import { Shimmer } from "@/components/system";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export interface WeekStripProps {
  className?: string;
}

export function WeekStrip({ className }: WeekStripProps) {
  const navigate = useNavigate();
  const { session } = useSession();
  const uid = session?.user.id;

  const today = localDayStart();
  const daysSinceMonday = (today.getDay() + 6) % 7; // 0 Sun..6 Sat -> Mon-start offset
  const week = Array.from(
    { length: 7 },
    (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysSinceMonday + i),
  );
  const mondayKey = dayKey(week[0]);
  const todayKey = dayKey(today);

  const { data: loggedDays, isLoading } = useQuery({
    // Prefix ["streak", uid] on purpose: useLogMeal/useDeleteLog invalidate that prefix.
    queryKey: ["streak", uid, "week-logged", mondayKey],
    enabled: !!uid,
    queryFn: async (): Promise<string[]> => {
      const { fromISO } = dayRangeISO(mondayKey);
      const { data, error } = await supabase
        .from("food_logs")
        .select("logged_at")
        .eq("user_id", uid!)
        .eq("status", 1)
        .gte("logged_at", fromISO);
      if (error) throw error;
      const days = new Set<string>();
      for (const row of data ?? []) {
        if (row.logged_at) days.add(dayKey(new Date(row.logged_at)));
      }
      return [...days];
    },
  });

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-between px-1", className)}>
        {DAY_LABELS.map((_, i) => (
          <div key={i} className="flex min-h-11 w-11 flex-col items-center gap-1 py-0.5">
            <Shimmer className="h-3 w-3 rounded-full" />
            <Shimmer className="h-8 w-8 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  const logged = new Set(loggedDays ?? []);

  return (
    <div className={cn("flex items-center justify-between px-1", className)} aria-label="This week">
      {week.map((date, i) => {
        const key = dayKey(date);
        const isLogged = logged.has(key);
        const isTodayDay = key === todayKey;
        const isFutureDay = key > todayKey;

        return (
          <button
            key={key}
            type="button"
            disabled={isFutureDay}
            onClick={() => navigate(`/log?date=${key}`)}
            aria-label={`${date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}${isLogged ? ", logged" : ""}`}
            className={cn(
              "flex min-h-11 w-11 flex-col items-center gap-1 rounded-control py-0.5",
              "transition-transform duration-instant active:scale-[0.92]",
              isFutureDay && "pointer-events-none",
            )}
          >
            <span
              className={cn(
                "text-micro uppercase",
                isTodayDay ? "text-primary" : "text-muted-foreground",
                isFutureDay && "text-text-disabled",
              )}
            >
              {DAY_LABELS[i]}
            </span>
            <span
              className={cn(
                "grid h-8 w-8 place-items-center rounded-full text-label tabular-nums",
                isLogged
                  ? "bg-primary text-primary-foreground"
                  : isTodayDay
                    ? "border-2 border-primary text-primary"
                    : isFutureDay
                      ? "bg-secondary text-text-disabled"
                      : "bg-secondary text-muted-foreground",
              )}
            >
              {date.getDate()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
