// Plateau detection + info card. Detection lives in usePlateau() so the PAGE
// decides whether to render the card (keeps the "never return null when empty"
// rule for data components intact — this is a conditional banner, gated above).
// Tone: amber-soft, explanatory, in the user's own numbers. Never "failure",
// never red, never "try harder".

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Waves } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Surface } from "@/components/system";
import { useGoals } from "@/hooks/useGoals";
import { useProfile } from "@/hooks/useProfile";
import { useWeights } from "@/hooks/useWeights";
import { useUpdateGoals } from "@/hooks/useMutations";
import { parseDayKey } from "@/lib/dates";
import { smoothWeights } from "@/lib/energy";
import { displayWeight, weightUnit, type Units } from "@/lib/units";
import { avgOverLogged, useInsightsHistory } from "./useInsightsHistory";

const DAY_MS = 86_400_000;
const PLATEAU_WINDOW_DAYS = 21;
const PLATEAU_THRESHOLD_KG = 0.15;

export interface PlateauInfo {
  /** Absolute trend movement over the window, kg. */
  deltaKg: number;
  /** Latest trend weight, kg. */
  trendKg: number;
  /** Average intake over logged days in the window; null if none. */
  avgKcal: number | null;
}

/**
 * Plateau: goal = lose, ≥21 days of weight-trend history with a recent
 * weigh-in, ≥14 logged food days in the window, and the smoothed trend moved
 * less than 0.15 kg over 3 weeks.
 */
export function usePlateau(): PlateauInfo | null {
  const goalsQuery = useGoals();
  const weightsQuery = useWeights();
  const historyQuery = useInsightsHistory();

  return useMemo(() => {
    const goals = goalsQuery.data;
    const history = historyQuery.data;
    const weights = weightsQuery.data;
    if (!goals || !history || !weights) return null;
    if (goals.goal_type !== "lose") return null;
    if (history.loggedDays < 14) return null;

    const smoothed = smoothWeights(weights);
    if (smoothed.length < 2) return null;

    const latest = smoothed[smoothed.length - 1];
    const latestTime = parseDayKey(latest.date).getTime();
    const now = Date.now();

    // Data must be current (a weigh-in within the last week)…
    if (now - latestTime > 7 * DAY_MS) return null;

    // …and span the full 3-week window: take the last trend point at or
    // before 21 days ago as the anchor.
    const cutoff = latestTime - PLATEAU_WINDOW_DAYS * DAY_MS;
    const anchors = smoothed.filter((p) => parseDayKey(p.date).getTime() <= cutoff);
    if (anchors.length === 0) return null;
    const anchor = anchors[anchors.length - 1];

    const delta = latest.trend - anchor.trend;
    if (Math.abs(delta) >= PLATEAU_THRESHOLD_KG) return null;

    return {
      deltaKg: Math.round(Math.abs(delta) * 100) / 100,
      trendKg: latest.trend,
      avgKcal: avgOverLogged(history.days, "calories"),
    };
  }, [goalsQuery.data, weightsQuery.data, historyQuery.data]);
}

export function PlateauCard({ info }: { info: PlateauInfo }) {
  const navigate = useNavigate();
  const profileQuery = useProfile();
  const updateGoals = useUpdateGoals();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const units: Units = profileQuery.data?.units_preference === "imperial" ? "imperial" : "metric";
  const unit = weightUnit(units);
  const trendDisplay = Math.round(displayWeight(info.trendKg, units) * 10) / 10;
  const deltaDisplay = Math.round(displayWeight(info.deltaKg, units) * 100) / 100;

  const startBreak = () => {
    updateGoals.mutate(
      { goal_type: "maintain" },
      {
        onSuccess: () => toast.success("Maintenance break started — keep logging, the deficit is paused."),
      },
    );
    setConfirmOpen(false);
  };

  return (
    <Surface className="space-y-3 border-warning/30 bg-warning-soft p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-card">
          <Waves className="h-5 w-5 text-warning" />
        </div>
        <h2 className="text-heading text-foreground">Looks like a plateau</h2>
      </div>

      <p className="text-body text-secondary-text">
        Your trend weight has moved just{" "}
        <span className="font-display font-medium tabular-nums">
          {deltaDisplay} {unit}
        </span>{" "}
        in the last 3 weeks — holding around{" "}
        <span className="font-display font-medium tabular-nums">
          {trendDisplay} {unit}
        </span>
        {info.avgKcal !== null && (
          <>
            {" "}
            on about{" "}
            <span className="font-display font-medium tabular-nums">{Math.round(info.avgKcal).toLocaleString()}</span>{" "}
            kcal a day
          </>
        )}
        . That's metabolic adaptation, not a discipline problem — your body has simply gotten more efficient. A short
        reset usually gets the trend moving again.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="flex h-11 items-center justify-center rounded-control bg-primary px-4 text-label text-primary-foreground transition-transform duration-instant active:scale-[0.92]"
        >
          Take a maintenance break
        </button>
        <button
          type="button"
          onClick={() => navigate("/you/goals")}
          className="flex h-11 items-center justify-center rounded-control border border-border bg-card px-4 text-label text-foreground transition-transform duration-instant active:scale-[0.92]"
        >
          Adjust target
        </button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-card border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-title text-foreground">Switch to maintenance?</AlertDialogTitle>
            <AlertDialogDescription className="text-body text-muted-foreground">
              Your goal changes to maintain for now — keep logging as usual, and the deficit pauses while your body
              resets. You can switch back to losing any time from Goals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-control">Not now</AlertDialogCancel>
            <AlertDialogAction
              onClick={startBreak}
              disabled={updateGoals.isPending}
              className="min-h-11 rounded-control bg-primary text-primary-foreground"
            >
              Start the break
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Surface>
  );
}
