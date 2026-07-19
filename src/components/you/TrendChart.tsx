// Weight trend chart per DESIGN_SYSTEM §5.6: raw weigh-ins as faint dots,
// the LINE is the smoothed trend (2px, --primary); goal weight dashed.

import { useMemo } from "react";
import {
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { displayWeight, weightUnit, type Units } from "@/lib/units";

export interface TrendPoint {
  date: string; // dayKey
  raw: number; // kg
  trend: number; // kg
}

export interface TrendChartProps {
  points: TrendPoint[];
  goalKg?: number | null;
  units: Units;
  height?: number;
}

function shortDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function TrendTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const trend = payload.find((p) => p.dataKey === "trend")?.value;
  const raw = payload.find((p) => p.dataKey === "raw")?.value;
  return (
    <div className="rounded-control border border-border bg-card p-3 shadow-raised">
      <p className="font-display text-heading tabular-nums text-foreground">
        {typeof trend === "number" ? trend.toFixed(1) : "—"}
      </p>
      <p className="text-micro uppercase text-muted-foreground">
        trend{typeof raw === "number" ? ` · ${raw.toFixed(1)} logged` : ""}
      </p>
      <p className="mt-0.5 text-caption text-muted-foreground">{shortDate(String(label))}</p>
    </div>
  );
}

export function TrendChart({ points, goalKg, units, height = 160 }: TrendChartProps) {
  const data = useMemo(
    () =>
      points.map((p) => ({
        date: p.date,
        raw: displayWeight(p.raw, units),
        trend: displayWeight(p.trend, units),
      })),
    [points, units],
  );

  const goal = goalKg != null ? displayWeight(goalKg, units) : null;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickCount={3}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={44}
            unit={` ${weightUnit(units)}`}
          />
          {goal !== null && (
            <ReferenceLine
              y={goal}
              stroke="hsl(var(--chart-goal-line))"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: "Goal", fontSize: 11, fill: "hsl(var(--muted-foreground))", position: "insideTopRight" }}
            />
          )}
          {/* Raw weigh-ins: 3px dots at 35% opacity, no connecting line */}
          <Line
            dataKey="raw"
            stroke="none"
            dot={{ r: 3, fill: "hsl(var(--foreground))", fillOpacity: 0.35, strokeWidth: 0 }}
            isAnimationActive={false}
          />
          {/* The line IS the smoothed trend */}
          <Line
            dataKey="trend"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: "hsl(var(--border-strong))", strokeWidth: 1 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
