// Hero calorie ring card (DESIGN §5.3): ProgressRing 176/14 with count-up center,
// 3 macro bars, and a horizontal scroll-snap page 2 (fiber / water / sugar / sodium
// compact tiles) with 2 page dots. Day-complete (±5% of budget) = success pulse +
// center check + "On target" (DESIGN §7 moment 2). Over goal = amber, NEVER red.

import { useState, type UIEvent } from "react";
import { Check, Plus } from "lucide-react";
import { MacroBar, ProgressRing, Surface, useCountUp } from "@/components/system";
import { useLogWater } from "@/hooks/useMutations";
import type { DayData, Goals } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface HeroCardProps {
  day: DayData;
  goals: Goals | null;
  dayKey: string;
  className?: string;
}

// Sensible fallbacks so the ring renders even before user_goals exists.
const DEFAULTS = { calories: 2000, protein: 120, carbs: 250, fat: 65, fiber: 30, water: 2000 };

// Daily reference intakes (ICMR-NIN 2020, adult) — India-first defaults.
const MICROS = [
  { key: "vitaminA", label: "Vitamin A", unit: "mcg", rda: 900 },
  { key: "vitaminC", label: "Vitamin C", unit: "mg", rda: 80 },
  { key: "calcium", label: "Calcium", unit: "mg", rda: 1000 },
  { key: "iron", label: "Iron", unit: "mg", rda: 19 },
] as const;

