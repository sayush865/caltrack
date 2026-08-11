// Insights tab (/insights) — IA_FLOWS Flow 5: weekly check-in on top, then
// 7-day calorie bars, macro averages, weight trend, best-day + exercise stats.
// Plateau card renders only when usePlateau() detects one (gated here, not by
// a null-returning component). Every card ships its own shimmer skeleton.

import { PageHeader } from "@/components/system";
import {
  MacroAveragesCard,
  PatternsCard,
  PlateauCard,
  StatsRow,
  usePlateau,
  WeeklyCalorieChart,
  TodayBriefing,
  WeeklyCheckinCard,
  WeightTrendCard,
} from "@/components/insights";

export default function Insights() {
  const plateau = usePlateau();

  return (
    <div className="min-h-screen bg-background pb-28">
      <PageHeader title="Insights" />
      <main className="mx-auto max-w-md space-y-3 px-4 pt-1">
        <TodayBriefing />
        <WeeklyCheckinCard />
        {plateau && <PlateauCard info={plateau} />}
        <WeeklyCalorieChart />
        <MacroAveragesCard />
        <PatternsCard />
        <WeightTrendCard />
        <StatsRow />
      </main>
    </div>
  );
}
