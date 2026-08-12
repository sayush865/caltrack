// Favorites = meal_templates CRUD. The schema is FROZEN and has no JSON items column,
// so the per-item DraftItem[] snapshot is packed as versioned JSON into the
// food_name TEXT column (mirroring the LogMeta-in-notes pattern). The aggregate
// nutrition columns are still filled with summed totals so legacy rows/readers work.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { dayKey, suggestedMealType } from "@/lib/dates";
import type { DraftItem, Favorite, MacroSet } from "@/lib/types";
import { useLogMeal } from "./useMutations";
import { useSession } from "./useSession";

interface SnapshotItem {
  name: string;
  portion: string;
  quantity: number;
  base: MacroSet;
}

interface Snapshot {
  v: 2;
  items: SnapshotItem[];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function itemTotals(items: DraftItem[]): MacroSet {
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, vitaminA: 0, vitaminC: 0, calcium: 0, iron: 0 };
  for (const item of items) {
    const q = item.quantity || 1;
    totals.calories += (item.base.calories ?? 0) * q;
    totals.protein += (item.base.protein ?? 0) * q;
    totals.carbs += (item.base.carbs ?? 0) * q;
    totals.fat += (item.base.fat ?? 0) * q;
    totals.fiber += (item.base.fiber ?? 0) * q;
    totals.sugar += (item.base.sugar ?? 0) * q;
    totals.sodium += (item.base.sodium ?? 0) * q;
    totals.vitaminA += (item.base.vitaminA ?? 0) * q;
    totals.vitaminC += (item.base.vitaminC ?? 0) * q;
    totals.calcium += (item.base.calcium ?? 0) * q;
    totals.iron += (item.base.iron ?? 0) * q;
  }
  return {
    calories: Math.round(totals.calories),
    protein: round1(totals.protein),
    carbs: round1(totals.carbs),
    fat: round1(totals.fat),
    fiber: round1(totals.fiber),
    sugar: round1(totals.sugar),
    sodium: round1(totals.sodium),
    vitaminA: round1(totals.vitaminA),
    vitaminC: round1(totals.vitaminC),
    calcium: round1(totals.calcium),
    iron: round1(totals.iron),
  };
}

function snapshotToDraftItems(snapshot: Snapshot): DraftItem[] {
  return snapshot.items.map((item) => ({
    id: crypto.randomUUID(),
    name: item.name,
    portion: item.portion || "1 serving",
    quantity: item.quantity || 1,
    base: item.base,
    calories: round1((item.base.calories ?? 0) * (item.quantity || 1)),
    protein: round1((item.base.protein ?? 0) * (item.quantity || 1)),
    carbs: round1((item.base.carbs ?? 0) * (item.quantity || 1)),
    fat: round1((item.base.fat ?? 0) * (item.quantity || 1)),
    fiber: round1((item.base.fiber ?? 0) * (item.quantity || 1)),
    sugar: round1((item.base.sugar ?? 0) * (item.quantity || 1)),
    sodium: round1((item.base.sodium ?? 0) * (item.quantity || 1)),
    vitaminA: round1((item.base.vitaminA ?? 0) * (item.quantity || 1)),
    vitaminC: round1((item.base.vitaminC ?? 0) * (item.quantity || 1)),
    calcium: round1((item.base.calcium ?? 0) * (item.quantity || 1)),
    iron: round1((item.base.iron ?? 0) * (item.quantity || 1)),
  }));
}

function parseSnapshot(foodName: string): Snapshot | null {
  try {
    const parsed = JSON.parse(foodName) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as Snapshot).v === 2 &&
      Array.isArray((parsed as Snapshot).items)
    ) {
      return parsed as Snapshot;
    }
    return null;
  } catch {
    return null;
  }
}

type TemplateRow = {
  id: string;
  name: string;
  food_name: string;
  image_url: string | null;
  meal_type: string | null;
  use_count: number;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  vitamin_a: number | null;
  vitamin_c: number | null;
  calcium: number | null;
  iron: number | null;
};

