// Aggregate AI read — week-over-week findings across the rolling 28-day window.
// The daily briefing answers "what now"; this card answers "what's the pattern".
// Data comes from the same generate-insights call (aggregate pass), so no extra
// request and no extra cache.

import { AlertTriangle, CheckCircle2, FlaskConical, RefreshCw, TrendingUp } from "lucide-react";
import { Shimmer, Surface } from "@/components/system";
import { useInsight } from "@/hooks/useInsight";
import type { InsightTrend } from "@/lib/types";
import { cn } from "@/lib/utils";

const TAG_META: Record<string, { label: string; icon: typeof TrendingUp }> = {
  win: { label: "Working", icon: CheckCircle2 },
  risk: { label: "Watch", icon: AlertTriangle },
  pattern: { label: "Pattern", icon: TrendingUp },
  experiment: { label: "Try this week", icon: FlaskConical },
};

function Trend({ item, first }: { item: InsightTrend; first: boolean }) {
  const meta = TAG_META[item.tag] ?? TAG_META.pattern;
  const Icon = meta.icon;

  return (
    <div className={cn("py-3", !first && "border-t border-border")}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-micro uppercase text-muted-foreground">{meta.label}</p>
            {item.metric && (
              <p className="shrink-0 text-micro tabular-nums text-muted-foreground">{item.metric}</p>
            )}
          </div>
          {item.title && <p className="mt-0.5 text-label font-semibold text-foreground">{item.title}</p>}
          <p className="mt-0.5 text-caption text-secondary-text">{item.message}</p>
        </div>
      </div>
    </div>
  );
}

export function TrendsCard() {
  const { trends, verdict, loading, refresh } = useInsight();

  return (
    <Surface className="p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-micro uppercase text-muted-foreground">The bigger picture · last 4 weeks</h2>
        <button
          type="button"
          aria-label="Refresh trends"
          disabled={loading}
          onClick={refresh}
          className="-my-2.5 -mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground transition-transform duration-instant hover:text-foreground active:scale-[0.92] disabled:opacity-60"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {loading ? (
        <div className="mt-2 space-y-3" aria-hidden="true">
          <Shimmer className="h-4 w-5/6 rounded-full" />
          <Shimmer className="h-3.5 w-full rounded-full" />
          <Shimmer className="h-3.5 w-2/3 rounded-full" />
          <Shimmer className="h-3.5 w-4/5 rounded-full" />
        </div>
      ) : trends.length > 0 ? (
        <div className="mt-1 animate-fade-in">
          {verdict && <p className="mb-1 text-body text-foreground">{verdict}</p>}
          {trends.map((item, i) => (
            <Trend key={`${item.title}-${i}`} item={item} first={i === 0 && !verdict} />
          ))}
        </div>
      ) : (
        <p className="mt-1 text-body text-muted-foreground">
          A few more logged days and the week-over-week read appears here.
        </p>
      )}
    </Surface>
  );
}
