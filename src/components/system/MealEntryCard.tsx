import { useState } from "react";
import { ChevronDown, Pencil, Trash2, Utensils } from "lucide-react";
import { formatTime } from "@/lib/dates";
import { groupTitle, groupTotals } from "@/lib/mealGroups";
import { parseLogMeta, type FoodLogRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Surface } from "./Surface";

export interface MealEntryCardProps {
  rows: FoodLogRow[];
  /** Open the meal editor (whole group). */
  onOpen?: () => void;
  /** Delete a single item inside the breakdown. */
  onDeleteItem?: (row: FoodLogRow) => void;
  className?: string;
}

const MACRO_DOTS = [
  { key: "protein", letter: "P", dot: "bg-protein" },
  { key: "carbs", letter: "C", dot: "bg-carbs" },
  { key: "fat", letter: "F", dot: "bg-fat" },
] as const;

/**
 * One clubbed log entry: everything saved from a single scan/description shows
 * as ONE row (photo, combined kcal + macros) that expands to the item breakdown.
 */
export function MealEntryCard({ rows, onOpen, onDeleteItem, className }: MealEntryCardProps) {
  const [open, setOpen] = useState(false);
  const totals = groupTotals(rows);
  const title = groupTitle(rows);
  const image = rows.find((r) => r.image_url)?.image_url ?? null;

  return (
    <Surface className={cn("overflow-hidden", className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-3 text-left transition-transform duration-instant active:scale-[0.99]"
      >
        {image ? (
          <img src={image} alt="" className="h-14 w-14 shrink-0 rounded-control object-cover" />
        ) : (
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-control bg-primary-soft">
            <Utensils className="h-6 w-6 text-primary" strokeWidth={1.75} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-body font-semibold text-foreground">{title}</p>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 overflow-hidden">
            <span className="shrink-0 text-caption tabular-nums text-muted-foreground">
              {formatTime(rows[0].logged_at)}
            </span>
            {rows.length > 1 && (
              <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-micro uppercase text-secondary-text">
                {rows.length} items
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end">
          <span className="font-display text-[17px] font-semibold tabular-nums text-foreground">
            {Math.round(totals.calories)}
          </span>
          <div className="mt-0.5 flex items-center gap-1.5 text-caption tabular-nums text-muted-foreground">
            {MACRO_DOTS.map(({ key, letter, dot }) => (
              <span key={key} className="flex items-center gap-1">
                <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden="true" />
                {Math.round(totals[key])}
                {letter}
              </span>
            ))}
          </div>
        </div>

        <ChevronDown
          className={cn(
            "ml-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-fast",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="animate-fade-rise border-t border-border">
          {rows.map((row) => {
            const meta = parseLogMeta(row.notes);
            return (
              <div key={row.id} className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-label text-foreground">{row.food_name ?? "Food item"}</p>
                  <p className="text-caption text-muted-foreground">
                    {meta?.portion ?? "1 serving"}
                    {meta?.quantity && meta.quantity !== 1 ? ` × ${meta.quantity}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-label tabular-nums text-foreground">{Math.round(row.calories ?? 0)} kcal</p>
                  <p className="text-caption tabular-nums text-muted-foreground">
                    {Math.round(row.protein ?? 0)}P · {Math.round(row.carbs ?? 0)}C · {Math.round(row.fat ?? 0)}F
                  </p>
                </div>
                {onDeleteItem && (
                  <button
                    type="button"
                    aria-label={`Delete ${row.food_name ?? "item"}`}
                    onClick={() => onDeleteItem(row)}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground transition-transform duration-instant hover:text-destructive active:scale-[0.92]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}

          {onOpen && (
            <button
              type="button"
              onClick={onOpen}
              className="flex h-11 w-full items-center justify-center gap-2 text-label text-primary transition-transform duration-instant active:scale-[0.97]"
            >
              <Pencil className="h-4 w-4" />
              Edit meal
            </button>
          )}
        </div>
      )}
    </Surface>
  );
}
