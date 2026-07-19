import { useRef, useState } from "react";
import { Plus, Star, X } from "lucide-react";
import { LogItemRow } from "@/components/system";
import { useFavorites } from "@/hooks/useFavorites";
import { parseLogMeta, type DraftItem, type FoodLogRow, type MealType } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface MealGroupProps {
  mealType: MealType;
  rows: FoodLogRow[];
  /** Row tap → edit (navigate to /meal/<mealId> or /meal/solo-<rowId>). */
  onRowClick: (row: FoodLogRow) => void;
  onRowDelete: (row: FoodLogRow) => void;
  /** "+ Add to breakfast" ghost row → LogSheet with the browsed date preset. */
  onAdd: () => void;
  className?: string;
}

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

const LONG_PRESS_MS = 500;

/** Snapshot a logged row as a re-loggable DraftItem: base = row macros AS DISPLAYED, quantity 1. */
function rowToDraftItem(row: FoodLogRow): DraftItem {
  const meta = parseLogMeta(row.notes);
  const base = {
    calories: row.calories ?? 0,
    protein: row.protein ?? 0,
    carbs: row.carbs ?? 0,
    fat: row.fat ?? 0,
    fiber: row.fiber ?? undefined,
    sugar: row.sugar ?? undefined,
    sodium: row.sodium ?? undefined,
  };
  return {
    id: crypto.randomUUID(),
    name: row.food_name ?? "Logged food",
    portion: meta?.portion ?? "1 serving",
    quantity: 1,
    base,
    ...base,
  };
}

/**
 * One diary meal section: micro-uppercase header + group kcal, per-item rows,
 * ghost add row. Long-press (touch 500ms / mouse context-menu) on the header
 * reveals "Save as favorite".
 */
export function MealGroup({ mealType, rows, onRowClick, onRowDelete, onAdd, className }: MealGroupProps) {
  const { addFavorite } = useFavorites();
  const [confirmFavorite, setConfirmFavorite] = useState(false);
  const pressTimer = useRef<number | null>(null);

  const groupCalories = Math.round(rows.reduce((sum, row) => sum + (row.calories ?? 0), 0));
  const label = MEAL_LABELS[mealType];

  const startPress = () => {
    if (rows.length === 0) return;
    pressTimer.current = window.setTimeout(() => setConfirmFavorite(true), LONG_PRESS_MS);
  };
  const cancelPress = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const saveAsFavorite = () => {
    const first = rows[0]?.food_name ?? label;
    const name = rows.length > 1 ? `${first} +${rows.length - 1}` : first;
    const imageUrl = rows.find((r) => r.image_url)?.image_url ?? null;
    addFavorite(rows.map(rowToDraftItem), name, imageUrl);
    setConfirmFavorite(false);
  };

  return (
    <section className={cn("space-y-2", className)}>
      <div
        className="flex h-8 select-none items-baseline justify-between px-1"
        onContextMenu={(e) => {
          if (rows.length === 0) return;
          e.preventDefault();
          setConfirmFavorite(true);
        }}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchMove={cancelPress}
        onTouchCancel={cancelPress}
      >
        <h2 className="text-micro uppercase text-muted-foreground">{label}</h2>
        {rows.length > 0 && (
          <span className="text-caption tabular-nums text-secondary-text">{groupCalories} kcal</span>
        )}
      </div>

      {confirmFavorite && (
        <div className="animate-fade-rise flex items-center gap-2 rounded-card border border-border bg-card p-2 shadow-card">
          <button
            type="button"
            onClick={saveAsFavorite}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-control bg-primary-soft text-label text-primary transition-transform duration-instant active:scale-[0.92]"
          >
            <Star className="h-4 w-4" />
            Save as favorite
          </button>
          <button
            type="button"
            aria-label="Cancel"
            onClick={() => setConfirmFavorite(false)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-control text-muted-foreground transition-transform duration-instant active:scale-[0.92]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {rows.map((row) => (
        <LogItemRow key={row.id} row={row} onClick={() => onRowClick(row)} onDelete={() => onRowDelete(row)} />
      ))}

      <button
        type="button"
        onClick={onAdd}
        className="flex h-11 w-full items-center gap-2 rounded-control px-3 text-label text-primary transition-transform duration-instant active:scale-[0.97]"
      >
        <Plus className="h-4 w-4" />
        Add to {label.toLowerCase()}
      </button>
    </section>
  );
}
