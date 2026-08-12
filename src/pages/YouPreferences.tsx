// /you/preferences — how the user eats. Feeds the AI coach (insights) and keeps
// suggestions realistic: no chicken tips for a vegetarian, no paneer for a vegan.

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, Shimmer, Surface } from "@/components/system";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProfile } from "@/hooks/useProfile";
import { useUpdateProfile } from "@/hooks/useMutations";
import {
  COMMON_ALLERGIES,
  COOKING_STYLES,
  CUISINES,
  DIET_TYPES,
  type CookingStyle,
  type DietType,
} from "@/components/you/mealPrefs";

function Chip({
  label,
  hint,
  selected,
  onClick,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-control border px-3 py-2 text-left transition-transform duration-instant active:scale-[0.94] ${
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-foreground"
      }`}
    >
      <span className="block text-label leading-tight">{label}</span>
      {hint ? (
        <span className={`block text-micro leading-tight ${selected ? "opacity-70" : "text-muted-foreground"}`}>
          {hint}
        </span>
      ) : null}
    </button>
  );
}

function Section({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <Surface className="p-5">
      <h2 className="text-heading text-foreground">{title}</h2>
      {caption ? <p className="mt-1 text-caption text-muted-foreground">{caption}</p> : null}
      <div className="mt-3">{children}</div>
    </Surface>
  );
}

const toggle = (list: string[], value: string): string[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

export default function YouPreferences() {
  const profileQuery = useProfile();
  const updateProfile = useUpdateProfile();
  const profile = profileQuery.data;

  const [diet, setDiet] = useState<DietType | null>(null);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [dislikeDraft, setDislikeDraft] = useState("");
  const [mealsPerDay, setMealsPerDay] = useState<number | null>(null);
  const [cooking, setCooking] = useState<CookingStyle | null>(null);
  const [notes, setNotes] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!profile || hydrated) return;
    setDiet((profile.diet_type as DietType | null) ?? null);
    setCuisines(profile.cuisines ?? []);
    setAllergies(profile.allergies ?? []);
    setDislikes(profile.dislikes ?? []);
    setMealsPerDay(profile.meals_per_day ?? null);
    setCooking((profile.cooking_style as CookingStyle | null) ?? null);
    setNotes(profile.food_notes ?? "");
    setHydrated(true);
  }, [profile, hydrated]);

  const dirty = useMemo(() => {
    if (!profile) return false;
    const same =
      (profile.diet_type ?? null) === diet &&
      JSON.stringify(profile.cuisines ?? []) === JSON.stringify(cuisines) &&
      JSON.stringify(profile.allergies ?? []) === JSON.stringify(allergies) &&
      JSON.stringify(profile.dislikes ?? []) === JSON.stringify(dislikes) &&
      (profile.meals_per_day ?? null) === mealsPerDay &&
      (profile.cooking_style ?? null) === cooking &&
      (profile.food_notes ?? "") === notes;
    return !same;
  }, [profile, diet, cuisines, allergies, dislikes, mealsPerDay, cooking, notes]);

  const addDislike = () => {
    const v = dislikeDraft.trim();
    if (!v) return;
    if (!dislikes.some((d) => d.toLowerCase() === v.toLowerCase())) setDislikes([...dislikes, v.slice(0, 40)]);
    setDislikeDraft("");
  };

  const save = () => {
    updateProfile.mutate(
      {
        diet_type: diet,
        cuisines: cuisines.length ? cuisines : null,
        allergies: allergies.length ? allergies : null,
        dislikes: dislikes.length ? dislikes : null,
        meals_per_day: mealsPerDay,
        cooking_style: cooking,
        food_notes: notes.trim() ? notes.trim().slice(0, 400) : null,
      },
      {
        onSuccess: () => toast.success("Preferences saved. Your coach will use them."),
      },
    );
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <PageHeader title="Meal preferences" back />

      <main className="mx-auto max-w-md space-y-3 px-4">
        {profileQuery.isLoading ? (
          <div className="space-y-3">
            <Shimmer className="h-40 w-full rounded-card" />
            <Shimmer className="h-32 w-full rounded-card" />
            <Shimmer className="h-32 w-full rounded-card" />
          </div>
        ) : (
          <>
            <Section title="How you eat" caption="Suggestions will stay inside this line.">
              <div className="grid grid-cols-2 gap-2">
                {DIET_TYPES.map((d) => (
                  <Chip
                    key={d.value}
                    label={d.label}
                    hint={d.hint}
                    selected={diet === d.value}
                    onClick={() => setDiet(diet === d.value ? null : d.value)}
                  />
                ))}
              </div>
            </Section>

            <Section title="Cuisines you eat most" caption="Pick any. Used to make tips feel like your kitchen.">
              <div className="flex flex-wrap gap-2">
                {CUISINES.map((c) => (
                  <Chip key={c} label={c} selected={cuisines.includes(c)} onClick={() => setCuisines(toggle(cuisines, c))} />
                ))}
              </div>
            </Section>

            <Section title="Allergies & intolerances" caption="Never suggested to you.">
              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGIES.map((a) => (
                  <Chip key={a} label={a} selected={allergies.includes(a)} onClick={() => setAllergies(toggle(allergies, a))} />
                ))}
              </div>
            </Section>

            <Section title="Foods you'd rather skip" caption="Personal dislikes — not medical.">
              <div className="flex gap-2">
                <Input
                  value={dislikeDraft}
                  onChange={(e) => setDislikeDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDislike();
                    }
                  }}
                  placeholder="e.g. karela, mushrooms"
                  className="h-11 rounded-control"
                />
                <button
                  type="button"
                  onClick={addDislike}
                  className="h-11 shrink-0 rounded-control border border-border px-4 text-label text-foreground transition-transform duration-instant active:scale-[0.94]"
                >
                  Add
                </button>
              </div>
              {dislikes.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {dislikes.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDislikes(dislikes.filter((x) => x !== d))}
                      className="min-h-9 rounded-control border border-border px-3 text-caption text-foreground"
                      aria-label={`Remove ${d}`}
                    >
                      {d} ×
                    </button>
                  ))}
                </div>
              ) : null}
            </Section>

            <Section title="Meals a day" caption="Including snacks you count as a meal.">
              <div className="flex flex-wrap gap-2">
                {[2, 3, 4, 5, 6].map((n) => (
                  <Chip
                    key={n}
                    label={String(n)}
                    selected={mealsPerDay === n}
                    onClick={() => setMealsPerDay(mealsPerDay === n ? null : n)}
                  />
                ))}
              </div>
            </Section>

            <Section title="Where your food comes from">
              <div className="grid gap-2">
                {COOKING_STYLES.map((c) => (
                  <Chip
                    key={c.value}
                    label={c.label}
                    hint={c.hint}
                    selected={cooking === c.value}
                    onClick={() => setCooking(cooking === c.value ? null : c.value)}
                  />
                ))}
              </div>
            </Section>

            <Section title="Anything else the coach should know" caption="Fasting window, medical notes, budget, kitchen limits.">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 400))}
                rows={4}
                placeholder="I skip breakfast on weekdays and cook only on Sundays."
                className="rounded-control"
              />
              <p className="mt-1 text-right text-micro text-muted-foreground">{notes.length}/400</p>
            </Section>

            <button
              type="button"
              disabled={!dirty || updateProfile.isPending}
              onClick={save}
              className="h-12 w-full rounded-control bg-primary text-label text-primary-foreground transition-transform duration-instant active:scale-[0.97] disabled:opacity-40"
            >
              {updateProfile.isPending ? "Saving…" : dirty ? "Save preferences" : "Saved"}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
