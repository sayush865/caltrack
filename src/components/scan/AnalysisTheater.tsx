// Staged analysis theater — the single loader for AI meal analysis (photo + text).
// Elapsed-time driven so the numeral always moves; capped at 95% until the
// result lands. Motion stays functional: one sweep, one arc, no decoration.

import { useEffect, useState } from "react";
import { Calculator, Check, Ruler, ScanLine, type LucideIcon } from "lucide-react";
import { Spinner } from "@/components/system";
import { cn } from "@/lib/utils";

interface Stage {
  id: string;
  label: string;
  icon: LucideIcon;
  duration: number; // ms this stage nominally takes
}

const PHOTO_STAGES: Stage[] = [
  { id: "read", label: "Reading the plate", icon: ScanLine, duration: 1800 },
  { id: "size", label: "Sizing portions", icon: Ruler, duration: 7500 },
  { id: "math", label: "Doing the math", icon: Calculator, duration: 4500 },
];

const TEXT_STAGES: Stage[] = [
  { id: "read", label: "Reading your description", icon: ScanLine, duration: 900 },
  { id: "size", label: "Sizing portions", icon: Ruler, duration: 3500 },
  { id: "math", label: "Doing the math", icon: Calculator, duration: 2000 },
];

export interface AnalysisTheaterProps {
  /** dataURL preview of the photo being analyzed (photo mode only). */
  photoPreview?: string | null;
  /** Short echo of what's being analyzed — the typed description in text mode. */
  caption?: string | null;
  kind?: "photo" | "text";
  onCancel: () => void;
}

/** Full-screen staged progress. Progress is elapsed-time-driven, capped at 95%. */
export function AnalysisTheater({
  photoPreview,
  caption,
  kind = "photo",
  onCancel,
}: AnalysisTheaterProps) {
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
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5">
        {photoPreview && (
          <div className="mx-auto mb-8 h-36 w-36 shrink-0 animate-fade-rise overflow-hidden rounded-card border border-border">
            <img src={photoPreview} alt="Meal being analyzed" className="h-full w-full object-cover" />
          </div>
        )}

        <div className="flex items-end justify-between gap-3">
          <p className="text-display-lg leading-none tabular-nums text-foreground" aria-live="polite">
            {progress}
            <span className="text-display-md text-muted-foreground">%</span>
          </p>
          <p className="pb-1 text-caption tabular-nums text-muted-foreground">{seconds}s</p>
        </div>

        {/* Hairline track */}
        <div className="mt-4 h-px w-full bg-border">
          <div
            className="h-px bg-foreground transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {caption && (
          <p className="mt-4 line-clamp-2 text-body text-secondary-text">&ldquo;{caption}&rdquo;</p>
        )}

        {/* Stage checklist — divided rows, no cards */}
        <ul className="mt-8 w-full divide-y divide-border border-y border-border">
          {stages.map((stage, i) => {
            const Icon = stage.icon;
            const done = i < stageIndex;
            const active = i === stageIndex;
            return (
              <li
                key={stage.id}
                className={cn(
                  "flex items-center gap-3 py-3.5 transition-opacity duration-standard",
                  !active && !done && "opacity-40",
                  done && "opacity-70",
                )}
              >
                {done ? (
                  <Check className="h-4 w-4 shrink-0 text-foreground" strokeWidth={2.5} />
                ) : active ? (
                  <Spinner size={16} className="shrink-0 text-foreground" label={stage.label} />
                ) : (
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    "text-body",
                    active ? "font-medium text-foreground" : "text-secondary-text",
                  )}
                >
                  {stage.label}
                  {active && <span className="text-muted-foreground">…</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mx-auto w-full max-w-md px-5 pb-8">
        <button
          type="button"
          onClick={onCancel}
          className="h-12 w-full min-w-[44px] rounded-control border border-border text-label text-secondary-text transition-transform duration-instant active:scale-[0.92]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
