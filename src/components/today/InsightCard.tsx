// "One big thing" — first daily AI insight. Never hidden: loading shows shimmer
// lines, errors/empty fall back to a quiet activation line (useInsight never throws).

import { RefreshCw, Sparkles } from "lucide-react";
import { Shimmer, Surface } from "@/components/system";
import { useInsight } from "@/hooks/useInsight";
import { cn } from "@/lib/utils";

export interface InsightCardProps {
  className?: string;
}

const FALLBACK = "Keep logging your meals — your daily insight will appear here.";

export function InsightCard({ className }: InsightCardProps) {
  const { insight, loading, refresh } = useInsight();
  const first = insight?.[0] ?? null;

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
              <Shimmer className="h-3.5 w-full rounded-full" />
              <Shimmer className="h-3.5 w-2/3 rounded-full" />
            </div>
          ) : (
            <p className={cn("text-body", first ? "text-foreground" : "text-muted-foreground")}>
              {first?.message ?? FALLBACK}
            </p>
          )}
        </div>
      </div>
    </Surface>
  );
}
