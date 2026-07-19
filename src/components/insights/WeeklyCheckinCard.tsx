// Weekly check-in — computed fully CLIENT-side (schema is frozen; no
// weekly_checkins table at runtime). Three states:
//   (a) <7 logged days   → unlock progress meter + what it will contain
//   (b) ready            → the week in numbers (+ adaptive proposal at 14+ days)
//   (c) missing weigh-ins→ ask for a weigh-in instead of guessing

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BarChart3, Beef, Scale, Sparkles, Target } from "lucide-react";

import WeightSheet from "@/components/WeightSheet";
import { Shimmer, Surface } from "@/components/system";
import { useGoals } from "@/hooks/useGoals";
import { useProfile } from "@/hooks/useProfile";
import { useWeights } from "@/hooks/useWeights";
import { useUpdateGoals } from "@/hooks/useMutations";
import { dayKey, localDayStart, parseDayKey } from "@/lib/dates";
import { macroTargets, smoothWeights, tdee, weeklyExpenditure, type EnergyInput } from "@/lib/energy";
import { avgOverLogged, useInsightsHistory } from "./useInsightsHistory";

const fmt = (n: number) => Math.round(n).toLocaleString();

/** Local Monday of the current week — used to remember "Keep current" per week. */
function currentWeekKey(): string {
  const today = localDayStart();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return dayKey(monday);
}

function loggedFraming(n: number): string {
  if (n >= 7) return "every single day — take a bow";
  if (n >= 5) return "solid";
  if (n >= 3) return "a real base to build on";
  if (n >= 1) return "a start — every log counts";
  return "a fresh start this week";
}

const ACTIVITY_LEVELS: ReadonlyArray<EnergyInput["activityLevel"]> = [
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
  "extra_active",
];

