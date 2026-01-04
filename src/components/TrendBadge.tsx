import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendBadgeProps {
  current: number;
  previous: number;
  label?: string;
  unit?: string;
  showPercentage?: boolean;
  className?: string;
  invertColors?: boolean; // For metrics where lower is better (e.g., calories when trying to lose weight)
}

export function TrendBadge({
  current,
  previous,
  label = "vs last week",
  unit = "",
  showPercentage = true,
  className,
  invertColors = false,
}: TrendBadgeProps) {
  if (previous === 0) {
    return null;
  }

  const difference = current - previous;
  const percentChange = Math.round((difference / previous) * 100);
  const isUp = percentChange > 0;
  const isDown = percentChange < 0;
  const isNeutral = percentChange === 0;

  const getColorClass = () => {
    if (isNeutral) return "text-muted-foreground";
    if (invertColors) {
      return isUp ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";
    }
    return isUp ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400";
  };

  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  return (
    <div className={cn("flex items-center gap-1 text-xs", getColorClass(), className)}>
      <Icon className="h-3 w-3" />
      <span>
        {showPercentage ? (
          <>
            {Math.abs(percentChange)}% {label}
          </>
        ) : (
          <>
            {isUp ? "+" : ""}
            {difference.toFixed(0)}
            {unit} {label}
          </>
        )}
      </span>
    </div>
  );
}
