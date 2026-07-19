// /you/milestones — trophy room. Every badge shown is EARNABLE from real data;
// newly detected badges are awarded on mount (rows in user_achievements) + confetti.

import { useEffect, useRef } from "react";
import { Lock, Trophy } from "lucide-react";

import { EmptyState, fireConfetti, PageHeader, Shimmer, Surface } from "@/components/system";
import { useMilestones } from "@/components/you/hooks";
import { BADGES } from "@/components/you/badges";

function formatEarnedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function MilestonesSkeleton() {
  return (
    <div className="space-y-3">
      <Shimmer className="h-24 w-full rounded-card" />
      <div className="grid grid-cols-2 gap-2">
        {BADGES.map((b) => (
          <Shimmer key={b.id} className="h-32 w-full rounded-card" />
        ))}
      </div>
    </div>
  );
}

export default function YouMilestones() {
  const milestonesQuery = useMilestones();
  const data = milestonesQuery.data;
  const celebrated = useRef(false);

  // Confetti exactly once when NEW badges were detected this mount.
  useEffect(() => {
    if (!celebrated.current && data && data.newlyEarned.length > 0) {
      celebrated.current = true;
      fireConfetti();
    }
  }, [data]);

  const earnedCount = data ? BADGES.filter((b) => b.id in data.earned).length : 0;

  return (
    <div className="min-h-screen bg-background pb-12">
      <PageHeader title="Milestones" back />

      <main className="mx-auto max-w-md space-y-3 px-4">
        {milestonesQuery.isLoading || !data ? (
          <MilestonesSkeleton />
        ) : (
          <>
            {/* ── Stats row ─────────────────────────────── */}
            <Surface className="grid grid-cols-3 divide-x divide-border p-4">
              <div className="px-2 text-center">
                <p className="font-display text-display-md tabular-nums text-foreground">{data.stats.daysLogged}</p>
                <p className="mt-0.5 text-caption text-muted-foreground">Days logged</p>
              </div>
              <div className="px-2 text-center">
                <p className="font-display text-display-md tabular-nums text-foreground">{data.stats.longestStreak}</p>
                <p className="mt-0.5 text-caption text-muted-foreground">Longest streak</p>
              </div>
              <div className="px-2 text-center">
                <p className="font-display text-display-md tabular-nums text-foreground">{data.stats.mealsLogged}</p>
                <p className="mt-0.5 text-caption text-muted-foreground">Meals logged</p>
              </div>
            </Surface>

            {/* ── Badge grid ────────────────────────────── */}
            <div className="flex items-baseline justify-between px-1 pt-2">
              <h2 className="text-heading text-foreground">Badges</h2>
              <span className="text-caption tabular-nums text-muted-foreground">
                {earnedCount} of {BADGES.length} earned
              </span>
            </div>

            {earnedCount === 0 && (
              <Surface>
                <EmptyState
                  icon={Trophy}
                  headline="Your trophy shelf is waiting"
                  copy="Every badge below is earnable from real logging — no participation trophies."
                />
              </Surface>
            )}

            <div className="grid grid-cols-2 gap-2">
              {BADGES.map((badge) => {
                const earnedAt = data.earned[badge.id];
                const isNew = data.newlyEarned.includes(badge.id);
                const Icon = badge.icon;
                return (
                  <Surface
                    key={badge.id}
                    className={`p-4 ${isNew ? "border-primary" : ""} ${earnedAt ? "" : "bg-background"}`}
                  >
                    <div
                      className={`grid h-12 w-12 place-items-center rounded-control ${
                        earnedAt ? badge.tileClass : "bg-muted"
                      }`}
                    >
                      {earnedAt ? (
                        <Icon className={`h-6 w-6 ${badge.iconClass}`} />
                      ) : (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <p className={`mt-2 text-label ${earnedAt ? "text-foreground" : "text-muted-foreground"}`}>
                      {badge.name}
                    </p>
                    <p className="mt-0.5 text-caption text-muted-foreground">
                      {earnedAt ? formatEarnedDate(earnedAt) : badge.criteria}
                    </p>
                  </Surface>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