export function HeroCard({ day, goals, dayKey, className }: HeroCardProps) {
  const logWater = useLogWater();
  const [page, setPage] = useState(0);

  const calorieGoal = goals?.daily_calories ?? DEFAULTS.calories;
  // Exercise credit is part of the same DayData fetch — no child-callback math.
  const budget = calorieGoal + day.exercise.calories;
  const consumed = day.totals.calories;
  const left = Math.round(budget - consumed);
  const over = left < 0;
  const ringValue = budget > 0 ? consumed / budget : 0;
  const onTarget = consumed > 0 && Math.abs(consumed - budget) <= budget * 0.05;
  const centerValue = useCountUp(Math.abs(left));
  const centerLabel = centerValue.toLocaleString();


  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setPage(Math.round(el.scrollLeft / Math.max(el.clientWidth, 1)));
  };

  return (
    <Surface className={cn("p-5", className)}>
      <div
        onScroll={onScroll}
        className="scrollbar-hide -mx-5 flex snap-x snap-mandatory overflow-x-auto"
      >
        {/* ── Page 1: calorie ring + macro bars ─────────────── */}
        <div className="w-full shrink-0 snap-center px-5">
          <div className="flex justify-center">
            <div className="relative">
              {onTarget && (
                <div
                  aria-hidden="true"
                  className="absolute inset-1 rounded-full bg-success-soft animate-flame-pulse"
                />
              )}
              <ProgressRing
                value={ringValue}
                size={176}
                stroke={14}
                trackClass="text-calories-track"
                fillClass={onTarget ? "text-success" : "text-foreground"}
                overClass="text-warning"
                animate
              >
                <div className="flex w-[132px] flex-col items-center">
                  <span
                    className={cn(
                      "block w-full text-center font-display font-bold leading-[0.95] tracking-[-0.02em] tabular-nums text-foreground",
                      centerLabel.length >= 6
                        ? "text-[38px]"
                        : centerLabel.length === 5
                          ? "text-[46px]"
                          : "text-[56px]",
                    )}
                  >
                    {centerLabel}
                  </span>
                  <span
                    className={cn(
                      "mt-1 text-caption",
                      over ? "text-warning" : "text-muted-foreground",
                    )}
                  >
                    {over ? "kcal over" : "kcal left"}
                  </span>
                </div>
              </ProgressRing>
            </div>
          </div>

          {onTarget && (
            <div className="mt-3 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-micro uppercase text-success">
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                On target
              </span>
            </div>
          )}

          {/* Totals: eaten / budget / burned */}
          <div className="mt-4 flex items-stretch justify-between gap-2 rounded-control border border-border px-3 py-2.5">
            {[
              { label: "Eaten", value: Math.round(consumed) },
              { label: "Budget", value: Math.round(budget) },
              { label: "Burned", value: Math.round(day.exercise.calories) },
            ].map(({ label, value }) => (
              <div key={label} className="min-w-0 flex-1 text-center">
                <p className="text-micro uppercase text-muted-foreground">{label}</p>
                <p className="font-display text-[17px] font-semibold tabular-nums text-foreground">
                  {value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>


          <div className="mt-5 space-y-3">
            <MacroBar
              kind="protein"
              value={day.totals.protein}
              target={goals?.daily_protein ?? DEFAULTS.protein}
            />
            <MacroBar
              kind="carbs"
              value={day.totals.carbs}
              target={goals?.daily_carbs ?? DEFAULTS.carbs}
            />
            <MacroBar
              kind="fat"
              value={day.totals.fat}
              target={goals?.daily_fat ?? DEFAULTS.fat}
            />
          </div>
        </div>

        {/* ── Page 2: fiber / water / sugar / sodium tiles ───── */}
        <div className="flex w-full shrink-0 snap-center flex-col justify-center px-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col justify-center rounded-control border border-border p-3">
              <MacroBar
                kind="fiber"
                value={day.totals.fiber ?? 0}
                target={goals?.daily_fiber ?? DEFAULTS.fiber}
              />
            </div>

            <div className="flex items-center justify-between gap-2 rounded-control border border-border p-3">
              <div className="min-w-0">
                <span className="text-micro uppercase text-water">Water</span>
                <p className="font-display text-[17px] font-semibold tabular-nums text-foreground">
                  {Math.round(day.water)}
                  <span className="text-caption font-medium text-muted-foreground">
                    /{Math.round(goals?.daily_water ?? DEFAULTS.water)} ml
                  </span>
                </p>
              </div>
              <button
                type="button"
                aria-label="Add 250 ml of water"
                disabled={logWater.isPending}
                onClick={() => logWater.mutate({ dayKey, deltaMl: 250 })}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-water-soft text-water transition-transform duration-instant active:scale-[0.92] disabled:opacity-60"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-control border border-border p-3">
              <span className="text-micro uppercase text-muted-foreground">Sugar</span>
              <p className="font-display text-[17px] font-semibold tabular-nums text-foreground">
                {Math.round(day.totals.sugar ?? 0)}
                <span className="text-caption font-medium text-muted-foreground"> g</span>
              </p>
            </div>

            <div className="rounded-control border border-border p-3">
              <span className="text-micro uppercase text-muted-foreground">Sodium</span>
              <p className="font-display text-[17px] font-semibold tabular-nums text-foreground">
                {Math.round(day.totals.sodium ?? 0)}
                <span className="text-caption font-medium text-muted-foreground"> mg</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Page 3: micronutrients vs ICMR daily reference ── */}
        <div className="flex w-full shrink-0 snap-center flex-col justify-center px-5">
          <p className="text-micro uppercase text-muted-foreground">
            Micronutrients · % of daily reference
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {MICROS.map(({ key, label, unit, rda }) => {
              const value = day.totals[key] ?? 0;
              const pct = Math.min(999, Math.round((value / rda) * 100));
              return (
                <div key={key} className="rounded-control border border-border p-3">
                  <span className="text-micro uppercase text-muted-foreground">{label}</span>
                  <p className="font-display text-[17px] font-semibold tabular-nums text-foreground">
                    {value >= 100 ? Math.round(value) : Math.round(value * 10) / 10}
                    <span className="text-caption font-medium text-muted-foreground">
                      {" "}
                      {unit}
                    </span>
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-calories-track">
                    <div
                      className="h-full rounded-full bg-foreground transition-[width] duration-expressive ease-out"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-caption tabular-nums text-muted-foreground">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Page dots (indicators, not targets) */}
      <div className="mt-4 flex justify-center gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors duration-fast",
              page === i ? "bg-primary" : "bg-border-strong",
            )}
          />
        ))}
      </div>

    </Surface>
  );
}
