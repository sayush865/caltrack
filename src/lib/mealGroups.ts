// Group logged rows that were saved together (shared LogMeta.mealId) so the
// diary shows ONE clubbed entry per meal with the item breakdown inside.

import { parseLogMeta, type FoodLogRow } from "./types";

export interface MealEntryGroup {
  /** mealId when the rows were logged together, else `solo-<rowId>`. */
  key: string;
  mealId: string | null;
  rows: FoodLogRow[];
}

export function groupByMealEntry(rows: FoodLogRow[]): MealEntryGroup[] {
  const groups: MealEntryGroup[] = [];
  const byMeal = new Map<string, MealEntryGroup>();

  for (const row of rows) {
    const mealId = parseLogMeta(row.notes)?.mealId ?? null;
    if (!mealId) {
      groups.push({ key: `solo-${row.id}`, mealId: null, rows: [row] });
      continue;
    }
    const existing = byMeal.get(mealId);
    if (existing) {
      existing.rows.push(row);
      continue;
    }
    const group: MealEntryGroup = { key: mealId, mealId, rows: [row] };
    byMeal.set(mealId, group);
    groups.push(group);
  }

  return groups;
}

export function groupTotals(rows: FoodLogRow[]) {
  return rows.reduce(
    (acc, row) => ({
      calories: acc.calories + (row.calories ?? 0),
      protein: acc.protein + (row.protein ?? 0),
      carbs: acc.carbs + (row.carbs ?? 0),
      fat: acc.fat + (row.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/** "Chicken curry + rice" style title for a clubbed meal. */
export function groupTitle(rows: FoodLogRow[]): string {
  const names = rows.map((r) => r.food_name ?? "Food item");
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} + ${names[1]}`;
  return `${names[0]} + ${names.length - 1} more`;
}
