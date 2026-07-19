// Duration picker for an exercise: minutes stepper + computed kcal
// (MET x weight-kg x hours — weight comes from user_goals.current_weight,
// which is stored in kg per lib/units contract; fixes the old lbs assumption).

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { friendlyDay, isToday } from "@/lib/dates";
import { useLogExercise } from "@/hooks/useMutations";
import { exerciseCalories, intensityFromMet, intensityLabel } from "./exerciseSeed";

const MIN_MINUTES = 5;
const MAX_MINUTES = 480;
const QUICK_MINUTES = [15, 30, 45, 60] as const;

export interface SheetExercise {
  name: string;
  category: string;
  met: number;
}

export interface DurationSheetProps {
  exercise: SheetExercise | null;
  onOpenChange: (open: boolean) => void;
  /** User weight in kg (fallback 70 handled by the page). */
  weightKg: number;
  /** Local day the entry is logged to (?date= or today). */
  dateKey: string;
}

export function DurationSheet({ exercise, onOpenChange, weightKg, dateKey }: DurationSheetProps) {
  const navigate = useNavigate();
  const logExercise = useLogExercise();
  const [minutes, setMinutes] = useState(30);

  useEffect(() => {
    if (exercise) setMinutes(30);
  }, [exercise?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const step = (delta: number) =>
    setMinutes((m) => Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, m + delta)));

  const calories = exercise ? exerciseCalories(exercise.met, weightKg, minutes) : 0;

  const log = () => {
    if (!exercise || logExercise.isPending) return;
    const name = exercise.name;
    logExercise.mutate(
      {
        name,
        minutes,
        calories,
        dayKey: dateKey,
        type: exercise.category.toLowerCase(),
        intensity: intensityFromMet(exercise.met),
      },
      {
        onSuccess: () => {
          toast.success(`Logged ${name} — ${minutes} min`);
          onOpenChange(false);
          navigate(isToday(dateKey) ? "/" : `/log?date=${dateKey}`);
        },
      },
    );
  };

  return (
    <Sheet open={!!exercise} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[24px] border-t border-border bg-card px-4 pb-4 pt-5 shadow-raised"
      >
        {exercise && (
          <div className="pb-safe">
            <SheetHeader className="text-left">
              <SheetTitle className="text-title text-foreground">{exercise.name}</SheetTitle>
            </SheetHeader>
            <p className="mt-0.5 text-caption text-muted-foreground">
              {intensityLabel(exercise.met)} intensity · logging to {friendlyDay(dateKey)}
            </p>

            {/* Minutes stepper */}
            <div className="mt-4 flex items-center justify-between rounded-card border border-border bg-background p-3">
              <button
                type="button"
                aria-label="Fewer minutes"
                onClick={() => step(-5)}
                disabled={minutes <= MIN_MINUTES}
                className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground transition-transform duration-instant active:scale-[0.92] disabled:opacity-40"
              >
                <Minus className="h-5 w-5" />
              </button>
              <div className="text-center">
                <p className="font-display text-display-md tabular-nums text-foreground">{minutes}</p>
                <p className="text-caption text-muted-foreground">minutes</p>
              </div>
              <button
                type="button"
                aria-label="More minutes"
                onClick={() => step(5)}
                disabled={minutes >= MAX_MINUTES}
                className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground transition-transform duration-instant active:scale-[0.92] disabled:opacity-40"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-2 flex gap-1.5">
              {QUICK_MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutes(m)}
                  className={`flex h-11 flex-1 items-center justify-center rounded-full text-label tabular-nums transition-transform duration-instant active:scale-[0.92] ${
                    minutes === m
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-secondary-text"
                  }`}
                >
                  {m} min
                </button>
              ))}
            </div>

            {/* Computed burn */}
            <div className="mt-4 flex items-center justify-between rounded-card bg-streak-soft px-4 py-3">
              <span className="flex items-center gap-2 text-label text-secondary-text">
                <Flame className="h-4 w-4 text-streak" />
                Estimated burn
              </span>
              <span className="font-display text-display-md tabular-nums text-foreground">
                {calories}
                <span className="ml-1 text-caption font-medium text-muted-foreground">kcal</span>
              </span>
            </div>
            <p className="mt-1.5 text-caption text-muted-foreground">
              Based on your weight and this activity's intensity.
            </p>

            <button
              type="button"
              onClick={log}
              disabled={logExercise.isPending}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-control bg-primary text-body font-medium text-primary-foreground transition-transform duration-instant active:scale-[0.92] disabled:opacity-60"
            >
              {logExercise.isPending ? "Logging…" : "Log exercise"}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