export function WeeklyCheckinCard() {
  const navigate = useNavigate();
  const historyQuery = useInsightsHistory();
  const goalsQuery = useGoals();
  const profileQuery = useProfile();
  const weightsQuery = useWeights();
  const updateGoals = useUpdateGoals();

  const [weightSheetOpen, setWeightSheetOpen] = useState(false);
  const weekKey = currentWeekKey();
  const uid = profileQuery.data?.id ?? "anon";
  const keepKey = `ct-checkin-keep-${uid}-${weekKey}`;
  // Read on every render (not a useState initializer) — uid arrives async.
  const [dismissed, setDismissed] = useState(false);
  const keptCurrent =
    dismissed ||
    (() => {
      try {
        return localStorage.getItem(keepKey) === "1";
      } catch {
        return false;
      }
    })();

  const isLoading =
    historyQuery.isLoading || goalsQuery.isLoading || profileQuery.isLoading || weightsQuery.isLoading;

  const derived = useMemo(() => {
    const history = historyQuery.data;
    const goals = goalsQuery.data;
    const profile = profileQuery.data;
    const weights = weightsQuery.data ?? [];
    if (!history) return null;

    const calorieTarget = goals?.daily_calories ?? 2000;
    const proteinTarget = goals?.daily_protein ?? 120;

    const last7 = history.days.slice(-7);
    const logged7 = last7.filter((d) => d.logged);
    const avgKcal = avgOverLogged(last7, "calories");
    const proteinHitDays = logged7.filter((d) => d.protein >= 0.9 * proteinTarget).length;

    // ── Adaptive expenditure (MacroFactor pattern) over the last 14 days ──
    const last14 = history.days.slice(-14);
    const intake = last14.filter((d) => d.logged).map((d) => d.calories);
    const smoothed = smoothWeights(weights);
    const windowStart = parseDayKey(history.days[Math.max(0, history.days.length - 14)]?.day ?? dayKey(new Date()));
    const trendInWindow = smoothed.filter((p) => parseDayKey(p.date).getTime() >= windowStart.getTime());
    const trendSpanDays =
      trendInWindow.length >= 2
        ? (parseDayKey(trendInWindow[trendInWindow.length - 1].date).getTime() -
            parseDayKey(trendInWindow[0].date).getTime()) /
          86_400_000
        : 0;
    const hasTrend = trendInWindow.length >= 2 && trendSpanDays >= 7;

    let adaptive: number | null = null;
    if (history.loggedDays >= 14 && hasTrend) {
      const trendDelta = trendInWindow[trendInWindow.length - 1].trend - trendInWindow[0].trend;
      adaptive = weeklyExpenditure(intake, trendDelta);
    }

    // Our current model estimate of TDEE, from profile + latest weight.
    const weightKg = goals?.current_weight ?? (smoothed.length > 0 ? smoothed[smoothed.length - 1].trend : null);
    const gender = profile?.gender === "female" || profile?.gender === "male" ? profile.gender : null;
    const activity = ACTIVITY_LEVELS.find((a) => a === profile?.activity_level) ?? null;
    const estimate =
      gender && activity && profile?.age && profile?.height && weightKg
        ? tdee({ gender, age: profile.age, heightCm: profile.height, weightKg, activityLevel: activity })
        : null;

    let proposal: { burn: number; diff: number; newTarget: number } | null = null;
    if (adaptive !== null && estimate !== null && goals && weightKg) {
      const floor = gender === "female" ? 1200 : 1500;
      const newTarget = Math.max(floor, Math.round((adaptive - (estimate - goals.daily_calories)) / 10) * 10);
      if (Math.abs(newTarget - goals.daily_calories) >= 50) {
        proposal = { burn: adaptive, diff: adaptive - estimate, newTarget };
      }
    }

    return {
      loggedDays21: history.loggedDays,
      daysLogged7: logged7.length,
      avgKcal,
      calorieTarget,
      proteinHitDays,
      loggedCount7: logged7.length,
      adaptive,
      proposal,
      weightKg,
      goalType: goals?.goal_type ?? "maintain",
      missingWeighIns: history.loggedDays >= 7 && !hasTrend,
    };
  }, [historyQuery.data, goalsQuery.data, profileQuery.data, weightsQuery.data]);

  if (isLoading || !derived) {
    return (
      <Surface className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <Shimmer className="h-10 w-10 rounded-control" />
          <Shimmer className="h-5 w-36 rounded-control" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Shimmer className="h-16 rounded-control" />
          <Shimmer className="h-16 rounded-control" />
          <Shimmer className="h-16 rounded-control" />
        </div>
        <Shimmer className="h-12 w-full rounded-control" />
      </Surface>
    );
  }

  const header = (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-primary-soft">
        <Sparkles className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <h2 className="text-heading text-foreground">Weekly check-in</h2>
        <p className="text-caption text-muted-foreground">Last 7 days</p>
      </div>
    </div>
  );

  // ── State (a): unlock meter ─────────────────────────────────────────────
  if (derived.loggedDays21 < 7) {
    const n = derived.loggedDays21;
    const pct = Math.min(100, (n / 7) * 100);
    return (
      <Surface className="space-y-4 p-5">
        {header}
        <div className="space-y-2">
          <p className="text-body text-secondary-text">
            Your first check-in unlocks after 7 days of logging{" "}
            <span className="font-display font-medium tabular-nums text-foreground">({n}/7)</span>
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-standard"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <ul className="space-y-2">
          <li className="flex items-center gap-2.5 text-label text-muted-foreground">
            <BarChart3 className="h-4 w-4 shrink-0 text-primary" />
            Your average calories vs your target
          </li>
          <li className="flex items-center gap-2.5 text-label text-muted-foreground">
            <Beef className="h-4 w-4 shrink-0 text-protein" />
            How often you hit your protein target
          </li>
          <li className="flex items-center gap-2.5 text-label text-muted-foreground">
            <Target className="h-4 w-4 shrink-0 text-fiber" />
            A calorie target tuned from your real data
          </li>
        </ul>
      </Surface>
    );
  }

  // ── State (b)/(c): the week in numbers ──────────────────────────────────
  const avgDiff = derived.avgKcal === null ? null : derived.avgKcal - derived.calorieTarget;
  const avgCaption = (() => {
    if (derived.avgKcal === null || avgDiff === null) return "no meals logged this week yet";
    if (Math.abs(avgDiff) <= derived.calorieTarget * 0.05) return `right around your ${fmt(derived.calorieTarget)} target`;
    if (avgDiff < 0) return `${fmt(-avgDiff)} under your ${fmt(derived.calorieTarget)} target`;
    return `${fmt(avgDiff)} over your ${fmt(derived.calorieTarget)} target — worth a look, not a worry`;
  })();

  const acceptProposal = () => {
    const p = derived.proposal;
    if (!p || !derived.weightKg) return;
    const macros = macroTargets(p.newTarget, derived.weightKg, derived.goalType);
    updateGoals.mutate(
      {
        daily_calories: p.newTarget,
        daily_protein: macros.protein,
        daily_carbs: macros.carbs,
        daily_fat: macros.fat,
        daily_fiber: macros.fiber,
      },
      { onSuccess: () => toast.success(`Daily target updated to ${fmt(p.newTarget)} kcal`) },
    );
  };

  const keepCurrent = () => {
    try {
      localStorage.setItem(keepKey, "1");
    } catch {
      /* storage unavailable — session-only dismissal */
    }
    setDismissed(true);
  };

  const diffText = (diff: number) => {
    if (Math.abs(diff) < 25) return "right in line with our estimate";
    return `about ${fmt(Math.abs(diff))} ${diff > 0 ? "above" : "below"} our estimate`;
  };

  return (
    <Surface className="space-y-4 p-5">
      {header}

      <div>
        <p className="text-micro uppercase text-muted-foreground">The week in numbers</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-control bg-muted/60 px-1 py-3">
            <p className="text-display-md tabular-nums text-foreground">
              {derived.daysLogged7}
              <span className="text-label text-muted-foreground">/7</span>
            </p>
            <p className="mt-0.5 text-caption text-muted-foreground">days logged</p>
          </div>
          <div className="rounded-control bg-muted/60 px-1 py-3">
            <p className="text-display-md tabular-nums text-foreground">
              {derived.avgKcal === null ? "—" : fmt(derived.avgKcal)}
            </p>
            <p className="mt-0.5 text-caption text-muted-foreground">avg kcal</p>
          </div>
          <div className="rounded-control bg-muted/60 px-1 py-3">
            <p className="text-display-md tabular-nums text-foreground">
              {derived.proteinHitDays}
              <span className="text-label text-muted-foreground">/{derived.loggedCount7}</span>
            </p>
            <p className="mt-0.5 text-caption text-muted-foreground">protein days</p>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-label text-secondary-text">
            {derived.daysLogged7} of 7 days logged — {loggedFraming(derived.daysLogged7)}.
          </p>
          <p className="text-caption text-muted-foreground">Average intake {avgCaption}.</p>
          <p className="text-caption text-muted-foreground">
            {derived.proteinHitDays} of {derived.loggedCount7} logged days reached 90%+ of your protein target.
          </p>
        </div>
      </div>

      {/* Adaptive proposal / on-track note / weigh-in ask */}
      {derived.proposal && !keptCurrent ? (
        <div className="space-y-3 rounded-control bg-primary-soft p-4">
          <p className="text-body text-foreground">
            Your data suggests you burn ~
            <span className="font-display font-medium tabular-nums">{fmt(derived.proposal.burn)} kcal</span> a day —{" "}
            {diffText(derived.proposal.diff)}. Update your daily target to{" "}
            <span className="font-display font-medium tabular-nums">{fmt(derived.proposal.newTarget)}</span>?
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={acceptProposal}
              disabled={updateGoals.isPending}
              className="flex h-11 items-center justify-center rounded-control bg-primary px-4 text-label text-primary-foreground transition-transform duration-instant active:scale-[0.92] disabled:opacity-50"
            >
              Update target
            </button>
            <button
              type="button"
              onClick={keepCurrent}
              className="flex h-11 items-center justify-center rounded-control border border-border bg-card px-4 text-label text-foreground transition-transform duration-instant active:scale-[0.92]"
            >
              Keep current
            </button>
            <button
              type="button"
              onClick={() => navigate("/you/goals")}
              className="flex h-11 items-center justify-center rounded-control px-3 text-label text-primary transition-transform duration-instant active:scale-[0.92]"
            >
              Adjust manually
            </button>
          </div>
        </div>
      ) : derived.proposal && keptCurrent ? (
        <p className="rounded-control bg-muted/60 p-3 text-caption text-muted-foreground">
          Keeping your current target — we'll look at the data again next week.
        </p>
      ) : derived.missingWeighIns ? (
        <div className="flex items-center gap-3 rounded-control bg-water-soft p-4">
          <Scale className="h-5 w-5 shrink-0 text-water" />
          <p className="flex-1 text-label text-secondary-text">
            Add a weigh-in and your check-in can tune your target from real data instead of guessing.
          </p>
          <button
            type="button"
            onClick={() => setWeightSheetOpen(true)}
            className="flex h-11 shrink-0 items-center justify-center rounded-control bg-primary px-4 text-label text-primary-foreground transition-transform duration-instant active:scale-[0.92]"
          >
            Log weight
          </button>
        </div>
      ) : derived.adaptive !== null ? (
        <p className="rounded-control bg-success-soft p-3 text-caption text-success">
          Your target still matches your data — no change needed this week.
        </p>
      ) : null}

      <WeightSheet open={weightSheetOpen} onOpenChange={setWeightSheetOpen} />
    </Surface>
  );
}
