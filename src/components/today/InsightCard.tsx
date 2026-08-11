// "One big thing" — the primary daily AI insight: headline + one concrete next
// step, with an optional action chip that deep-links to the screen that helps.
// Never hidden: loading shows shimmer lines, failures fall back to a quiet line.

import { useNavigate } from "react-router-dom";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import { Shimmer, Surface } from "@/components/system";
import { useInsight } from "@/hooks/useInsight";
import { dayKey } from "@/lib/dates";
import type { InsightActionKind } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface InsightCardProps {
  className?: string;
}

const FALLBACK = "Keep logging your meals — your daily read will appear here.";

export function actionRoute(kind: InsightActionKind): string {
  const date = dayKey(new Date());
  switch (kind) {
    case "exercise":
      return `/exercise?date=${date}`;
    case "describe":
      return `/describe?date=${date}`;
    case "scan":
      return `/scan?date=${date}`;
    case "water":
      return `/log?date=${date}#water`;
    case "weight":
      return "/you/weight";
    default:
      return "/";
  }
}

export function InsightCard({ className }: InsightCardProps) {
  const { primary, loading, refresh } = useInsight();
  const navigate = useNavigate();

  return (
    <Surface className={cn("p-4", className)}>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-primary-soft">
          <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.75} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-micro uppercase text-muted-foreground">One big thing</span>
            <button
              type="button"
              aria-label="Refresh insight"
              disabled={loading}
              onClick={refresh}
              className="-my-2.5 -mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground transition-transform duration-instant hover:text-foreground active:scale-[0.92] disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>

          {loading ? (
            <div className="mt-1.5 space-y-1.5">
              <Shimmer className="h-4 w-3/4 rounded-full" />
              <Shimmer className="h-3.5 w-full rounded-full" />
              <Shimmer className="h-3.5 w-2/3 rounded-full" />
            </div>
          ) : (
            <div key={primary?.message ?? "empty"} className="animate-fade-in">
              {primary?.headline && (
                <p className="mt-0.5 text-label font-semibold text-foreground">{primary.headline}</p>
              )}
              <p
                className={cn(
                  primary?.headline ? "mt-0.5 text-caption" : "mt-1 text-body",
                  primary ? "text-secondary-text" : "text-muted-foreground",
                )}
              >
                {primary?.message ?? FALLBACK}
              </p>

              {primary?.action && (
                <button
                  type="button"
                  onClick={() => navigate(actionRoute(primary.action!.kind))}
                  className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-border-strong px-3 text-label text-foreground transition-transform duration-instant active:scale-[0.95]"
                >
                  {primary.action.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Surface>
  );
}
