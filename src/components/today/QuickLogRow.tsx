// Horizontal favorites chip row: 2-tap relogging at 1x (logFavorite toasts on
// success and bumps use_count). Never returns null — zero-favorites shows a hint.

import { Zap } from "lucide-react";
import { Shimmer } from "@/components/system";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";

export interface QuickLogRowProps {
  className?: string;
}

export function QuickLogRow({ className }: QuickLogRowProps) {
  const { favorites, isLoading, logFavorite, isLogging } = useFavorites();

  return (
    <section className={className}>
      <h2 className="px-1 text-micro uppercase text-muted-foreground">Quick log</h2>

      {isLoading ? (
        <div className="mt-2 flex gap-2 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <Shimmer key={i} className="h-11 w-32 shrink-0 rounded-full" />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <p className="mt-2 px-1 text-caption text-muted-foreground">
          Save a meal as a favorite and it will appear here for two-tap logging.
        </p>
      ) : (
        <div className="scrollbar-hide -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
          {favorites.map((fav) => (
            <button
              key={fav.id}
              type="button"
              disabled={isLogging}
              onClick={() => logFavorite(fav, 1)}
              className={cn(
                "flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 shadow-card",
                "transition-transform duration-instant active:scale-[0.92] disabled:opacity-60",
              )}
            >
              <Zap className="h-4 w-4 text-primary" strokeWidth={1.75} />
              <span className="max-w-[160px] truncate text-label text-foreground">{fav.name}</span>
              <span className="text-caption text-muted-foreground tabular-nums">
                {Math.round(fav.totals.calories)} kcal
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
