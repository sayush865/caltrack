import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStreak } from "@/hooks/useStreak";
import { Shimmer } from "./Shimmer";

const MILESTONES = new Set([7, 30, 100]);

export interface StreakChipProps {
  className?: string;
}

/** Streak pill — never hidden. Zero state is activation copy, not absence. */
export function StreakChip({ className }: StreakChipProps) {
  const { data, isLoading } = useStreak();

  if (isLoading) {
    return <Shimmer className={cn("h-8 w-24 rounded-full", className)} />;
  }

  const current = data?.current ?? 0;
  const isMilestone = MILESTONES.has(current);

  return (
    <div
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border border-streak/25 bg-streak-soft px-3",
        className,
      )}
    >
      <Flame
        className={cn(
          "h-4 w-4",
          current > 0 ? "text-streak" : "text-muted-foreground",
          isMilestone && "animate-flame-pulse",
        )}
        // Milestone days (7/30/100) get the flame-pulse celebration (§6).
      />
      {current > 0 ? (
        <span className="font-display text-sm font-semibold tabular-nums text-foreground">
          {current}
        </span>
      ) : (
        <span className="text-label text-muted-foreground">Start a streak</span>
      )}
    </div>
  );
}
