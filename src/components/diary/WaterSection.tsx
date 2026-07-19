import { Minus, Plus } from "lucide-react";
import { Surface } from "@/components/system";
import { useLogWater } from "@/hooks/useMutations";
import { cn } from "@/lib/utils";

export interface WaterSectionProps {
  dateKey: string;
  totalMl: number;
  goalMl: number;
  className?: string;
}

const GLASSES = 8;
const STEP_ML = 250;

/** Diary water tracker: total vs goal, 8-glass dot indicator, ±250ml buttons. */
export function WaterSection({ dateKey, totalMl, goalMl, className }: WaterSectionProps) {
  const logWater = useLogWater();
  const glassMl = goalMl > 0 ? goalMl / GLASSES : STEP_ML;
  const filled = Math.min(GLASSES, Math.floor(totalMl / glassMl));

  return (
    <section className={cn("space-y-2", className)}>
      <div className="flex h-8 items-baseline justify-between px-1">
        <h2 className="text-micro uppercase text-muted-foreground">Water</h2>
        <span className="text-caption tabular-nums text-secondary-text">
          {Math.round(totalMl)}{goalMl > 0 ? ` / ${Math.round(goalMl)}` : ""} ml
        </span>
      </div>

      <Surface className="flex items-center gap-3 p-4">
        <button
          type="button"
          aria-label="Remove 250 ml of water"
          disabled={totalMl <= 0 || logWater.isPending}
          onClick={() => logWater.mutate({ dayKey: dateKey, deltaMl: -STEP_ML })}
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border transition-transform duration-instant",
            totalMl <= 0 ? "text-text-disabled" : "text-water active:scale-[0.92]",
          )}
        >
          <Minus className="h-5 w-5" />
        </button>

        <div className="flex flex-1 items-center justify-center gap-2" aria-hidden="true">
          {Array.from({ length: GLASSES }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-3 w-3 rounded-full transition-colors duration-fast",
                i < filled ? "bg-water" : "bg-water-soft",
              )}
            />
          ))}
        </div>

        <button
          type="button"
          aria-label="Add 250 ml of water"
          disabled={logWater.isPending}
          onClick={() => logWater.mutate({ dayKey: dateKey, deltaMl: STEP_ML })}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-water-soft text-water transition-transform duration-instant active:scale-[0.92]"
        >
          <Plus className="h-5 w-5" />
        </button>
      </Surface>
    </section>
  );
}
