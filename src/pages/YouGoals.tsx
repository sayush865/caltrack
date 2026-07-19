// /you/goals — THE single goal editor (Flow 6). The old Goals/Settings split is dead.
// Recompute-from-profile, pace, maintenance-first-class, manual overrides, GLP-1 mode.

import { useEffect, useMemo, useState } from "react";
import { Check, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Shimmer, Surface } from "@/components/system";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useProfile } from "@/hooks/useProfile";
import { useGoals } from "@/hooks/useGoals";
import { useWeights } from "@/hooks/useWeights";
import { useUpdateGoals } from "@/hooks/useMutations";
import { dailyTarget, macroTargets, projectionDate, tdee, type EnergyInput, type Pace } from "@/lib/energy";
import { displayWeight, toKg, weightUnit, type Units } from "@/lib/units";
import { nutritionGoalsSchema } from "@/lib/validation";
import { getPace, GOAL_TYPE_LABELS, isGlp1, PACE_LABELS, setGlp1, setPace } from "@/components/you/prefs";
import type { Goals } from "@/lib/types";

type GoalType = Goals["goal_type"];

const GOAL_OPTIONS: Array<{ value: GoalType; label: string; caption: string }> = [
  { value: "lose", label: "Lose", caption: "Steady deficit" },
  { value: "maintain", label: "Maintain", caption: "Hold and log" },
  { value: "gain", label: "Gain", caption: "Lean surplus" },
];

const PACE_OPTIONS: Array<{ value: Pace; label: string; caption: string }> = [
  { value: "gentle", label: "Gentle", caption: "0.25 kg/wk" },
  { value: "steady", label: "Steady", caption: "0.5 kg/wk" },
  { value: "ambitious", label: "Ambitious", caption: "0.75 kg/wk" },
];

const overridesSchema = nutritionGoalsSchema.pick({
  daily_calories: true,
  daily_protein: true,
  daily_carbs: true,
  daily_fat: true,
  daily_fiber: true,
  daily_water: true,
});

type OverrideField = keyof typeof overridesSchema.shape;

const FIELDS: Array<{ key: OverrideField; label: string; unit: string }> = [
  { key: "daily_calories", label: "Calories", unit: "kcal" },
  { key: "daily_protein", label: "Protein", unit: "g" },
  { key: "daily_carbs", label: "Carbs", unit: "g" },
  { key: "daily_fat", label: "Fat", unit: "g" },
  { key: "daily_fiber", label: "Fiber", unit: "g" },
  { key: "daily_water", label: "Water", unit: "ml" },
];

function activityLevel(value: string | null): EnergyInput["activityLevel"] | null {
  switch (value) {
    case "sedentary":
    case "lightly_active":
    case "moderately_active":
    case "very_active":
    case "extra_active":
      return value;
    default:
      return null;
  }
}

