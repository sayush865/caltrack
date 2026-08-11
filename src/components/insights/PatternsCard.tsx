// Patterns — deterministic reads over the last 21 local days. No AI: these are
// plain arithmetic (best/worst weekday, consistency, protein & fiber hit rate)
// so they stay stable between AI refreshes.

import { useMemo } from "react";
import { Activity } from "lucide-react";
import { Shimmer, Surface } from "@/components/system";
import { useGoals } from "@/hooks/useGoals";
import { parseDayKey } from "@/lib/dates";
import { useInsightsHistory, type DailyTotal } from "./useInsightsHistory";

interface Pattern {
  label: string;
  value: string;
  detail: string;
}

function weekdayName(index: number): string {
  const d = new Date(2024, 0, 7 + index); // 2024-01-07 is a Sunday
  return d.toLocaleDateString(undefined, { weekday: "long" });
}

/** Mean kcal per weekday over logged days only. */
function weekdayAverages(days: DailyTotal[]): Array<{ index: number; avg: number; n: number }> {
  const buckets = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
  for (const d of days) {
    if (!d.logged) continue;
    const idx = parseDayKey(d.day).getDay();
    buckets[idx].sum += d.calories;
    buckets[idx].n += 1;
  }
  return buckets
    .map((b, index) => ({ index, avg: b.n ? b.sum / b.n : 0, n: b.n }))
    .filter((b) => b.n > 0);
}

export function PatternsCard() {
  const historyQuery = useInsightsHistory();
  const goalsQuery = useGoals();

  const goal = goalsQuery.data?.daily_calories ?? 0;
  const proteinGoal = goalsQuery.data?.daily_protein ?? 0;
  const fiberGoal = goalsQuery.data?.daily_fiber ?? 0;

  const patterns = useMemo<Pattern[]>(() => {
    const days = historyQuery.data?.days ?? [];
    const logged = days.filter((d) => d.logged);
    if (logged.length < 3) return [];

    const out: Pattern[] = [];
    const byWeekday = weekdayAverages(days);

    if (byWeekday.length >= 3) {
      const highest = byWeekday.reduce((a, b) => (b.avg > a.avg ? b : a));
      const lowest = byWeekday.reduce((a, b) => (b.avg < a.avg ? b : a));
      if (Math.round(highest.avg) !== Math.round(lowest.avg)) {
        out.push({
          label: "Heaviest day",
          value: weekdayName(highest.index),
          detail: `${Math.round(highest.avg).toLocaleString()} kcal on average — about ${Math.round(
            highest.avg - lowest.avg,
          ).toLocaleString()} more than your ${weekdayName(lowest.index)}s.`,
        });
      }
    }

    if (goal > 0) {
      const within = logged.filter((d) => d.calories <= goal * 1.05).length;
      out.push({
        label: "On-target rate",
        value: `${Math.round((within / logged.length) * 100)}%`,
        detail: `${within} of your ${logged.length} logged days landed at or under ${Math.round(
          goal,
        ).toLocaleString()} kcal.`,
      });
    }

    const consistency = Math.round((logged.length / days.length) * 100);
    out.push({
      label: "Logging consistency",
      value: `${consistency}%`,
      detail: `You logged ${logged.length} of the last ${days.length} days.`,
    });

    if (proteinGoal > 0) {
      const hit = logged.filter((d) => d.protein >= proteinGoal).length;
      const avg = logged.reduce((s, d) => s + d.protein, 0) / logged.length;
      out.push({
        label: "Protein target",
        value: `${hit}/${logged.length} days`,
        detail: `Averaging ${Math.round(avg)}g against a ${Math.round(proteinGoal)}g goal.`,
      });
    }

    if (fiberGoal > 0) {
      const avg = logged.reduce((s, d) => s + d.fiber, 0) / logged.length;
      out.push({
        label: "Fiber",
        value: `${Math.round(avg)}g / day`,
        detail:
          avg >= fiberGoal
            ? `Comfortably above your ${Math.round(fiberGoal)}g goal.`
            : `About ${Math.round(fiberGoal - avg)}g short of your ${Math.round(fiberGoal)}g goal.`,
      });
    }

    return out;
  }, [historyQuery.data, goal, proteinGoal, fiberGoal]);

  if (historyQuery.isLoading || goalsQuery.isLoading) {
    return (
      <Surface className="space-y-3 p-5">
        <Shimmer className="h-5 w-24 rounded-control" />
        <Shimmer className="h-12 w-full rounded-control" />
        <Shimmer className="h-12 w-full rounded-control" />
      </Surface>
    );
  }

  return (
    <Surface className="p-5">
      <h2 className="text-heading text-foreground">Patterns</h2>

      {patterns.length === 0 ? (
        <div className="mt-3 flex items-start gap-3">
          <Activity className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-caption text-secondary-text">
            Log at least three days and your patterns show up here — heaviest weekday, on-target rate,
            protein and fiber trends.
          </p>
        </div>
      ) : (
        <div className="mt-1">
          {patterns.map((p) => (
            <div key={p.label} className="border-t border-border py-3 first:border-t-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-micro uppercase text-muted-foreground">{p.label}</span>
                <span className="text-label font-semibold tabular-nums text-foreground">{p.value}</span>
              </div>
              <p className="mt-0.5 text-caption text-secondary-text">{p.detail}</p>
            </div>
          ))}
        </div>
      )}
    </Surface>
  );
}
