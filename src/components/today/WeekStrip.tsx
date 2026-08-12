// Horizontally scrollable date strip: the last 8 weeks of days ending today,
// scrolled to today on mount. Filled = a food log exists that local day.
// Owns a tiny dedicated query of logged dayKeys in the window (sanctioned
// exception to hard rule 9 — see agent brief). queryKey is prefixed
// ["streak", uid] so existing meal-log/delete invalidations refresh it for free.

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { dayKey, dayRangeISO, localDayStart } from "@/lib/dates";
import { Shimmer } from "@/components/system";
import { cn } from "@/lib/utils";

/** How far back the strip scrolls (days, today inclusive). */
const WINDOW_DAYS = 56;

export interface WeekStripProps {
  className?: string;
}

export function WeekStrip({ className }: WeekStripProps) {
  const navigate = useNavigate();
  const { session } = useSession();
  const uid = session?.user.id;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLButtonElement>(null);

  const today = localDayStart();
  const todayKey = dayKey(today);
  // Oldest day first so the newest sits at the right edge, next to the thumb.
  const days = Array.from(
    { length: WINDOW_DAYS },
    (_, i) =>
      new Date(today.getFullYear(), today.getMonth(), today.getDate() - (WINDOW_DAYS - 1 - i)),
  );
  const firstKey = dayKey(days[0]);

  const { data: loggedDays, isLoading } = useQuery({
    // Prefix ["streak", uid] on purpose: useLogMeal/useDeleteLog invalidate that prefix.
    queryKey: ["streak", uid, "strip-logged", firstKey],
    enabled: !!uid,
    queryFn: async (): Promise<string[]> => {
      const { fromISO } = dayRangeISO(firstKey);
      const { data, error } = await supabase
        .from("food_logs")
        .select("logged_at")
        .eq("user_id", uid!)
        .eq("status", 1)
        .gte("logged_at", fromISO);
      if (error) throw error;
      const set = new Set<string>();
      for (const row of data ?? []) {
        if (row.logged_at) set.add(dayKey(new Date(row.logged_at)));
      }
      return [...set];
    },
  });

  // Land on today (right edge) without animating on first paint.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollLeft = scroller.scrollWidth;
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 overflow-hidden px-1", className)}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex min-h-11 w-11 shrink-0 flex-col items-center gap-1 py-0.5">
            <Shimmer className="h-3 w-3 rounded-full" />
            <Shimmer className="h-8 w-8 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  const logged = new Set(loggedDays ?? []);

  return (
    <div
      ref={scrollerRef}
      aria-label="Pick a day"
      className={cn(
        "-mx-4 flex snap-x snap-mandatory items-center gap-1 overflow-x-auto scroll-smooth px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {days.map((date, i) => {
        const key = dayKey(date);
        const isLogged = logged.has(key);
        const isTodayDay = key === todayKey;
        const monthChanged = i === 0 || date.getDate() === 1;

        return (
          <button
            key={key}
            ref={isTodayDay ? todayRef : undefined}
            type="button"
            onClick={() => navigate(`/log?date=${key}`)}
            aria-label={`${date.toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}${isLogged ? ", logged" : ""}`}
            className={cn(
              "flex min-h-11 w-11 shrink-0 snap-end flex-col items-center gap-1 rounded-control py-0.5",
              "transition-transform duration-instant active:scale-[0.92]",
            )}
          >
            <span
              className={cn(
                "text-micro uppercase",
                isTodayDay ? "text-primary" : "text-muted-foreground",
              )}
            >
              {monthChanged
                ? date.toLocaleDateString(undefined, { month: "short" })
                : date.toLocaleDateString(undefined, { weekday: "narrow" })}
            </span>
            <span
              className={cn(
                "grid h-8 w-8 place-items-center rounded-full text-label tabular-nums",
                isLogged
                  ? "bg-primary text-primary-foreground"
                  : isTodayDay
                    ? "border-2 border-primary text-primary"
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
