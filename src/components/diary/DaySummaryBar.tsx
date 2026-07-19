import { MacroBar, Surface } from "@/components/system";
import type { Goals, MacroSet } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface DaySummaryBarProps {
  totals: MacroSet;
  goals: Goals | null;
  className?: string;
}

const MACRO_ROWS = [
  { kind: "protein", letter: "P", text: "text-protein", goalKey: "daily_protein" },
  { kind: "carbs", letter: "C", text: "text-carbs", goalKey: "daily_carbs" },
  { kind: "fat", letter: "F", text: "text-fat", goalKey: "daily_fat" },
] as const;

/** Compact day totals: kcal vs goal + three mini macro bars. */
export function DaySummaryBar({ totals, goals, className }: DaySummaryBarProps) {
  return (
    <Surface className={cn("p-4", className)}>
      <div className="flex items-baseline gap-1.5">
        <span className="text-display-md tabular-nums text-foreground">
          {Math.round(totals.calories)}
        </span>
        <span className="text-caption text-muted-foreground tabular-nums">
          {goals ? `/ ${Math.round(goals.daily_calories)} kcal` : "kcal"}
        </span>
      </div>

      {goals && (
        <div className="mt-3 space-y-2">
          {MACRO_ROWS.map(({ kind, letter, text, goalKey }) => (
            <div key={kind} className="flex items-center gap-2">
              <span className={cn("w-3 shrink-0 text-micro uppercase", text)}>{letter}</span>
              <MacroBar kind={kind} value={totals[kind]} target={goals[goalKey]} compact className="flex-1" />
            </div>
          ))}
        </div>
      )}
    </Surface>
  );
}
