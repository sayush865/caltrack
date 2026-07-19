// 4–6s "building your plan" theater: named steps check off sequentially with a
// staggered fade, each showing the REAL computed value from lib/energy.ts.

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import type { Units } from "@/lib/units";
import { formatLongDate, formatPace, type Plan } from "./quiz";
import { cn } from "@/lib/utils";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function PlanBuildAnimation({
  plan,
  units,
  onDone,
}: {
  plan: Plan;
  units: Units;
  onDone: () => void;
}) {
  const lines = useMemo(() => {
    const out = [
      `Calculating your metabolic rate — ${plan.bmr.toLocaleString()} kcal`,
      `Applying your day-to-day activity — ${plan.tdee.toLocaleString()} kcal/day`,
      `Setting your protein target — ${plan.protein} g/day`,
    ];
    if (plan.goal !== "maintain") {
      out.push(`Calibrating your pace — ${formatPace(plan.paceKg, units)}/week`);
    }
    if (plan.projection) {
      out.push(`Projecting your timeline — around ${formatLongDate(plan.projection)}`);
    }
    out.push("Rounding out carbs, fat & fiber");
    return out;
  }, [plan, units]);

  const [completed, setCompleted] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const per = prefersReducedMotion() ? 120 : 900;
    const timers: number[] = [];
    lines.forEach((_, i) => {
      timers.push(window.setTimeout(() => setCompleted(i + 1), per * (i + 1)));
    });
    timers.push(window.setTimeout(() => doneRef.current(), per * lines.length + 650));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [lines]);

  return (
    <div className="flex flex-1 animate-fade-rise flex-col justify-center py-12">
      <h1 className="text-title text-foreground">Building your plan</h1>
      <div className="mt-8 space-y-4">
        {lines.map((line, i) => {
          const state = i < completed ? "done" : i === completed ? "active" : "pending";
          return (
            <div
              key={line}
              className={cn(
                "flex items-start gap-3 transition-opacity duration-standard",
                state === "pending" && "opacity-0",
                state === "active" && "opacity-70",
              )}
            >
              {state === "done" ? (
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success-soft">
                  <Check className="h-3.5 w-3.5 text-success" strokeWidth={3} />
                </span>
              ) : (
                <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
              )}
              <p className={cn("text-body", state === "done" ? "text-foreground" : "text-secondary-text")}>
                {line}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
