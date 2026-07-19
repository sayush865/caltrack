// Today's logged items grouped by meal, rendered as per-item <LogItemRow>s
// (per CONTRACTS' own note — no <MealCard>). Row tap opens /meal/<mealId> when
// the LogMeta carries one; delete = soft-delete with 5s undo (useDeleteLog).

import { Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState, LogItemRow } from "@/components/system";
import { useDeleteLog } from "@/hooks/useMutations";
import { parseLogMeta, type DayData, type MealType } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface MealsTodayProps {
  day: DayData;
  dayKey: string;
  className?: string;
}

const SECTIONS: Array<{ key: MealType; label: string }> = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snacks" },
];

export function MealsToday({ day, dayKey, className }: MealsTodayProps) {
  const navigate = useNavigate();
  const deleteLog = useDeleteLog();

  if (day.all.length === 0) {
    return (
      <EmptyState
        icon={Camera}
        headline="Nothing logged yet"
        copy="Snap your plate — takes 3 seconds"
        action={{ label: "Scan food", onClick: () => navigate("/scan") }}
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {SECTIONS.map(({ key, label }) => {
        const rows = day.meals[key];
        if (rows.length === 0) return null;
        return (
          <section key={key}>
            <h2 className="px-1 text-micro uppercase text-muted-foreground">{label}</h2>
            <div className="mt-2 space-y-2">
              {rows.map((row) => {
                const mealId = parseLogMeta(row.notes)?.mealId;
                return (
                  <LogItemRow
                    key={row.id}
                    row={row}
                    showMealChip={false}
                    onClick={mealId ? () => navigate(`/meal/${mealId}`) : undefined}
                    onDelete={() =>
                      deleteLog.mutate({ id: row.id, dayKey, name: row.food_name ?? undefined })
                    }
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