export default function YouGoals() {
  const profileQuery = useProfile();
  const goalsQuery = useGoals();
  const weightsQuery = useWeights();
  const updateGoals = useUpdateGoals();

  const profile = profileQuery.data;
  const goals = goalsQuery.data;
  const units: Units = profile?.units_preference === "imperial" ? "imperial" : "metric";
  const unit = weightUnit(units);

  const [pace, setPaceState] = useState<Pace>(getPace);
  const [glp1, setGlp1State] = useState<boolean>(isGlp1);
  const [goalWeightInput, setGoalWeightInput] = useState("");
  const [form, setForm] = useState<Record<OverrideField, string>>({
    daily_calories: "",
    daily_protein: "",
    daily_carbs: "",
    daily_fat: "",
    daily_fiber: "",
    daily_water: "",
  });
  const [errors, setErrors] = useState<Partial<Record<OverrideField, string>>>({});

  // Seed form + goal weight from loaded goals.
  useEffect(() => {
    if (!goals) return;
    setForm({
      daily_calories: String(goals.daily_calories),
      daily_protein: String(goals.daily_protein),
      daily_carbs: String(goals.daily_carbs),
      daily_fat: String(goals.daily_fat),
      daily_fiber: String(goals.daily_fiber),
      daily_water: String(goals.daily_water),
    });
    setGoalWeightInput(goals.goal_weight != null ? String(displayWeight(goals.goal_weight, units)) : "");
  }, [goals, units]);

  const latestWeightKg = useMemo(() => {
    const rows = weightsQuery.data;
    if (rows && rows.length > 0) return rows[rows.length - 1].weight;
    return goals?.current_weight ?? null;
  }, [weightsQuery.data, goals?.current_weight]);

  // ── Recompute from profile ──────────────────────────────────
  const recomputed = useMemo(() => {
    if (!profile || !goals || latestWeightKg == null) return null;
    const gender = profile.gender === "male" || profile.gender === "female" ? profile.gender : null;
    const activity = activityLevel(profile.activity_level);
    if (!gender || !activity || !profile.age || !profile.height) return null;
    const input: EnergyInput = {
      gender,
      age: profile.age,
      heightCm: profile.height,
      weightKg: latestWeightKg,
      activityLevel: activity,
    };
    const expenditure = tdee(input);
    const calories = dailyTarget(expenditure, goals.goal_type, pace, gender);
    const macros = macroTargets(calories, latestWeightKg, goals.goal_type);
    return { tdee: expenditure, calories, ...macros };
  }, [profile, goals, latestWeightKg, pace]);

  const recomputeDiffers =
    !!recomputed &&
    !!goals &&
    (recomputed.calories !== goals.daily_calories ||
      recomputed.protein !== goals.daily_protein ||
      recomputed.carbs !== goals.daily_carbs ||
      recomputed.fat !== goals.daily_fat);

  const applyRecompute = () => {
    if (!recomputed) return;
    updateGoals.mutate(
      {
        daily_calories: recomputed.calories,
        daily_protein: recomputed.protein,
        daily_carbs: recomputed.carbs,
        daily_fat: recomputed.fat,
        daily_fiber: recomputed.fiber,
      },
      { onSuccess: () => toast.success("Plan recomputed from your profile.") },
    );
  };

  // ── Goal type + pace + goal weight ──────────────────────────
  const selectGoalType = (value: GoalType) => {
    if (!goals || value === goals.goal_type) return;
    updateGoals.mutate(
      { goal_type: value },
      { onSuccess: () => toast.success(`Now ${GOAL_TYPE_LABELS[value].toLowerCase()}.`) },
    );
  };

  const selectPace = (value: Pace) => {
    setPace(value);
    setPaceState(value);
  };

  const saveGoalWeight = () => {
    if (!goals || goalWeightInput === "") return;
    const num = parseFloat(goalWeightInput);
    if (!Number.isFinite(num) || num < 20 || num > 500) {
      toast.error(`Enter a goal weight between 20 and 500 ${unit}.`);
      return;
    }
    const kg = Math.round(toKg(num, units) * 10) / 10;
    if (kg === goals.goal_weight) return;
    updateGoals.mutate({ goal_weight: kg }, { onSuccess: () => toast.success("Goal weight updated.") });
  };

  const projectionFor = (p: Pace): Date | null => {
    if (!goals || goals.goal_type === "maintain" || latestWeightKg == null || goals.goal_weight == null) return null;
    return projectionDate(latestWeightKg, goals.goal_weight, p);
  };

  // ── Manual overrides ────────────────────────────────────────
  const saveOverrides = () => {
    const parsed = overridesSchema.safeParse({
      daily_calories: Math.round(parseFloat(form.daily_calories)),
      daily_protein: Math.round(parseFloat(form.daily_protein)),
      daily_carbs: Math.round(parseFloat(form.daily_carbs)),
      daily_fat: Math.round(parseFloat(form.daily_fat)),
      daily_fiber: Math.round(parseFloat(form.daily_fiber)),
      daily_water: Math.round(parseFloat(form.daily_water)),
    });
    if (!parsed.success) {
      const next: Partial<Record<OverrideField, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as OverrideField;
        if (!next[key]) next[key] = Number.isNaN(parseFloat(form[key])) ? "Enter a number" : issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    updateGoals.mutate(parsed.data, { onSuccess: () => toast.success("Targets updated.") });
  };

  const toggleGlp1 = (on: boolean) => {
    setGlp1(on);
    setGlp1State(on);
    toast(on ? "GLP-1 mode on — protein comes first." : "GLP-1 mode off.");
  };

  const loading = profileQuery.isLoading || goalsQuery.isLoading || weightsQuery.isLoading;

  return (
    <div className="min-h-screen bg-background pb-12">
      <PageHeader title="Goals" back />

      <main className="mx-auto max-w-md space-y-3 px-4">
        {loading || !goals ? (
          <div className="space-y-3">
            <Shimmer className="h-32 w-full rounded-card" />
            <Shimmer className="h-24 w-full rounded-card" />
            <Shimmer className="h-40 w-full rounded-card" />
            <Shimmer className="h-72 w-full rounded-card" />
          </div>
        ) : (
          <>
            {/* ── Current plan summary ─────────────────── */}
            <Surface className="p-5">
              <p className="text-micro uppercase text-muted-foreground">{GOAL_TYPE_LABELS[goals.goal_type]}</p>
              <p className="mt-1 font-display text-display-md tabular-nums text-foreground">
                {goals.daily_calories.toLocaleString()}
                <span className="ml-1.5 font-sans text-caption font-medium text-muted-foreground">kcal / day</span>
              </p>
              <p className="mt-1 text-caption tabular-nums text-secondary-text">
                {goals.daily_protein}g protein · {goals.daily_carbs}g carbs · {goals.daily_fat}g fat ·{" "}
                {goals.daily_fiber}g fiber · {goals.daily_water}ml water
              </p>
              <p className="mt-1 text-caption text-muted-foreground">
                {goals.goal_type === "maintain" ? "Maintenance — no deficit, keep logging" : PACE_LABELS[pace]}
              </p>
            </Surface>

            {/* ── Goal type (maintenance first-class) ───── */}
            <section>
              <h2 className="px-1 pb-2 pt-2 text-heading text-foreground">What are you working toward?</h2>
              <div className="grid grid-cols-3 gap-2">
                {GOAL_OPTIONS.map((opt) => {
                  const active = goals.goal_type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => selectGoalType(opt.value)}
                      className={`min-h-[72px] rounded-card border p-3 text-left transition-transform duration-instant active:scale-[0.97] ${
                        active ? "border-primary bg-primary-soft" : "border-border bg-card shadow-card"
                      }`}
                    >
                      <span className={`block text-label ${active ? "text-primary" : "text-foreground"}`}>
                        {opt.label}
                      </span>
                      <span className="mt-0.5 block text-caption text-muted-foreground">{opt.caption}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── Pace + goal weight (lose/gain only) ───── */}
            {goals.goal_type !== "maintain" && (
              <section>
                <h2 className="px-1 pb-2 pt-2 text-heading text-foreground">Pace</h2>
                <div className="grid grid-cols-3 gap-2">
                  {PACE_OPTIONS.map((opt) => {
                    const active = pace === opt.value;
                    const projected = projectionFor(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => selectPace(opt.value)}
                        className={`min-h-[84px] rounded-card border p-3 text-left transition-transform duration-instant active:scale-[0.97] ${
                          active ? "border-primary bg-primary-soft" : "border-border bg-card shadow-card"
                        }`}
                      >
                        <span className={`block text-label ${active ? "text-primary" : "text-foreground"}`}>
                          {opt.label}
                        </span>
                        <span className="mt-0.5 block text-caption text-muted-foreground">{opt.caption}</span>
                        <span className="mt-1 block text-caption tabular-nums text-secondary-text">
                          {projected
                            ? `~${projected.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                            : "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center gap-3 rounded-card border border-border bg-card p-4 shadow-card">
                  <label htmlFor="goal-weight" className="flex-1 text-body text-foreground">
                    Goal weight
                  </label>
                  <Input
                    id="goal-weight"
                    inputMode="decimal"
                    value={goalWeightInput}
                    onChange={(e) => setGoalWeightInput(e.target.value.replace(/[^0-9.]/g, ""))}
                    onBlur={saveGoalWeight}
                    className="h-11 w-24 rounded-control text-right tabular-nums"
                  />
                  <span className="text-caption text-muted-foreground">{unit}</span>
                </div>
                <p className="mt-1 px-1 text-caption text-muted-foreground">
                  Pace shapes the recompute below and your projection date.
                </p>
              </section>
            )}

            {/* ── Recompute from profile ────────────────── */}
            <Surface className="p-5">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                <h2 className="text-heading text-foreground">Recompute from profile</h2>
              </div>
              {recomputed ? (
                <>
                  <p className="mt-1 text-caption text-muted-foreground">
                    Your profile and latest weight suggest a burn of ~{recomputed.tdee.toLocaleString()} kcal/day.
                  </p>
                  <div className="mt-3 space-y-1.5 tabular-nums">
                    {(
                      [
                        ["Calories", goals.daily_calories, recomputed.calories, "kcal"],
                        ["Protein", goals.daily_protein, recomputed.protein, "g"],
                        ["Carbs", goals.daily_carbs, recomputed.carbs, "g"],
                        ["Fat", goals.daily_fat, recomputed.fat, "g"],
                      ] as Array<[string, number, number, string]>
                    ).map(([label, oldVal, newVal, u]) => (
                      <div key={label} className="flex items-center justify-between text-body">
                        <span className="text-secondary-text">{label}</span>
                        <span className="text-foreground">
                          {oldVal.toLocaleString()}
                          {oldVal !== newVal && (
                            <span className="font-medium text-primary"> → {newVal.toLocaleString()}</span>
                          )}
                          <span className="ml-1 text-caption text-muted-foreground">{u}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  {recomputeDiffers ? (
                    <button
                      type="button"
                      onClick={applyRecompute}
                      disabled={updateGoals.isPending}
                      className="mt-4 flex h-11 w-full items-center justify-center rounded-control bg-primary text-label text-primary-foreground transition-transform duration-instant active:scale-[0.92] disabled:opacity-50"
                    >
                      Apply new targets
                    </button>
                  ) : (
                    <p className="mt-3 flex items-center gap-1.5 text-caption text-success">
                      <Check className="h-4 w-4" /> Your targets already match your profile.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-1 text-caption text-muted-foreground">
                  Add your age, height, sex, activity level and a weigh-in to recompute your plan.
                </p>
              )}
            </Surface>

            {/* ── Manual overrides ──────────────────────── */}
            <Surface className="p-5">
              <h2 className="text-heading text-foreground">Manual targets</h2>
              <p className="mt-0.5 text-caption text-muted-foreground">Override any target — your plan, your call.</p>
              <div className="mt-3 space-y-3">
                {FIELDS.map((field) => (
                  <div key={field.key}>
                    <div className="flex items-center gap-3">
                      <label htmlFor={field.key} className="flex-1 text-body text-foreground">
                        {field.label}
                      </label>
                      <Input
                        id={field.key}
                        inputMode="numeric"
                        value={form[field.key]}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, [field.key]: e.target.value.replace(/[^0-9.]/g, "") }))
                        }
                        className="h-11 w-24 rounded-control text-right tabular-nums"
                      />
                      <span className="w-8 text-caption text-muted-foreground">{field.unit}</span>
                    </div>
                    {errors[field.key] && (
                      <p className="mt-1 text-right text-caption text-destructive">{errors[field.key]}</p>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={saveOverrides}
                disabled={updateGoals.isPending}
                className="mt-4 flex h-11 w-full items-center justify-center rounded-control bg-primary text-label text-primary-foreground transition-transform duration-instant active:scale-[0.92] disabled:opacity-50"
              >
                Save targets
              </button>
            </Surface>

            {/* ── GLP-1 mode ────────────────────────────── */}
            <Surface className="flex items-center gap-3 p-5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-protein-soft">
                <Sparkles className="h-5 w-5 text-protein" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium text-foreground">GLP-1 mode</p>
                <p className="text-caption text-muted-foreground">
                  On a GLP-1 medication? Protein becomes the hero target — small appetite, protein first.
                </p>
              </div>
              <Switch checked={glp1} onCheckedChange={toggleGlp1} aria-label="GLP-1 mode" />
            </Surface>
          </>
        )}
      </main>
    </div>
  );
}
