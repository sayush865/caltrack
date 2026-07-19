import { Plus, Utensils } from "lucide-react";
import { Surface } from "@/components/system";
import { getFoodImage } from "@/lib/foodImages";
import type { DbFood } from "./hooks";

export function MacroDots({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  return (
    <span className="flex items-center gap-2 text-caption tabular-nums text-secondary-text">
      <span className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-protein" aria-hidden="true" />
        {Math.round(protein)}P
      </span>
      <span className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-carbs" aria-hidden="true" />
        {Math.round(carbs)}C
      </span>
      <span className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-fat" aria-hidden="true" />
        {Math.round(fat)}F
      </span>
    </span>
  );
}

export interface FoodCardProps {
  food: DbFood;
  /** Opens the portion sheet. */
  onAdd: (food: DbFood) => void;
}

/** Search-result row: 56px thumb, name + per-serving info, kcal + P/C/F dots, Plus. */
export function FoodCard({ food, onAdd }: FoodCardProps) {
  const image = food.image_url || getFoodImage(food.name);

  return (
    <Surface
      role="button"
      tabIndex={0}
      onClick={() => onAdd(food)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAdd(food);
        }
      }}
      className="flex min-h-[76px] cursor-pointer items-center gap-3 p-3 transition-transform duration-instant active:scale-[0.97]"
    >
      {image ? (
        <img src={image} alt="" className="h-14 w-14 shrink-0 rounded-control object-cover" />
      ) : (
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-control bg-primary-soft text-primary">
          <Utensils className="h-6 w-6" />
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium text-foreground">{food.name}</span>
        <span className="mt-0.5 block text-caption text-muted-foreground">
          Per {food.serving_size}
          {food.serving_unit}
        </span>
        <MacroDots protein={food.protein} carbs={food.carbs} fat={food.fat} />
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="font-display text-[17px] font-semibold tabular-nums text-foreground">
          {Math.round(food.calories)}
          <span className="ml-0.5 text-caption font-medium text-muted-foreground">kcal</span>
        </span>
        <span
          className="grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-primary"
          aria-hidden="true"
        >
          <Plus className="h-5 w-5" />
        </span>
      </span>
    </Surface>
  );
}
