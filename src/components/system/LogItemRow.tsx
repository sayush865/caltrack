import { Trash2, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseLogMeta, type FoodLogRow } from "@/lib/types";
import { formatTime } from "@/lib/dates";
import { Surface } from "./Surface";

export interface LogItemRowProps {
  row: FoodLogRow;
  onClick?: () => void;
  /** Renders a right-side ghost trash button (44px target). Swipe gestures are P1. */
  onDelete?: () => void;
  /** Hide the meal-type chip when the row already sits under a meal-group header. */
  showMealChip?: boolean;
  className?: string;
}

function confidencePipClass(confidence: number): string {
  if (confidence >= 75) return "bg-success";
  if (confidence >= 45) return "bg-warning";
  return "bg-muted-foreground";
}

const MACRO_DOTS = [
  { key: "protein", letter: "P", dot: "bg-protein" },
  { key: "carbs", letter: "C", dot: "bg-carbs" },
  { key: "fat", letter: "F", dot: "bg-fat" },
] as const;

/** Food log list row: 56px thumb • name • time/meal chip • kcal + P/C/F dots • confidence pip. */
export function LogItemRow({ row, onClick, onDelete, showMealChip = true, className }: LogItemRowProps) {
  const meta = parseLogMeta(row.notes);

  return (
    <Surface
      className={cn(
        "flex h-[76px] items-center gap-3 px-3",
        onClick &&
          "cursor-pointer transition-transform duration-instant active:scale-[0.97]",
        className,
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {row.image_url ? (
        <img
          src={row.image_url}
          alt=""
          className="h-14 w-14 shrink-0 rounded-control object-cover"
        />
      ) : (
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-control bg-primary-soft">
          <Utensils className="h-6 w-6 text-primary" strokeWidth={1.75} />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-body font-semibold text-foreground">
          {row.food_name ?? "Logged food"}
        </p>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 overflow-hidden">
          <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
            {formatTime(row.logged_at)}
          </span>
          {showMealChip && row.meal_type && (
            <span className="truncate rounded-full bg-secondary px-1.5 py-0.5 text-micro uppercase text-secondary-text">
              {row.meal_type}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end">
        <div className="flex items-center gap-1.5">
          {meta?.confidence !== undefined && (
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                confidencePipClass(meta.confidence),
              )}
              aria-hidden="true"
            />
          )}
          <span className="font-display text-[17px] font-semibold tabular-nums text-foreground">
            {Math.round(row.calories ?? 0)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-caption text-muted-foreground tabular-nums">
          {MACRO_DOTS.map(({ key, letter, dot }) => (
            <span key={key} className="flex items-center gap-1">
              <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden="true" />
              {Math.round(row[key] ?? 0)}
              {letter}
            </span>
          ))}
        </div>
      </div>

      {onDelete && (
        <button
          type="button"
          aria-label="Delete log"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="-mr-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground transition-transform duration-instant hover:text-destructive active:scale-[0.92]"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </Surface>
  );
}
