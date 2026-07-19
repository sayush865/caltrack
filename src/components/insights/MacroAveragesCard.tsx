// 7-day macro averages vs targets (MacroBars) + macro donut in identity hues.
// Donut labels sit OUTSIDE the slices in --text-secondary (no white fills).

import { useMemo } from "react";
import { Pie, PieChart } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { EmptyState, MacroBar, Shimmer, Surface } from "@/components/system";
import { useGoals } from "@/hooks/useGoals";
import { avgOverLogged, useInsightsHistory } from "./useInsightsHistory";

const RADIAN = Math.PI / 180;

interface PieLabelRenderProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  percent?: number;
  name?: string;
}

function renderPieLabel(props: PieLabelRenderProps) {
  const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, percent = 0, name = "" } = props;
  const r = outerRadius + 12;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
      fill="hsl(var(--text-secondary))"
    >
      {`${name} ${Math.round(percent * 100)}%`}
    </text>
  );
}

export function MacroAveragesCard() {
  const historyQuery = useInsightsHistory();
  const goalsQuery = useGoals();

  const averages = useMemo(() => {
    const last7 = historyQuery.data?.days.slice(-7) ?? [];
    return {
      protein: avgOverLogged(last7, "protein"),
      carbs: avgOverLogged(last7, "carbs"),
      fat: avgOverLogged(last7, "fat"),
    };
  }, [historyQuery.data]);

  if (historyQuery.isLoading || goalsQuery.isLoading) {
    return (
      <Surface className="space-y-3 p-5">
        <Shimmer className="h-5 w-36 rounded-control" />
        <Shimmer className="h-8 w-full rounded-control" />
        <Shimmer className="h-8 w-full rounded-control" />
        <Shimmer className="h-8 w-full rounded-control" />
        <Shimmer className="mx-auto h-36 w-36 rounded-full" />
      </Surface>
    );
  }

  const goals = goalsQuery.data;
  const hasData = averages.protein !== null || averages.carbs !== null || averages.fat !== null;

  if (!hasData) {
    return (
      <Surface className="p-5">
        <h2 className="text-heading text-foreground">Macro averages</h2>
        <EmptyState
          icon={PieChartIcon}
          headline="No macros to average yet"
          copy="Once you log a few meals, your protein, carbs and fat balance shows up here."
        />
      </Surface>
    );
  }

  const donutData = [
    { name: "Protein", value: Math.round(averages.protein ?? 0), fill: "hsl(var(--protein))" },
    { name: "Carbs", value: Math.round(averages.carbs ?? 0), fill: "hsl(var(--carbs))" },
    { name: "Fat", value: Math.round(averages.fat ?? 0), fill: "hsl(var(--fat))" },
  ].filter((d) => d.value > 0);

  return (
    <Surface className="p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-heading text-foreground">Macro averages</h2>
        <span className="text-caption text-muted-foreground">logged days · last 7</span>
      </div>

      <div className="mt-4 space-y-3">
        <MacroBar kind="protein" value={averages.protein ?? 0} target={goals?.daily_protein ?? 0} />
        <MacroBar kind="carbs" value={averages.carbs ?? 0} target={goals?.daily_carbs ?? 0} />
        <MacroBar kind="fat" value={averages.fat ?? 0} target={goals?.daily_fat ?? 0} />
      </div>

      {donutData.length > 0 && (
        <ChartContainer
          config={{
            Protein: { label: "Protein (g)" },
            Carbs: { label: "Carbs (g)" },
            Fat: { label: "Fat (g)" },
          }}
          className="mx-auto mt-2 aspect-auto h-44 w-full"
        >
          <PieChart margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
            <Pie
              data={donutData}
              dataKey="value"
              nameKey="name"
              innerRadius={40}
              outerRadius={58}
              paddingAngle={2}
              strokeWidth={0}
              label={renderPieLabel}
              labelLine={{ stroke: "hsl(var(--border-strong))" }}
              isAnimationActive={false}
            />
          </PieChart>
        </ChartContainer>
      )}
    </Surface>
  );
}
