// 7-day calorie bar chart per DESIGN_SYSTEM §5.6: 20px bars, radius [6,6,0,0],
// under/on-target(±5%)/over fills (over = AMBER, never red), dashed goal
// ReferenceLine, ≤3 horizontal gridlines, no vertical, value label on today only.

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { EmptyState, Shimmer, Surface } from "@/components/system";
import { useGoals } from "@/hooks/useGoals";
import { useLogSheet } from "@/components/LogSheet";
import { parseDayKey } from "@/lib/dates";
import { useInsightsHistory } from "./useInsightsHistory";

const UNDER = "hsl(var(--chart-under))";
const ON_TARGET = "hsl(var(--chart-on-target))";
const OVER = "hsl(var(--chart-over))";

interface BarDatum {
  day: string;
  label: string;
  calories: number;
  isToday: boolean;
}

function fillFor(kcal: number, goal: number): string {
  if (goal <= 0) return UNDER;
  const ratio = kcal / goal;
  if (ratio < 0.95) return UNDER;
  if (ratio <= 1.05) return ON_TARGET;
  return OVER;
}

interface TodayLabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  index?: number;
  value?: number | string;
}

/** Direct value label on today's bar only. */
function TodayLabel({ x, y, width, index, value }: TodayLabelProps) {
  if (index !== 6 || !value || Number(value) <= 0) return null;
  const cx = Number(x) + Number(width) / 2;
  return (
    <text
      x={cx}
      y={Number(y) - 6}
      textAnchor="middle"
      fontSize={12}
      fontWeight={600}
      fontFamily="'Space Grotesk', 'Inter', sans-serif"
      fill="hsl(var(--foreground))"
    >
      {Math.round(Number(value)).toLocaleString()}
    </text>
  );
}

export function WeeklyCalorieChart() {
  const historyQuery = useInsightsHistory();
  const goalsQuery = useGoals();
  const { openLogSheet } = useLogSheet();

  const goal = goalsQuery.data?.daily_calories ?? 2000;

  const data = useMemo<BarDatum[]>(() => {
    const days = historyQuery.data?.days.slice(-7) ?? [];
    return days.map((d, i) => ({
      day: d.day,
      label: parseDayKey(d.day).toLocaleDateString(undefined, { weekday: "short" }),
      calories: d.calories,
      isToday: i === days.length - 1,
    }));
  }, [historyQuery.data]);

  if (historyQuery.isLoading || goalsQuery.isLoading) {
    return (
      <Surface className="space-y-3 p-5">
        <Shimmer className="h-5 w-32 rounded-control" />
        <Shimmer className="h-44 w-full rounded-control" />
      </Surface>
    );
  }

  const anyLogged = data.some((d) => d.calories > 0);

  return (
    <Surface className="p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-heading text-foreground">Calories this week</h2>
        <span className="text-caption text-muted-foreground">goal {Math.round(goal).toLocaleString()}</span>
      </div>

      {!anyLogged ? (
        <EmptyState
          icon={BarChart3}
          headline="No meals this week yet"
          copy="Log a few meals and your week takes shape here."
          action={{ label: "Log a meal", onClick: () => openLogSheet() }}
        />
      ) : (
        <ChartContainer config={{ calories: { label: "Calories" } }} className="mt-3 aspect-auto h-44 w-full">
          <BarChart data={data} margin={{ top: 20, right: 6, left: 6, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--chart-grid))" strokeWidth={1} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              interval={0}
            />
            <YAxis hide tickCount={3} domain={[0, (dataMax: number) => Math.max(dataMax, goal) * 1.15]} />
            <ChartTooltip
              cursor={{ fill: "hsl(var(--muted))" }}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const day = (payload?.[0]?.payload as BarDatum | undefined)?.day;
                    return day
                      ? parseDayKey(day).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
                      : "";
                  }}
                />
              }
            />
            <ReferenceLine
              y={goal}
              stroke="hsl(var(--chart-goal-line))"
              strokeWidth={1}
              strokeDasharray="4 4"
              label={{ value: "Goal", position: "insideTopRight", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <Bar dataKey="calories" barSize={20} radius={[6, 6, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.day} fill={fillFor(d.calories, goal)} />
              ))}
              <LabelList dataKey="calories" content={<TodayLabel />} />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </Surface>
  );
}
