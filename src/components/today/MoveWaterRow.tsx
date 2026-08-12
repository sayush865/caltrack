// Today: water + movement at a glance, next to the calorie ring.
// Both live on page 1 of the day so hydration and exercise aren't hidden
// behind a horizontal swipe. Water quick-adds 250 ml; movement deep-links
// to /exercise for the day being viewed.

import { Droplets, Dumbbell, Minus, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProgressRing, Surface } from "@/components/system";
import { useLogWater } from "@/hooks/useMutations";
import type { DayData, Goals } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEFAULT_WATER_ML = 2000;
const DEFAULT_MOVE_MIN = 30;
const GLASS_ML = 250;

export interface MoveWaterRowProps {
  day: DayData;
  goals: Goals | null;
  dayKey: string;
  className?: string;
}

export function MoveWaterRow({ day, goals, dayKey, className }: MoveWaterRowProps) {
  const navigate = useNavigate();
  const logWater = useLogWater();

  const waterGoal = goals?.daily_water ?? DEFAULT_WATER_ML;
  const water = Math.round(day.water);
  const glasses = Math.round(water / GLASS_ML);

  const moveGoal = goals?.daily_exercise_minutes ?? DEFAULT_MOVE_MIN;
  const minutes = day.exercise.rows.reduce((sum, row) => sum + (row.duration_minutes ?? 0), 0);
  const burned = Math.round(day.exercise.calories);

  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {/* Water */}
      <Surface className="flex flex-col p-4">
        <div className="flex items-center gap-1.5">
          <Droplets className="h-4 w-4 shrink-0 text-water" />
          <span className="text-micro uppercase text-muted-foreground">Water</span>
        </div>
        <p className="mt-1.5 font-display text-[22px] font-bold leading-none tabular-nums text-foreground">
          {water.toLocaleString()}
          <span className="text-caption font-medium text-muted-foreground">
            /{waterGoal.toLocaleString()} ml
          </span>
        </p>
        <p className="mt-1 text-caption text-muted-foreground tabular-nums">
          {glasses} {glasses === 1 ? "glass" : "glasses"}
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-calories-track">
          <div
            className="h-full rounded-full bg-water transition-[width] duration-expressive ease-out"
            style={{ width: `${Math.min(100, waterGoal > 0 ? (water / waterGoal) * 100 : 0)}%` }}
          />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            aria-label={`Remove ${GLASS_ML} ml of water`}
            disabled={logWater.isPending || water <= 0}
            onClick={() => logWater.mutate({ dayKey, deltaMl: -Math.min(GLASS_ML, water) })}
            className="grid h-11 w-11 place-items-center rounded-full border border-border text-secondary-text transition-transform duration-instant active:scale-[0.92] disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={logWater.isPending}
            onClick={() => logWater.mutate({ dayKey, deltaMl: GLASS_ML })}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-water-soft text-label font-medium text-water transition-transform duration-instant active:scale-[0.92] disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {GLASS_ML} ml
          </button>
        </div>
      </Surface>

      {/* Movement */}
      <Surface className="flex flex-col p-4">
        <div className="flex items-center gap-1.5">
          <Dumbbell className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-micro uppercase text-muted-foreground">Move</span>
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-[22px] font-bold leading-none tabular-nums text-foreground">
              {minutes}
              <span className="text-caption font-medium text-muted-foreground">
                /{moveGoal} min
              </span>
            </p>
            <p className="mt-1 text-caption text-muted-foreground tabular-nums">
              {burned.toLocaleString()} kcal burned
            </p>
          </div>
          <ProgressRing
            value={moveGoal > 0 ? minutes / moveGoal : 0}
            size={44}
            stroke={5}
            trackClass="text-calories-track"
            fillClass="text-primary"
            animate
          >
            <span className="text-micro tabular-nums text-muted-foreground">
              {Math.min(999, Math.round(moveGoal > 0 ? (minutes / moveGoal) * 100 : 0))}
            </span>
          </ProgressRing>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/exercise?date=${dayKey}`)}
          className="mt-auto flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-primary-soft text-label font-medium text-primary transition-transform duration-instant active:scale-[0.92]"
        >
          <Plus className="h-4 w-4" />
          Log exercise
        </button>
      </Surface>
    </div>
  );
}
