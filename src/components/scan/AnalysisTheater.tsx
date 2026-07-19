// Staged analysis theater — ported from legacy AnalysisProgress.tsx and restyled
// to tokens: Space Grotesk percent numeral, step checklist, cancel affordance.

import { useEffect, useState } from "react";
import { Calculator, Check, Ruler, ScanLine, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stage {
  id: string;
  label: string;
  icon: LucideIcon;
  duration: number; // ms this stage nominally takes
}

const PHOTO_STAGES: Stage[] = [
  { id: "read", label: "Reading the plate…", icon: ScanLine, duration: 1800 },
  { id: "size", label: "Sizing portions…", icon: Ruler, duration: 7500 },
  { id: "math", label: "Doing the math…", icon: Calculator, duration: 4500 },
];

const TEXT_STAGES: Stage[] = [
  { id: "read", label: "Reading your description…", icon: ScanLine, duration: 900 },
  { id: "size", label: "Sizing portions…", icon: Ruler, duration: 3500 },
  { id: "math", label: "Doing the math…", icon: Calculator, duration: 2000 },
];

export interface AnalysisTheaterProps {
  /** dataURL preview of the photo being analyzed (photo mode only). */
  photoPreview?: string | null;
  kind?: "photo" | "text";
  onCancel: () => void;
}

/** Full-screen staged progress. Progress is elapsed-time-driven, capped at 95%. */
export function AnalysisTheater({ photoPreview, kind = "photo", onCancel }: AnalysisTheaterProps) {
  const stages = kind === "photo" ? PHOTO_STAGES : TEXT_STAGES;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => setElapsed(Date.now() - start), 100);
    return () => clearInterval(interval);
  }, []);

  const total = stages.reduce((sum, s) => sum + s.duration, 0);

  // Which stage are we in, and how far through the plan overall?
  let cumulative = 0;
  let stageIndex = stages.length - 1;
  for (let i = 0; i < stages.length; i++) {
    if (elapsed < cumulative + stages[i].duration) {
      stageIndex = i;
      break;
    }
    cumulative += stages[i].duration;
  }
  const progress = Math.min(95, Math.round((elapsed / total) * 100));
  const seconds = Math.floor(elapsed / 1000);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background pb-safe">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6">
        {photoPreview && (
          <div className="mb-8 h-40 w-40 overflow-hidden rounded-card border border-border shadow-card animate-fade-rise">
            <img src={photoPreview} alt="Meal being analyzed" className="h-full w-full object-cover" />
          </div>
        )}

        <p className="text-display-lg tabular-nums text-foreground" aria-live="polite">
          {progress}
          <span className="text-display-md text-muted-foreground">%</span>
        </p>
        <p className="mt-1 text-caption text-muted-foreground tabular-nums">{seconds}s</p>

        {/* Track */}
        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-calories-track">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-fast ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Stage checklist */}
        <ul className="mt-8 w-full space-y-2">
          {stages.map((stage, i) => {
            const Icon = stage.icon;
            const done = i < stageIndex;
            const active = i === stageIndex;
            return (
              <li
                key={stage.id}
                className={cn(
                  "flex items-center gap-3 rounded-control px-3 py-2.5 transition-colors duration-fast",
                  active && "bg-primary-soft",
                  done && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full",
                    active && "bg-primary text-primary-foreground",
                    done && "bg-primary-soft text-primary",
                    !active && !done && "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className={cn("h-4 w-4", active && "animate-pulse")} />}
                </span>
                <span className={cn("text-body", active ? "font-medium text-foreground" : "text-muted-foreground")}>
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mx-auto w-full max-w-md px-6 pb-8">
        <button
          type="button"
          onClick={onCancel}
          className="h-12 w-full min-w-[44px] rounded-control border border-border bg-card text-label text-secondary-text shadow-card transition-transform duration-instant active:scale-[0.92]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
