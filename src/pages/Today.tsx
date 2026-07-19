// Today tab (`/`) — the <60s daily loop (IA §1): greeting + streak, week strip,
// hero calorie ring card, favorites quick-log, today's meals, one AI insight.

import { RotateCcw } from "lucide-react";
import { StreakChip, Surface } from "@/components/system";
import { HeroCard } from "@/components/today/HeroCard";
import { InsightCard } from "@/components/today/InsightCard";
import { MealsToday } from "@/components/today/MealsToday";
import { QuickLogRow } from "@/components/today/QuickLogRow";
import { TodaySkeleton } from "@/components/today/TodaySkeleton";
import { WeekStrip } from "@/components/today/WeekStrip";
import { useDay } from "@/hooks/useDay";
import { useGoals } from "@/hooks/useGoals";
import { useProfile } from "@/hooks/useProfile";
import { dayKey } from "@/lib/dates";

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Today() {
  const now = new Date();
  const todayKey = dayKey(now);

  const dayQuery = useDay(todayKey);
  const { data: profile } = useProfile();
  const { data: goals } = useGoals();

  const name = profile?.username;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md space-y-4 px-4 pb-[96px] pt-6">
        {/* Greeting + streak (no PageHeader — custom top) */}
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-caption text-muted-foreground">
              {now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </p>
            <h1 className="truncate text-title text-foreground">
              {greetingFor(now)}
              {name ? `, ${name}` : ""}
            </h1>
          </div>
          <StreakChip className="shrink-0" />
        </header>

        <WeekStrip />

        {dayQuery.isLoading ? (
          <TodaySkeleton />
        ) : dayQuery.isError ? (
          <Surface className="p-5 text-center">
            <p className="text-body text-muted-foreground">
              Couldn&apos;t load today&apos;s log. Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => dayQuery.refetch()}
              className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-6 text-label text-primary-foreground transition-transform duration-instant active:scale-[0.92]"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </button>
          </Surface>
        ) : dayQuery.data ? (
          <>
            <HeroCard day={dayQuery.data} goals={goals ?? null} dayKey={todayKey} />
            <MealsToday day={dayQuery.data} dayKey={todayKey} />
          </>
        ) : null}

        <InsightCard />

        <QuickLogRow />
      </div>
    </div>
  );
}
