// /you/weight — trend-first weight surface: smoothed trend hero, full chart,
// projection, and the weigh-in history. Raw numbers are info, the trend is truth.

import { useMemo, useState } from "react";
import { Flag, Scale, Trash2 } from "lucide-react";

import { EmptyState, PageHeader, Shimmer, Surface } from "@/components/system";
import WeightSheet from "@/components/WeightSheet";
import { TrendChart } from "@/components/you/TrendChart";
import { useDeleteWeight } from "@/components/you/hooks";
import { getPace } from "@/components/you/prefs";
import { useProfile } from "@/hooks/useProfile";
import { useGoals } from "@/hooks/useGoals";
import { useWeights } from "@/hooks/useWeights";
import { dayKey, friendlyDay } from "@/lib/dates";
import { projectionDate, smoothWeights } from "@/lib/energy";
import { displayWeight, formatWeight, weightUnit, type Units } from "@/lib/units";

const round1 = (n: number) => Math.round(n * 10) / 10;

export default function YouWeight() {
  const profileQuery = useProfile();
  const goalsQuery = useGoals();
  const weightsQuery = useWeights();
  const deleteWeight = useDeleteWeight();
  const [sheetOpen, setSheetOpen] = useState(false);

  const units: Units = profileQuery.data?.units_preference === "imperial" ? "imperial" : "metric";
  const unit = weightUnit(units);
  const goals = goalsQuery.data;
  const weights = weightsQuery.data ?? [];

  const trend = useMemo(() => smoothWeights(weights), [weights]);
  const currentTrendKg = trend.length > 0 ? trend[trend.length - 1].trend : null;
  const lastRaw = weights.length > 0 ? weights[weights.length - 1] : null;

  const projection =
    goals && goals.goal_type !== "maintain" && currentTrendKg != null && goals.goal_weight != null
      ? projectionDate(currentTrendKg, goals.goal_weight, getPace())
      : null;

  const remainingKg =
    goals?.goal_weight != null && currentTrendKg != null ? round1(Math.abs(goals.goal_weight - currentTrendKg)) : null;

  // History, newest first, with delta vs the previous weigh-in.
  const history = useMemo(() => {
    return weights
      .map((row, i) => ({
        ...row,
        delta: i > 0 ? round1(row.weight - weights[i - 1].weight) : null,
      }))
      .reverse();
  }, [weights]);

  const loading = weightsQuery.isLoading || profileQuery.isLoading || goalsQuery.isLoading;

  return (
    <div className="min-h-screen bg-background pb-12">
      <PageHeader title="Weight" back />

      <main className="mx-auto max-w-md space-y-3 px-4">
        {loading ? (
          <div className="space-y-3">
            <Shimmer className="h-32 w-full rounded-card" />
            <Shimmer className="h-72 w-full rounded-card" />
            <Shimmer className="h-24 w-full rounded-card" />
            <Shimmer className="h-48 w-full rounded-card" />
          </div>
        ) : weights.length === 0 ? (
          <Surface>
            <EmptyState
              icon={Scale}
              headline="Two weigh-ins and we can show your trend"
              copy="Daily fluctuation is noise — the smoothed trend is the signal. Start today."
              action={{ label: "Log weight", onClick: () => setSheetOpen(true) }}
            />
          </Surface>
        ) : (
          <>
            {/* ── Hero: trend weight ─────────────────────── */}
            <Surface className="p-5">
              <p className="text-micro uppercase text-muted-foreground">Trend weight</p>
              <p className="mt-1 font-display text-display-lg tabular-nums text-foreground">
                {currentTrendKg != null ? displayWeight(currentTrendKg, units).toFixed(1) : "—"}
                <span className="ml-1.5 font-sans text-caption font-medium text-muted-foreground">{unit}</span>
              </p>
              {lastRaw && (
                <p className="mt-1 text-caption text-muted-foreground">
                  Last weigh-in {formatWeight(lastRaw.weight, units)} · {friendlyDay(dayKey(new Date(lastRaw.logged_at)))}
                </p>
              )}
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="mt-4 flex h-11 w-full items-center justify-center rounded-control bg-primary text-label text-primary-foreground transition-transform duration-instant active:scale-[0.92]"
              >
                Log weight
              </button>
            </Surface>

            {/* ── Full trend chart ───────────────────────── */}
            <Surface className="p-5">
              <h2 className="text-heading text-foreground">Trend</h2>
              {trend.length >= 2 ? (
                <div className="mt-3">
                  <TrendChart points={trend} goalKg={goals?.goal_weight} units={units} height={256} />
                  <p className="mt-2 text-caption text-muted-foreground">
                    Dots are weigh-ins; the line is your smoothed trend.
                  </p>
                </div>
              ) : (
                <EmptyState
                  icon={Scale}
                  headline="One more weigh-in to go"
                  copy="Two points make a trend line. Weigh in again tomorrow."
                  action={{ label: "Log weight", onClick: () => setSheetOpen(true) }}
                />
              )}
            </Surface>

            {/* ── Projection ─────────────────────────────── */}
            <Surface className="p-5">
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-primary" />
                <h2 className="text-heading text-foreground">Projection</h2>
              </div>
              {goals?.goal_weight != null && currentTrendKg != null ? (
                goals.goal_type === "maintain" ? (
                  <p className="mt-1 text-body text-secondary-text">
                    You're in maintenance — the goal is a steady line, and you're drawing it.
                  </p>
                ) : remainingKg != null && remainingKg < 0.5 ? (
                  <p className="mt-1 text-body text-secondary-text">
                    You're at your goal of {formatWeight(goals.goal_weight, units)}. Time to maintain — or set a new one.
                  </p>
                ) : (
                  <p className="mt-1 text-body text-secondary-text">
                    {formatWeight(remainingKg ?? 0, units)} to your goal of {formatWeight(goals.goal_weight, units)}
                    {projection
                      ? ` — on your current pace that's around ${projection.toLocaleDateString(undefined, {
                          month: "long",
                          day: "numeric",
                        })}.`
                      : "."}{" "}
                    Projections shift with your data, never with judgment.
                  </p>
                )
              ) : (
                <p className="mt-1 text-body text-muted-foreground">
                  Set a goal weight in Goals and we'll project your arrival date.
                </p>
              )}
            </Surface>

            {/* ── History ────────────────────────────────── */}
            <section>
              <h2 className="px-1 pb-2 pt-2 text-heading text-foreground">History</h2>
              <Surface className="overflow-hidden">
                {history.map((row, idx) => (
                  <div key={row.id}>
                    {idx > 0 && <div className="mx-5 h-px bg-border" />}
                    <div className="flex min-h-[56px] items-center gap-3 px-5 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-body tabular-nums text-foreground">{formatWeight(row.weight, units)}</p>
                        <p className="text-caption text-muted-foreground">
                          {friendlyDay(dayKey(new Date(row.logged_at)))}
                        </p>
                      </div>
                      {row.delta !== null && row.delta !== 0 && (
                        <span className="text-caption tabular-nums text-muted-foreground">
                          {row.delta > 0 ? "+" : "−"}
                          {displayWeight(Math.abs(row.delta), units).toFixed(1)} {unit}
                        </span>
                      )}
                      <button
                        type="button"
                        aria-label={`Delete weigh-in from ${friendlyDay(dayKey(new Date(row.logged_at)))}`}
                        onClick={() => deleteWeight.mutate({ id: row.id })}
                        disabled={deleteWeight.isPending}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground transition-transform duration-instant active:scale-[0.92] disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </Surface>
            </section>
          </>
        )}
      </main>

      <WeightSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