function rowToFavorite(row: TemplateRow): Favorite {
  const snapshot = parseSnapshot(row.food_name);
  const totals: MacroSet = {
    calories: Number(row.calories ?? 0),
    protein: Number(row.protein ?? 0),
    carbs: Number(row.carbs ?? 0),
    fat: Number(row.fat ?? 0),
    fiber: Number(row.fiber ?? 0),
    sugar: Number(row.sugar ?? 0),
    sodium: Number(row.sodium ?? 0),
    vitaminA: Number(row.vitamin_a ?? 0),
    vitaminC: Number(row.vitamin_c ?? 0),
    calcium: Number(row.calcium ?? 0),
    iron: Number(row.iron ?? 0),
  };

  const items: DraftItem[] = snapshot
    ? snapshotToDraftItems(snapshot)
    : [
        // Legacy template (plain-text food_name): synthesize one item from aggregates.
        {
          id: crypto.randomUUID(),
          name: row.food_name || row.name,
          portion: "1 serving",
          quantity: 1,
          base: totals,
          ...totals,
        },
      ];

  return {
    id: row.id,
    name: row.name,
    items,
    totals,
    imageUrl: row.image_url,
    mealType: row.meal_type,
    useCount: row.use_count ?? 0,
  };
}

export interface UseFavoritesResult {
  favorites: Favorite[];
  isLoading: boolean;
  addFavorite: (items: DraftItem[], name: string, imageUrl?: string | null) => void;
  removeFavorite: (id: string) => void;
  logFavorite: (fav: Favorite, mult?: number) => void;
  isLogging: boolean;
}

export function useFavorites(): UseFavoritesResult {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  const logMeal = useLogMeal();

  const query = useQuery({
    queryKey: ["favorites", uid],
    enabled: !!uid,
    queryFn: async (): Promise<Favorite[]> => {
      const { data, error } = await supabase
        .from("meal_templates")
        .select("id, name, food_name, image_url, meal_type, use_count, calories, protein, carbs, fat, fiber, sugar, sodium, vitamin_a, vitamin_c, calcium, iron")
        .eq("user_id", uid!)
        .order("use_count", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => rowToFavorite(row as TemplateRow));
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["favorites", uid] });

  const addMutation = useMutation({
    mutationFn: async (vars: { items: DraftItem[]; name: string; imageUrl?: string | null }): Promise<void> => {
      if (!uid) throw new Error("Not authenticated");
      const snapshot: Snapshot = {
        v: 2,
        items: vars.items.map((item) => ({
          name: item.name,
          portion: item.portion,
          quantity: item.quantity || 1,
          base: item.base,
        })),
      };
      const totals = itemTotals(vars.items);
      const { error } = await supabase.from("meal_templates").insert({
        user_id: uid,
        name: vars.name,
        food_name: JSON.stringify(snapshot),
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        fiber: totals.fiber ?? 0,
        sugar: totals.sugar ?? 0,
        sodium: totals.sodium ?? 0,
        vitamin_a: totals.vitaminA ?? 0,
        vitamin_c: totals.vitaminC ?? 0,
        calcium: totals.calcium ?? 0,
        iron: totals.iron ?? 0,
        image_url: vars.imageUrl ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => toast.success(`Saved "${vars.name}" to favorites`),
    onError: () => toast.error("Couldn't save the favorite."),
    onSettled: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!uid) throw new Error("Not authenticated");
      const { error } = await supabase.from("meal_templates").delete().eq("id", id).eq("user_id", uid);
      if (error) throw error;
    },
    onSuccess: () => toast("Favorite removed"),
    onError: () => toast.error("Couldn't remove the favorite."),
    onSettled: invalidate,
  });

  const logFavorite = (fav: Favorite, mult = 1) => {
    const items = fav.items.map((item) => ({ ...item, id: crypto.randomUUID(), quantity: (item.quantity || 1) * mult }));
    logMeal.mutate(
      {
        items,
        mealType: suggestedMealType(),
        dayKey: dayKey(new Date()),
        source: "quick",
        imageUrl: fav.imageUrl ?? undefined,
      },
      {
        onSuccess: async () => {
          toast.success(`Logged ${fav.name}`);
          // Best-effort use_count bump for ranking; failure is non-fatal.
          await supabase
            .from("meal_templates")
            .update({ use_count: fav.useCount + 1, updated_at: new Date().toISOString() })
            .eq("id", fav.id);
          invalidate();
        },
      },
    );
  };

  return {
    favorites: query.data ?? [],
    isLoading: query.isLoading,
    addFavorite: (items, name, imageUrl) => addMutation.mutate({ items, name, imageUrl }),
    removeFavorite: (id) => removeMutation.mutate(id),
    logFavorite,
    isLogging: logMeal.isPending,
  };
}
