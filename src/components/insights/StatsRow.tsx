// Best day + exercise totals — small stat row with display-md numbers.

import { useMemo } from "react";

import { Shimmer, Surface } from "@/components/system";
import { useGoals } from "@/hooks/useGoals";
import { parseDayKey } from "@/lib/dates";
import { useInsightsHistory, type DailyTotal } from "./useInsightsHistory";

const fmt = (n: number) => Math.round(n).toLocaleString();

/** Logged day (last 7) whose calories landed closest to the target. */
function findBestDay(days: DailyTotal[], target: number): DailyTotal | null {
  const logged = days.filter((d) => d.logged);
  if (logged.length === 0) return null;
  return logged.reduce((best, day) =>
    Math.abs(day.calories - target) < Math.abs(best.calories - target) ? day : best,
  );
}

export function StatsRow() {
  const historyQuery = useInsightsHistory();
  const goalsQuery = useGoals();

  const target = goalsQuery.data?.daily_calories ?? 2000;

  const bestDay = useMemo(
    () => findBestDay(historyQuery.data?.days.slice(-7) ?? [], target),
    [historyQuery.data, target],
  );

  if (historyQuery.isLoading || goalsQuery.isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Shimmer className="h-24 rounded-card" />
        <Shimmer className="h-24 rounded-card" />
      </div>
    );
  }

  const exercise = historyQuery.data?.exercise ?? { minutes: 0, calories: 0, sessions: 0 };

  return (
    <div className="grid grid-cols-2 gap-3">
      <Surface className="p-4">
        <p className="text-micro uppercase text-muted-foreground">Best day</p>
        {bestDay ? (
          <>
            <p className="mt-1.5 text-display-md tabular-nums text-foreground">{fmt(bestDay.calories)}</p>
            <p className="mt-0.5 text-caption text-muted-foreground">
              kcal on {parseDayKey(bestDay.day).toLocaleDateString(undefined, { weekday: "long" })} — closest to target
            </p>
          </>
        ) : (
          <>
            <p className="mt-1.5 text-display-md tabular-nums text-text-disabled">—</p>
            <p className="mt-0.5 text-caption text-muted-foreground">A few logs will reveal it</p>
          </>
        )}
      </Surface>

      <Surface className="p-4">
        <p className="text-micro uppercase text-muted-foreground">Exercise · 7 days</p>
        {exercise.sessions > 0 ? (
          <>
            <p className="mt-1.5 text-display-md tabular-nums text-foreground">{fmt(exercise.calories)}</p>
            <p className="mt-0.5 text-caption text-muted-foreground">
              kcal burned · {exercise.sessions} {exercise.sessions === 1 ? "session" : "sessions"} · {fmt(exercise.minutes)} min
            </p>
          </>
        ) : (
          <>
            <p className="mt-1.5 text-display-md tabular-nums text-text-disabled">0</p>
            <p className="mt-0.5 text-caption text-muted-foreground">No workouts logged this week</p>
          </>
        )}
      </Surface>
    </div>
  );
}
