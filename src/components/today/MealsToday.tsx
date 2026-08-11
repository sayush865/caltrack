// Today's logged items grouped by meal. Items saved together (shared mealId)
// render as ONE clubbed entry that expands to show the per-item breakdown.

import { Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState, MealEntryCard } from "@/components/system";
import { useDeleteLog } from "@/hooks/useMutations";
import { groupByMealEntry } from "@/lib/mealGroups";
import { type DayData, type MealType } from "@/lib/types";
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
        const groups = groupByMealEntry(rows);
        return (
          <section key={key}>
            <h2 className="px-1 text-micro uppercase text-muted-foreground">{label}</h2>
            <div className="mt-2 space-y-2">
              {groups.map((group) => (
                <MealEntryCard
                  key={group.key}
                  rows={group.rows}
                  onOpen={() =>
                    navigate(`/meal/${group.mealId ?? `solo-${group.rows[0].id}`}`)
                  }
                  onDeleteItem={(row) =>
                    deleteLog.mutate({ id: row.id, dayKey, name: row.food_name ?? undefined })
                  }
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

