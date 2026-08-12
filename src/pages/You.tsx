// You tab — profile hub: plan summary, weight quick-log, milestones preview, settings.
// Everything orphaned in the old app gets one front door here (IA §1).

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, LogOut, Salad, Settings, Target, Trophy } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Shimmer, Surface } from "@/components/system";
import WeightSheet from "@/components/WeightSheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";
import { useGoals } from "@/hooks/useGoals";
import { useWeights } from "@/hooks/useWeights";
import { projectionDate, smoothWeights } from "@/lib/energy";
import { formatWeight, weightUnit, type Units } from "@/lib/units";
import { useAchievements } from "@/components/you/hooks";
import { badgeById, BADGES } from "@/components/you/badges";
import { GOAL_TYPE_LABELS, getPace, PACE_LABELS } from "@/components/you/prefs";
import { prefsSummary } from "@/components/you/mealPrefs";

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Tiny inline sparkline of the smoothed trend (hand-rolled SVG — no chart lib needed). */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="h-8 w-20" aria-hidden="true" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 76 + 2},${30 - ((v - min) / span) * 28}`)
    .join(" ");
  return (
    <svg viewBox="0 0 80 32" className="h-8 w-20" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function YouSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 py-2">
        <Shimmer className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Shimmer className="h-5 w-32" />
          <Shimmer className="h-3 w-24" />
        </div>
      </div>
      <Shimmer className="h-36 w-full rounded-card" />
      <Shimmer className="h-32 w-full rounded-card" />
      <Shimmer className="h-24 w-full rounded-card" />
      <Shimmer className="h-28 w-full rounded-card" />
    </div>
  );
}

export default function You() {
  const navigate = useNavigate();
  const { session } = useSession();
  const profileQuery = useProfile();
  const goalsQuery = useGoals();
  const weightsQuery = useWeights();
  const achievementsQuery = useAchievements();
  const [weightOpen, setWeightOpen] = useState(false);

  const profile = profileQuery.data;
  const goals = goalsQuery.data;
  const units: Units = profile?.units_preference === "imperial" ? "imperial" : "metric";
  const pace = getPace();

  const displayName = profile?.username || session?.user.email?.split("@")[0] || "You";
  const initial = displayName.charAt(0).toUpperCase();
  const memberSince = useMemo(() => {
    const created = session?.user.created_at;
    if (!created) return null;
    return new Date(created).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }, [session?.user.created_at]);

  const trend = useMemo(() => smoothWeights(weightsQuery.data ?? []), [weightsQuery.data]);
  const currentTrendKg = trend.length > 0 ? trend[trend.length - 1].trend : (goals?.current_weight ?? null);
  const weights = weightsQuery.data ?? [];
  const lastTwo = weights.slice(-2);

  const deltaCaption = useMemo(() => {
    if (lastTwo.length < 2) return "Log weigh-ins to build your trend";
    const delta = round1(lastTwo[1].weight - lastTwo[0].weight);
    if (delta === 0) return "No change since last weigh-in";
    const shown = formatWeight(Math.abs(delta), units);
    return `${delta > 0 ? "+" : "−"}${shown} since last weigh-in`;
  }, [lastTwo, units]);

  const projection =
    goals && goals.goal_type !== "maintain" && currentTrendKg != null && goals.goal_weight != null
      ? projectionDate(currentTrendKg, goals.goal_weight, pace)
      : null;

  const earnedRows = achievementsQuery.data ?? [];
  const earnedBadges = earnedRows
    .map((row) => badgeById(row.achievement_id))
    .filter((b): b is NonNullable<typeof b> => !!b)
    .slice(0, 3);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast("Signed out. See you soon.");
    navigate("/welcome", { replace: true });
  };

  const loading = profileQuery.isLoading || goalsQuery.isLoading;

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader title="You" />

      <main className="mx-auto max-w-md space-y-3 px-4">
        {loading ? (
          <YouSkeleton />
        ) : (
          <>
            {/* ── Profile header ─────────────────────────── */}
            <div className="flex items-center gap-4 py-2">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary-soft">
                <span className="font-display text-display-md text-primary">{initial}</span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-title text-foreground">{displayName}</p>
                {memberSince && (
                  <p className="text-caption text-muted-foreground">Member since {memberSince}</p>
                )}
              </div>
            </div>

            {/* ── Plan summary ───────────────────────────── */}
            <Surface
              role="button"
              tabIndex={0}
              onClick={() => navigate("/you/goals")}
              onKeyDown={(e) => e.key === "Enter" && navigate("/you/goals")}
              className="cursor-pointer p-5 transition-transform duration-instant active:scale-[0.97]"
            >
              <div className="flex items-center justify-between">
                <p className="text-micro uppercase text-muted-foreground">
                  {goals ? GOAL_TYPE_LABELS[goals.goal_type] : "Your plan"}
                </p>
                <Target className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-1 font-display text-display-md tabular-nums text-foreground">
                {goals ? goals.daily_calories.toLocaleString() : "—"}
                <span className="ml-1.5 align-baseline font-sans text-caption font-medium text-muted-foreground">
                  kcal / day
                </span>
              </p>
              <p className="mt-1 text-caption tabular-nums text-secondary-text">
                {goals
                  ? `${goals.daily_protein}g protein · ${goals.daily_carbs}g carbs · ${goals.daily_fat}g fat`
                  : "Set your daily targets"}
              </p>
              {goals && goals.goal_type !== "maintain" && (
                <p className="mt-0.5 text-caption text-muted-foreground">
                  {PACE_LABELS[pace]}
                  {projection &&
                    ` · on track for ${projection.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                </p>
              )}
              <p className="mt-2 text-caption font-medium text-primary">Tap to adjust</p>
            </Surface>

            {/* ── Weight quick log ───────────────────────── */}
            <Surface
              role="button"
              tabIndex={0}
              onClick={() => navigate("/you/weight")}
              onKeyDown={(e) => e.key === "Enter" && navigate("/you/weight")}
              className="cursor-pointer p-5 transition-transform duration-instant active:scale-[0.97]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-micro uppercase text-muted-foreground">Weight</p>
                  <p className="mt-1 font-display text-display-md tabular-nums text-foreground">
                    {currentTrendKg != null ? formatWeight(currentTrendKg, units) : `— ${weightUnit(units)}`}
                  </p>
                  <p className="mt-1 text-caption text-muted-foreground">{deltaCaption}</p>
                </div>
                <Sparkline values={trend.slice(-14).map((p) => p.trend)} />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setWeightOpen(true);
                }}
                className="mt-4 flex h-11 w-full items-center justify-center rounded-control bg-primary-soft text-label text-primary transition-transform duration-instant active:scale-[0.92]"
              >
                Log weight
              </button>
            </Surface>

            {/* ── Milestones preview ─────────────────────── */}
            <Surface
              role="button"
              tabIndex={0}
              onClick={() => navigate("/you/milestones")}
              onKeyDown={(e) => e.key === "Enter" && navigate("/you/milestones")}
              className="cursor-pointer p-5 transition-transform duration-instant active:scale-[0.97]"
            >
              <div className="flex items-center justify-between">
                <p className="text-micro uppercase text-muted-foreground">Milestones</p>
                <span className="text-caption tabular-nums text-muted-foreground">
                  {earnedRows.filter((r) => badgeById(r.achievement_id)).length} of {BADGES.length}
                </span>
              </div>
              {earnedBadges.length > 0 ? (
                <div className="mt-3 flex items-center gap-3">
                  {earnedBadges.map((badge) => (
                    <div key={badge.id} className="flex flex-col items-center gap-1">
                      <div className={`grid h-12 w-12 place-items-center rounded-control ${badge.tileClass}`}>
                        <badge.icon className={`h-5 w-5 ${badge.iconClass}`} />
                      </div>
                      <span className="max-w-16 truncate text-micro uppercase text-muted-foreground">
                        {badge.name}
                      </span>
                    </div>
                  ))}
                  <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-control bg-muted">
                    <Trophy className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-body text-muted-foreground">Log a meal to earn your first badge</p>
                  <ChevronRight className="ml-auto h-5 w-5 shrink-0 text-muted-foreground" />
                </div>
              )}
            </Surface>

            {/* ── Settings list ──────────────────────────── */}
            <Surface className="overflow-hidden">
              <button
                type="button"
                onClick={() => navigate("/you/preferences")}
                className="flex min-h-[56px] w-full items-center gap-3 px-5 text-left transition-transform duration-instant active:scale-[0.97]"
              >
                <Salad className="h-5 w-5 shrink-0 text-secondary-text" />
                <span className="min-w-0 flex-1">
                  <span className="block text-body text-foreground">Meal preferences</span>
                  <span className="block truncate text-caption text-muted-foreground">
                    {prefsSummary(profile ?? {})}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </button>
              <div className="mx-5 h-px bg-border" />
              <button
                type="button"
                onClick={() => navigate("/you/settings")}
                className="flex min-h-[56px] w-full items-center gap-3 px-5 text-left transition-transform duration-instant active:scale-[0.97]"
              >
                <Settings className="h-5 w-5 text-secondary-text" />
                <span className="flex-1 text-body text-foreground">Settings</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
              <div className="mx-5 h-px bg-border" />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="flex min-h-[56px] w-full items-center gap-3 px-5 text-left transition-transform duration-instant active:scale-[0.97]"
                  >
                    <LogOut className="h-5 w-5 text-secondary-text" />
                    <span className="flex-1 text-body text-foreground">Sign out</span>
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-card border-border bg-card">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-title text-foreground">Sign out?</AlertDialogTitle>
                    <AlertDialogDescription className="text-body text-muted-foreground">
                      Your data stays safe — sign back in anytime.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-control">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={signOut} className="rounded-control">
                      Sign out
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </Surface>
          </>
        )}
      </main>

      <WeightSheet open={weightOpen} onOpenChange={setWeightOpen} />
    </div>
  );
}
