// Plan reveal: named plan, display-lg calorie count-up, 4 MacroBar rows
// (instead of a donut chart), dated projection line, honest footnote.

import { CalendarDays } from "lucide-react";
import { MacroBar, Surface, useCountUp } from "@/components/system";
import { formatWeight, type Units } from "@/lib/units";
import { formatShortDate, type Plan } from "./quiz";
import { PrimaryButton } from "./ui";

export function PlanReveal({
  plan,
  units,
  goalWeightKg,
  onContinue,
}: {
  plan: Plan;
  units: Units;
  goalWeightKg?: number;
  onContinue: () => void;
}) {
  const calories = useCountUp(plan.calories, 900);

  return (
    <div className="flex flex-1 animate-fade-rise flex-col justify-center py-10">
      <p className="text-micro uppercase text-muted-foreground">Your plan is ready</p>
      <h1 className="mt-1 text-title text-foreground">{plan.name}</h1>

      <div className="mt-6">
        <span className="font-display text-display-lg tabular-nums text-foreground">
          {calories.toLocaleString()}
        </span>
        <p className="mt-1 text-caption text-muted-foreground">kcal per day</p>
      </div>

      <Surface className="mt-6 space-y-4 p-5">
        <p className="text-micro uppercase text-muted-foreground">Daily targets</p>
        <MacroBar kind="protein" value={plan.protein} target={plan.protein} targetOnly />
        <MacroBar kind="carbs" value={plan.carbs} target={plan.carbs} targetOnly />
        <MacroBar kind="fat" value={plan.fat} target={plan.fat} targetOnly />
        <MacroBar kind="fiber" value={plan.fiber} target={plan.fiber} targetOnly />
        {plan.glp1 && (
          <p className="border-t border-border pt-3 text-caption text-secondary-text">
            On a GLP-1, protein comes first: hit the coral bar every day — it protects muscle when
            your appetite is low. Calories matter less than usual.
          </p>
        )}
      </Surface>

      {plan.projection && goalWeightKg !== undefined && (
        <p className="mt-5 flex items-center gap-2 text-label text-foreground">
          <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
          You'd reach {formatWeight(goalWeightKg, units, 0)} around {formatShortDate(plan.projection)}.
        </p>
      )}

      <p className="mt-3 text-caption text-muted-foreground">
        This is our best starting estimate — we fine-tune it weekly from your real data.
      </p>

      <PrimaryButton className="mt-8" onClick={onContinue}>
        Looks good
      </PrimaryButton>
    </div>
  );
}
