import type { MealType } from "@/lib/types";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export interface MealTypePillsProps {
  value: MealType;
  onChange: (value: MealType) => void;
}

/** Meal-type selector pills (auto-suggested default comes from the parent). */
export function MealTypePills({ value, onChange }: MealTypePillsProps) {
  return (
    <div className="flex gap-1.5">
      {MEAL_TYPES.map((meal) => (
        <button
          key={meal}
          type="button"
          onClick={() => onChange(meal)}
          className={`flex h-11 flex-1 items-center justify-center rounded-full px-2 text-label transition-transform duration-instant active:scale-[0.92] ${
            value === meal
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-secondary-text"
          }`}
        >
          {LABELS[meal]}
        </button>
      ))}
    </div>
  );
}
