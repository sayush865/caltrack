import { Dumbbell, Plus, Trash2 } from "lucide-react";
import { Surface } from "@/components/system";
import type { ExerciseRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDeleteExercise } from "./useMealEdit";

export interface ExerciseSectionProps {
  dateKey: string;
  rows: ExerciseRow[];
  totalCalories: number;
  /** "Add exercise" → /exercise?date=<dateKey>. */
  onAdd: () => void;
  className?: string;
}

/** Diary exercise ledger: rows (name • minutes • kcal • delete) + add row. */
export function ExerciseSection({ dateKey, rows, totalCalories, onAdd, className }: ExerciseSectionProps) {
  const deleteExercise = useDeleteExercise();

  return (
    <section className={cn("space-y-2", className)}>
      <div className="flex h-8 items-baseline justify-between px-1">
        <h2 className="text-micro uppercase text-muted-foreground">Exercise</h2>
        {rows.length > 0 && (
          <span className="text-caption tabular-nums text-secondary-text">{Math.round(totalCalories)} kcal burned</span>
        )}
      </div>

      <Surface>
        {rows.length === 0 ? (
          <p className="px-4 pt-3 text-caption text-muted-foreground">No exercise logged for this day.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={row.id} className="flex h-14 items-center gap-3 px-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-control bg-success-soft">
                  <Dumbbell className="h-4 w-4 text-success" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium text-foreground">{row.exercise_name}</span>
                  <span className="block text-caption tabular-nums text-muted-foreground">
                    {Math.round(row.duration_minutes)} min
                  </span>
                </span>
                <span className="shrink-0 text-label tabular-nums text-secondary-text">
                  {Math.round(row.calories_burned)} kcal
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${row.exercise_name}`}
                  onClick={() =>
                    deleteExercise.mutate({ id: row.id, dayKey: dateKey, name: row.exercise_name })
                  }
                  className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground transition-transform duration-instant hover:text-destructive active:scale-[0.92]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={onAdd}
          className="flex h-11 w-full items-center gap-2 px-4 text-label text-primary transition-transform duration-instant active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          Add exercise
        </button>
      </Surface>
    </section>
  );
}
