// Meal / food preferences — India-first option sets.
// Stored on `profiles` so both the client and the AI functions can read them.

export type DietType =
  | "omnivore"
  | "eggetarian"
  | "vegetarian"
  | "vegan"
  | "jain"
  | "pescatarian";

export type CookingStyle = "home_cooked" | "mixed" | "eating_out";

export const DIET_TYPES: Array<{ value: DietType; label: string; hint: string }> = [
  { value: "vegetarian", label: "Vegetarian", hint: "No meat, no egg" },
  { value: "eggetarian", label: "Eggetarian", hint: "Veg + eggs" },
  { value: "omnivore", label: "Non-vegetarian", hint: "Everything" },
  { value: "pescatarian", label: "Pescatarian", hint: "Veg + fish" },
  { value: "vegan", label: "Vegan", hint: "No dairy either" },
  { value: "jain", label: "Jain", hint: "No root vegetables" },
];

export const CUISINES: string[] = [
  "North Indian",
  "South Indian",
  "Bengali",
  "Gujarati",
  "Maharashtrian",
  "Punjabi",
  "Continental",
  "Chinese",
  "Middle Eastern",
];

export const COMMON_ALLERGIES: string[] = [
  "Lactose",
  "Gluten",
  "Peanuts",
  "Tree nuts",
  "Soy",
  "Shellfish",
  "Eggs",
];

export const COOKING_STYLES: Array<{ value: CookingStyle; label: string; hint: string }> = [
  { value: "home_cooked", label: "Mostly home-cooked", hint: "Ghar ka khana" },
  { value: "mixed", label: "Mixed", hint: "Home + outside" },
  { value: "eating_out", label: "Mostly outside", hint: "Tiffin, canteen, delivery" },
];

export const DIET_LABELS: Record<DietType, string> = DIET_TYPES.reduce(
  (acc, d) => ({ ...acc, [d.value]: d.label }),
  {} as Record<DietType, string>,
);

export const COOKING_LABELS: Record<CookingStyle, string> = COOKING_STYLES.reduce(
  (acc, c) => ({ ...acc, [c.value]: c.label }),
  {} as Record<CookingStyle, string>,
);

export function isDietType(v: unknown): v is DietType {
  return typeof v === "string" && DIET_TYPES.some((d) => d.value === v);
}

export function isCookingStyle(v: unknown): v is CookingStyle {
  return typeof v === "string" && COOKING_STYLES.some((c) => c.value === v);
}

/** One-line summary for the You hub row. */
export function prefsSummary(p: {
  diet_type?: string | null;
  meals_per_day?: number | null;
  cuisines?: string[] | null;
  allergies?: string[] | null;
}): string {
  const bits: string[] = [];
  if (isDietType(p.diet_type)) bits.push(DIET_LABELS[p.diet_type]);
  if (p.meals_per_day) bits.push(`${p.meals_per_day} meals/day`);
  if (p.cuisines?.length) bits.push(p.cuisines.slice(0, 2).join(", "));
  if (p.allergies?.length) bits.push(`avoids ${p.allergies[0].toLowerCase()}`);
  return bits.length ? bits.join(" · ") : "Not set — tell the coach how you eat";
}
