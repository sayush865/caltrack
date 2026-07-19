// Portion picker for a database food: servings stepper (0.5 steps),
// meal-type pills (auto-suggested), logs via useLogMeal (source "library").

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { friendlyDay, isToday, suggestedMealType } from "@/lib/dates";
import { getFoodImage } from "@/lib/foodImages";
import type { MealType } from "@/lib/types";
import { useLogMeal } from "@/hooks/useMutations";
import { MacroDots } from "./FoodCard";
import { MealTypePills } from "./MealTypePills";
import { dbFoodToDraftItem, type DbFood } from "./hooks";

const MIN_SERVINGS = 0.5;
const MAX_SERVINGS = 10;

export interface PortionSheetProps {
  food: DbFood | null;
  onOpenChange: (open: boolean) => void;
  /** Local day the entry is logged to (?date= or today). */
  dateKey: string;
}

export function PortionSheet({ food, onOpenChange, dateKey }: PortionSheetProps) {
  const navigate = useNavigate();
  const logMeal = useLogMeal();
  const [servings, setServings] = useState(1);
  const [mealType, setMealType] = useState<MealType>(() => suggestedMealType());

  // Reset per food selection.
  useEffect(() => {
    if (food) {
      setServings(1);
      setMealType(suggestedMealType());
    }
  }, [food?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const step = (delta: number) =>
    setServings((s) => Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round((s + delta) * 2) / 2)));

  const calories = food ? Math.round(food.calories * servings) : 0;

  const log = () => {
    if (!food || logMeal.isPending) return;
    const name = food.name;
    logMeal.mutate(
      {
        items: [dbFoodToDraftItem(food, servings)],
        mealType,
        dayKey: dateKey,
        source: "library",
        imageUrl: food.image_url || getFoodImage(name) || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Logged ${name}`);
          onOpenChange(false);
          navigate(isToday(dateKey) ? "/" : `/log?date=${dateKey}`);
        },
      },
    );
  };

  return (
    <Sheet open={!!food} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[24px] border-t border-border bg-card px-4 pb-4 pt-5 shadow-raised"
      >
        {food && (
          <div className="pb-safe">
            <SheetHeader className="text-left">
              <SheetTitle className="text-title text-foreground">{food.name}</SheetTitle>
            </SheetHeader>
            <p className="mt-0.5 text-caption text-muted-foreground">
              Per {food.serving_size}
              {food.serving_unit} · logging to {friendlyDay(dateKey)}
            </p>

            {/* Servings stepper (0.5 steps) */}
            <div className="mt-4 flex items-center justify-between rounded-card border border-border bg-background p-3">
              <button
                type="button"
                aria-label="Fewer servings"
                onClick={() => step(-0.5)}
                disabled={servings <= MIN_SERVINGS}
                className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground transition-transform duration-instant active:scale-[0.92] disabled:opacity-40"
              >
                <Minus className="h-5 w-5" />
              </button>
              <div className="text-center">
                <p className="font-display text-display-md tabular-nums text-foreground">
                  {servings % 1 === 0 ? servings : servings.toFixed(1)}
                </p>
                <p className="text-caption text-muted-foreground">
                  {servings === 1 ? "serving" : "servings"}
                </p>
              </div>
              <button
                type="button"
                aria-label="More servings"
                onClick={() => step(0.5)}
                disabled={servings >= MAX_SERVINGS}
                className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground transition-transform duration-instant active:scale-[0.92] disabled:opacity-40"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {/* Meal type */}
            <div className="mt-3">
              <p className="text-micro uppercase text-muted-foreground">Meal</p>
              <div className="mt-1.5">
                <MealTypePills value={mealType} onChange={setMealType} />
              </div>
            </div>

            {/* Totals */}
            <div className="mt-4 flex items-center justify-between">
              <MacroDots
                protein={food.protein * servings}
                carbs={food.carbs * servings}
                fat={food.fat * servings}
              />
              <p className="font-display text-display-md tabular-nums text-foreground">
                {calories}
                <span className="ml-1 text-caption font-medium text-muted-foreground">kcal</span>
              </p>
            </div>

            <button
              type="button"
              onClick={log}
              disabled={logMeal.isPending}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-control bg-primary text-body font-medium text-primary-foreground transition-transform duration-instant active:scale-[0.92] disabled:opacity-60"
            >
              {logMeal.isPending ? "Logging…" : `Log ${calories} kcal`}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
