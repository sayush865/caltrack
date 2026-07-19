// Inline "create custom food" fallback: logs straight to food_logs as a manual
// DraftItem via useLogMeal. We deliberately do NOT insert into the shared
// food_database — it has no user_id column and no user-insert path in the old
// app, so RLS blocks user writes (log-only per contract deviation notes).

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/system";
import { friendlyDay, isToday, suggestedMealType } from "@/lib/dates";
import type { DraftItem, MealType } from "@/lib/types";
import { useLogMeal } from "@/hooks/useMutations";
import { MealTypePills } from "./MealTypePills";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function num(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export interface CustomFoodFormProps {
  dateKey: string;
  /** Prefill the name (e.g. from the failed search term). */
  initialName?: string;
  onCancel: () => void;
}

export function CustomFoodForm({ dateKey, initialName = "", onCancel }: CustomFoodFormProps) {
  const navigate = useNavigate();
  const logMeal = useLogMeal();
  const [name, setName] = useState(initialName);
  const [portion, setPortion] = useState("1 serving");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [mealType, setMealType] = useState<MealType>(() => suggestedMealType());

  const valid = name.trim().length > 0 && num(calories) > 0;

  const submit = () => {
    if (!valid || logMeal.isPending) return;
    const item: DraftItem = {
      id: newId(),
      name: name.trim(),
      portion: portion.trim() || "1 serving",
      quantity: 1,
      base: {
        calories: num(calories),
        protein: num(protein),
        carbs: num(carbs),
        fat: num(fat),
      },
      calories: num(calories),
      protein: num(protein),
      carbs: num(carbs),
      fat: num(fat),
    };
    const savedName = item.name;
    logMeal.mutate(
      { items: [item], mealType, dayKey: dateKey, source: "manual" },
      {
        onSuccess: () => {
          toast.success(`Logged ${savedName}`);
          navigate(isToday(dateKey) ? "/" : `/log?date=${dateKey}`);
        },
      },
    );
  };

  return (
    <Surface className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-heading text-foreground">Create custom food</h3>
        <p className="shrink-0 text-caption text-muted-foreground">{friendlyDay(dateKey)}</p>
      </div>

      <div className="mt-3 space-y-2.5">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name — e.g. Mom's rajma"
          className="h-11 rounded-control text-body"
        />
        <div className="flex gap-2">
          <Input
            value={portion}
            onChange={(e) => setPortion(e.target.value)}
            placeholder="Portion"
            className="h-11 flex-1 rounded-control text-body"
          />
          <Input
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="kcal"
            type="number"
            inputMode="decimal"
            min={0}
            className="h-11 w-24 rounded-control text-body tabular-nums"
          />
        </div>
        <div className="flex gap-2">
          <Input
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            placeholder="Protein g"
            type="number"
            inputMode="decimal"
            min={0}
            className="h-11 flex-1 rounded-control text-body tabular-nums"
          />
          <Input
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            placeholder="Carbs g"
            type="number"
            inputMode="decimal"
            min={0}
            className="h-11 flex-1 rounded-control text-body tabular-nums"
          />
          <Input
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            placeholder="Fat g"
            type="number"
            inputMode="decimal"
            min={0}
            className="h-11 flex-1 rounded-control text-body tabular-nums"
          />
        </div>
        <MealTypePills value={mealType} onChange={setMealType} />
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-11 items-center justify-center rounded-control border border-border bg-card px-4 text-label text-secondary-text transition-transform duration-instant active:scale-[0.92]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!valid || logMeal.isPending}
          className="flex h-11 flex-1 items-center justify-center rounded-control bg-primary text-label text-primary-foreground transition-transform duration-instant active:scale-[0.92] disabled:opacity-50"
        >
          {logMeal.isPending ? "Logging…" : "Log it"}
        </button>
      </div>
    </Surface>
  );
}
