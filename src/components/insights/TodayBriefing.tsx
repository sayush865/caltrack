// Today's briefing — the full AI read for the day: the primary insight plus the
// supporting lines, each tagged by what it is (working / fix / pattern).

import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Lightbulb, RefreshCw, Sparkles, Target, TrendingUp } from "lucide-react";
import { Shimmer, Surface } from "@/components/system";
import { actionRoute } from "@/components/today/InsightCard";
import { useInsight } from "@/hooks/useInsight";
import type { Insight } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<string, { label: string; icon: typeof Target }> = {
  strength: { label: "Working", icon: CheckCircle2 },
  celebration: { label: "Working", icon: CheckCircle2 },
  improve: { label: "To fix", icon: Target },
  quick_win: { label: "Quick win", icon: Lightbulb },
  goal: { label: "Pattern", icon: TrendingUp },
  motivation: { label: "Note", icon: Sparkles },
};


function metaFor(category: string) {
  return CATEGORY_META[category] ?? CATEGORY_META.goal;
}

function Row({ item, primary }: { item: Insight; primary?: boolean }) {
  const navigate = useNavigate();
  const { label, icon: Icon } = metaFor(item.category);

  return (
    <div className={cn("flex gap-3 py-3", !primary && "border-t border-border")}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", primary ? "text-primary" : "text-muted-foreground")} />
      <div className="min-w-0 flex-1">
        <p className="text-micro uppercase text-muted-foreground">{label}</p>
        {item.headline && (
          <p className={cn("mt-0.5 font-semibold text-foreground", primary ? "text-body" : "text-label")}>
            {item.headline}
          </p>
        )}
        <p className="mt-0.5 text-caption text-secondary-text">{item.message}</p>
        {item.action && (
          <button
            type="button"
            onClick={() => navigate(actionRoute(item.action!.kind))}
            className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-full border border-border-strong px-3 text-label text-foreground transition-transform duration-instant active:scale-[0.95]"
          >
            {item.action.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function TodayBriefing() {
  const { primary, briefing, snapshot, loading, refresh } = useInsight();

  return (
    <Surface className="p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-micro uppercase text-muted-foreground">Today's briefing</h2>
        <button
          type="button"
          aria-label="Refresh briefing"
          disabled={loading}
          onClick={refresh}
          className="-my-2.5 -mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground transition-transform duration-instant hover:text-foreground active:scale-[0.92] disabled:opacity-60"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {loading ? (
        <div className="mt-2 space-y-3" aria-hidden="true">
          <Shimmer className="h-4 w-2/3 rounded-full" />
          <Shimmer className="h-3.5 w-full rounded-full" />
          <Shimmer className="h-3.5 w-5/6 rounded-full" />
          <Shimmer className="h-3.5 w-1/2 rounded-full" />
        </div>
      ) : primary ? (
        <div className="mt-1 animate-fade-in">
          {snapshot && (
            <p className="mb-1 text-caption tabular-nums text-muted-foreground">
              {snapshot.net} of {snapshot.goal} kcal net · {snapshot.protein}g protein · {snapshot.water} ml water
            </p>
          )}
          <Row item={primary} primary />
          {briefing.map((item, i) => (
            <Row key={`${item.message}-${i}`} item={item} />
          ))}
        </div>
      ) : (
        <p className="mt-1 text-body text-muted-foreground">
          Log a meal today and your briefing appears here.
        </p>
      )}
    </Surface>
  );
}
