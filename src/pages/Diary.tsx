// Diary tab (/log?date=YYYY-MM-DD): full day ledger for any date.
// See docs/IA_FLOWS.md §1 (Diary row), Flow 4, and the state table.

import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarClock, RefreshCw, UtensilsCrossed } from "lucide-react";
import { EmptyState, Shimmer, Surface } from "@/components/system";
import { DayHeader, DaySummaryBar, ExerciseSection, MealGroup, WaterSection } from "@/components/diary";
import { useLogSheet } from "@/components/LogSheet";
import { useDay } from "@/hooks/useDay";
import { useGoals } from "@/hooks/useGoals";
import { useDeleteLog } from "@/hooks/useMutations";
import { dayKey, friendlyDay, isFuture } from "@/lib/dates";
import { parseLogMeta, type FoodLogRow, type MealType } from "@/lib/types";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function DiarySkeleton() {
  return (
    <div className="space-y-4">
      <Shimmer className="h-[120px] w-full rounded-card" />
      {[0, 1].map((i) => (
        <div key={i} className="space-y-2">
          <Shimmer className="h-4 w-24" />
          <Shimmer className="h-[76px] w-full rounded-card" />
          <Shimmer className="h-[76px] w-full rounded-card" />
        </div>
      ))}
      <div className="space-y-2">
        <Shimmer className="h-4 w-16" />
        <Shimmer className="h-[76px] w-full rounded-card" />
      </div>
    </div>
  );
}

export default function Diary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { openLogSheet } = useLogSheet();

  const dateKey = useMemo(() => {
    const param = searchParams.get("date");
    return param && DAY_KEY_RE.test(param) ? param : dayKey(new Date());
  }, [searchParams]);

  const future = isFuture(dateKey);
  const dayQuery = useDay(dateKey);
  const goalsQuery = useGoals();
  const deleteLog = useDeleteLog();

  const setDate = (key: string) => setSearchParams({ date: key }, { replace: true });

  const openMeal = (row: FoodLogRow) => {
    const mealId = parseLogMeta(row.notes)?.mealId;
    navigate(`/meal/${mealId ?? `solo-${row.id}`}?date=${dateKey}`);
  };

  const day = dayQuery.data;
  const hasFood = (day?.all.length ?? 0) > 0;
  const dayLabelRaw = friendlyDay(dateKey);
  const dayLabel = dayLabelRaw === "Today" || dayLabelRaw === "Yesterday" ? dayLabelRaw.toLowerCase() : dayLabelRaw;

  return (
    <div className="min-h-screen bg-background pb-32">
      <DayHeader dateKey={dateKey} onChange={setDate} />

      <main className="mx-auto max-w-md space-y-4 px-4 pt-2">
        {future ? (
          <EmptyState
            icon={CalendarClock}
            headline="This day hasn't happened yet"
            copy="Come back when it arrives — you can log meals for today or any past day."
          />
        ) : dayQuery.isLoading ? (
          <DiarySkeleton />
        ) : dayQuery.isError ? (
          <Surface className="flex flex-col items-center p-6 text-center">
            <p className="text-body text-secondary-text">Couldn't load this day.</p>
            <button
              type="button"
              onClick={() => dayQuery.refetch()}
              className="mt-3 flex h-11 items-center gap-2 rounded-control bg-primary px-5 text-label text-primary-foreground transition-transform duration-instant active:scale-[0.92]"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </Surface>
        ) : day ? (
          <>
            <DaySummaryBar totals={day.totals} goals={goalsQuery.data ?? null} />

            {hasFood ? (
              MEAL_ORDER.map((mealType) => (
                <MealGroup
                  key={mealType}
                  mealType={mealType}
                  rows={day.meals[mealType]}
                  onRowClick={openMeal}
                  onRowDelete={(row) =>
                    deleteLog.mutate({ id: row.id, dayKey: dateKey, name: row.food_name ?? undefined })
                  }
                  onAdd={() => openLogSheet(dateKey)}
                />
              ))
            ) : (
              <EmptyState
                icon={UtensilsCrossed}
                headline={`Nothing logged for ${dayLabel}`}
                copy="Add a meal and this day's ledger fills itself in."
                action={{ label: "Log a meal for this day", onClick: () => openLogSheet(dateKey) }}
              />
            )}

            <ExerciseSection
              dateKey={dateKey}
              rows={day.exercise.rows}
              totalCalories={day.exercise.calories}
              onAdd={() => navigate(`/exercise?date=${dateKey}`)}
            />

            <WaterSection dateKey={dateKey} totalMl={day.water} goalMl={goalsQuery.data?.daily_water ?? 0} />
          </>
        ) : null}
      </main>
    </div>
  );
}
