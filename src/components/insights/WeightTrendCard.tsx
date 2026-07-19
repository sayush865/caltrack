// Weight trend per DESIGN_SYSTEM §5.6: raw weigh-ins as 35%-opacity dots, the
// LINE is the smoothed EWMA trend (2px --primary), dashed goal line, padded y
// domain. Empty state → "Two weigh-ins and we can show your trend" + WeightSheet.

import { useMemo, useState } from "react";
import { ComposedChart, Line, ReferenceLine, XAxis, YAxis } from "recharts";
import { Scale } from "lucide-react";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { EmptyState, Shimmer, Surface } from "@/components/system";
import WeightSheet from "@/components/WeightSheet";
import { useGoals } from "@/hooks/useGoals";
import { useProfile } from "@/hooks/useProfile";
import { useWeights } from "@/hooks/useWeights";
import { parseDayKey } from "@/lib/dates";
import { smoothWeights } from "@/lib/energy";
import { displayWeight, weightUnit, type Units } from "@/lib/units";

const round1 = (n: number) => Math.round(n * 10) / 10;

interface TrendDatum {
  date: string;
  raw: number;
  trend: number;
}

export function WeightTrendCard() {
  const weightsQuery = useWeights();
  const goalsQuery = useGoals();
  const profileQuery = useProfile();
  const [sheetOpen, setSheetOpen] = useState(false);

  const units: Units = profileQuery.data?.units_preference === "imperial" ? "imperial" : "metric";
  const unit = weightUnit(units);

  const smoothed = useMemo(() => smoothWeights(weightsQuery.data ?? []), [weightsQuery.data]);

  const data = useMemo<TrendDatum[]>(
    () =>
      smoothed.map((p) => ({
        date: p.date,
        raw: round1(displayWeight(p.raw, units)),
        trend: round1(displayWeight(p.trend, units)),
      })),
    [smoothed, units],
  );

  if (weightsQuery.isLoading || goalsQuery.isLoading || profileQuery.isLoading) {
    return (
      <Surface className="space-y-3 p-5">
        <Shimmer className="h-5 w-32 rounded-control" />
        <Shimmer className="h-44 w-full rounded-control" />
      </Surface>
    );
  }

  if (data.length < 2) {
    return (
      <Surface className="p-5">
        <h2 className="text-heading text-foreground">Weight trend</h2>
        <EmptyState
          icon={Scale}
          headline="Two weigh-ins and we can show your trend"
          copy="Daily fluctuations are noise — the trend line is the truth."
          action={{ label: "Add weight", onClick: () => setSheetOpen(true) }}
        />
        <WeightSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      </Surface>
    );
  }

  const goalKg = goalsQuery.data?.goal_weight ?? null;
  const goalDisplay = goalKg === null ? null : round1(displayWeight(goalKg, units));

  const values = data.flatMap((d) => [d.raw, d.trend]);
  if (goalDisplay !== null) values.push(goalDisplay);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(0.5, (max - min) * 0.15);
  const domain: [number, number] = [Math.floor((min - pad) * 10) / 10, Math.ceil((max + pad) * 10) / 10];

  const latest = data[data.length - 1];
  const anchor30 = (() => {
    const cutoff = parseDayKey(latest.date).getTime() - 30 * 86_400_000;
    const before = data.filter((d) => parseDayKey(d.date).getTime() <= cutoff);
    return before.length > 0 ? before[before.length - 1] : data[0];
  })();
  const delta30 = round1(latest.trend - anchor30.trend);

  return (
    <Surface className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-heading text-foreground">Weight trend</h2>
          <p className="mt-0.5 text-caption text-muted-foreground">
            {delta30 === 0 ? "holding steady" : `${delta30 > 0 ? "+" : ""}${delta30} ${unit} over the last 30 days`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-display-md tabular-nums text-foreground">{latest.trend}</p>
          <p className="text-caption text-muted-foreground">{unit} trend</p>
        </div>
      </div>

      <ChartContainer
        config={{ trend: { label: "Trend" }, raw: { label: "Weigh-in" } }}
        className="mt-3 aspect-auto h-44 w-full"
      >
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            minTickGap={32}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(value: string) =>
              parseDayKey(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })
            }
          />
          <YAxis
            domain={domain}
            tickCount={3}
            width={38}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(value: number) => String(round1(value))}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const date = (payload?.[0]?.payload as TrendDatum | undefined)?.date;
                  return date ? parseDayKey(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
                }}
              />
            }
          />
          {goalDisplay !== null && (
            <ReferenceLine
              y={goalDisplay}
              stroke="hsl(var(--chart-goal-line))"
              strokeWidth={1}
              strokeDasharray="4 4"
              label={{ value: "Goal", position: "insideBottomRight", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
          )}
          {/* Raw weigh-ins: dots only, ghosted at 35% */}
          <Line
            dataKey="raw"
            stroke="none"
            isAnimationActive={false}
            dot={{ r: 3, strokeWidth: 0, fill: "hsl(var(--primary))", fillOpacity: 0.35 }}
            activeDot={{ r: 4, strokeWidth: 0, fill: "hsl(var(--primary))" }}
          />
          {/* The smoothed trend IS the line */}
          <Line
            dataKey="trend"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: "hsl(var(--primary))" }}
          />
        </ComposedChart>
      </ChartContainer>

      <WeightSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </Surface>
  );
}
