// /exercise?date= — exercise picker grouped by category, DurationSheet with
// MET-based kcal (weight in kg — old lbs bug fixed), manual-entry fallback.
// exercise_database is likely unseeded in prod → EXERCISE_SEED is the browse
// source when the DB is empty (or unreachable).

import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Bike,
  Dumbbell,
  Flame,
  HeartPulse,
  PencilLine,
  Search,
  SearchX,
  StretchHorizontal,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, Shimmer, Surface } from "@/components/system";
import { DurationSheet, type SheetExercise } from "@/components/foods/DurationSheet";
import { EXERCISE_SEED, exerciseCalories, intensityLabel } from "@/components/foods/exerciseSeed";
import { useExerciseDatabase } from "@/components/foods/hooks";
import { DescribeExerciseCard } from "@/components/exercise/DescribeExerciseCard";
import { useGoals } from "@/hooks/useGoals";
import { useLogExercise } from "@/hooks/useMutations";
import { dayKey, friendlyDay, isToday } from "@/lib/dates";

const DEFAULT_WEIGHT_KG = 70;

interface BrowseExercise {
  id: string;
  name: string;
  category: string;
  met: number;
  description?: string;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  cardio: HeartPulse,
  strength: Dumbbell,
  sports: Trophy,
  flexibility: StretchHorizontal,
};

function categoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category.toLowerCase()] ?? Bike;
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/* ── Manual entry fallback card ──────────────────────────────── */

function ManualEntryCard({
  dateKey,
  initialName,
  onCancel,
}: {
  dateKey: string;
  initialName?: string;
  onCancel: () => void;
}) {
  const logExercise = useLogExercise();
  const navigate = useNavigate();
  const [name, setName] = useState(initialName ?? "");
  const [minutes, setMinutes] = useState("30");
  const [calories, setCalories] = useState("");

  const mins = Number(minutes);
  const kcal = Number(calories);
  const valid = name.trim().length > 0 && Number.isFinite(mins) && mins > 0 && Number.isFinite(kcal) && kcal > 0;

  const submit = () => {
    if (!valid || logExercise.isPending) return;
    const savedName = name.trim();
    logExercise.mutate(
      { name: savedName, minutes: mins, calories: kcal, dayKey: dateKey, type: "general" },
      {
        onSuccess: () => {
          toast.success(`Logged ${savedName} — ${Math.round(mins)} min`);
          navigate(isToday(dateKey) ? "/" : `/log?date=${dateKey}`);
        },
      },
    );
  };

  return (
    <Surface className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-heading text-foreground">Add manually</h3>
        <p className="shrink-0 text-caption text-muted-foreground">{friendlyDay(dateKey)}</p>
      </div>
      <div className="mt-3 space-y-2.5">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Activity — e.g. Evening walk"
          className="h-11 rounded-control text-body"
        />
        <div className="flex gap-2">
          <Input
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="Minutes"
            type="number"
            inputMode="numeric"
            min={1}
            className="h-11 flex-1 rounded-control text-body tabular-nums"
          />
          <Input
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="kcal burned"
            type="number"
            inputMode="numeric"
            min={1}
            className="h-11 flex-1 rounded-control text-body tabular-nums"
          />
        </div>
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
          disabled={!valid || logExercise.isPending}
          className="flex h-11 flex-1 items-center justify-center rounded-control bg-primary text-label text-primary-foreground transition-transform duration-instant active:scale-[0.92] disabled:opacity-50"
        >
          {logExercise.isPending ? "Logging…" : "Log it"}
        </button>
      </div>
    </Surface>
  );
}

/* ── Browse row ──────────────────────────────────────────────── */

function ExerciseRowCard({
  exercise,
  weightKg,
  onSelect,
}: {
  exercise: BrowseExercise;
  weightKg: number;
  onSelect: (e: BrowseExercise) => void;
}) {
  const Icon = categoryIcon(exercise.category);
  return (
    <Surface
      role="button"
      tabIndex={0}
      onClick={() => onSelect(exercise)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(exercise);
        }
      }}
      className="flex min-h-[64px] cursor-pointer items-center gap-3 px-3 py-2.5 transition-transform duration-instant active:scale-[0.97]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-primary-soft text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium text-foreground">{exercise.name}</span>
        <span className="block truncate text-caption text-muted-foreground">
          {intensityLabel(exercise.met)} intensity
          {exercise.description ? ` · ${exercise.description}` : ""}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-label tabular-nums text-secondary-text">
        <Flame className="h-4 w-4 text-streak" />~{exerciseCalories(exercise.met, weightKg, 60)}/hr
      </span>
    </Surface>
  );
}

/* ── Page ────────────────────────────────────────────────────── */

export default function Exercise() {
  const [params] = useSearchParams();
  const dateParam = params.get("date");
  const dateKey = dateParam || dayKey(new Date());

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<SheetExercise | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [describeOpen, setDescribeOpen] = useState(params.get("describe") === "1");

  const db = useExerciseDatabase();
  const goals = useGoals();
  const weightKg = goals.data?.current_weight ?? DEFAULT_WEIGHT_KG;

  // Seed fallback when the DB is empty or unreachable (audit: unseeded in prod).
  const source: BrowseExercise[] = useMemo(() => {
    const rows = db.data ?? [];
    if (!db.isError && rows.length > 0) {
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        met: r.met_value,
        description: r.description ?? undefined,
      }));
    }
    return EXERCISE_SEED.map((s) => ({ ...s, met: s.met }));
  }, [db.data, db.isError]);

  const categories = useMemo(() => {
    const set = new Set(source.map((e) => titleCase(e.category)));
    return ["All", ...Array.from(set)];
  }, [source]);

  const filtered = useMemo(() => {
    let list = source;
    if (category !== "All") {
      list = list.filter((e) => e.category.toLowerCase() === category.toLowerCase());
    }
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((e) => e.name.toLowerCase().includes(q));
    return list;
  }, [source, category, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, BrowseExercise[]>();
    for (const e of filtered) {
      const k = titleCase(e.category);
      const arr = map.get(k);
      if (arr) arr.push(e);
      else map.set(k, [e]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Log exercise" back />

      <main className="mx-auto max-w-md px-4 pb-safe">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises…"
            aria-label="Search exercises"
            className="h-12 rounded-control bg-card pl-10 text-body"
          />
        </div>
        {!isToday(dateKey) && (
          <p className="mt-1.5 text-caption text-muted-foreground">
            Logging to {friendlyDay(dateKey)}
          </p>
        )}

        {/* AI describe — the fastest path for anything not in the list */}
        <div className="mt-3">
          {describeOpen ? (
            <DescribeExerciseCard dateKey={dateKey} weightKg={weightKg} onDone={() => setDescribeOpen(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setDescribeOpen(true)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-control bg-primary-soft text-label font-medium text-primary transition-transform duration-instant active:scale-[0.92]"
            >
              <Sparkles className="h-4 w-4" />
              Describe your workout — AI estimates it
            </button>
          )}
        </div>

        {/* Manual entry — always one tap away */}
        <div className="mt-3">
          {manualOpen ? (
            <ManualEntryCard dateKey={dateKey} onCancel={() => setManualOpen(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setManualOpen(true)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-control border border-border bg-card text-label text-secondary-text transition-transform duration-instant active:scale-[0.92]"
            >
              <PencilLine className="h-4 w-4" />
              Add manually — name, minutes, kcal
            </button>
          )}
        </div>

        {/* Category chips */}
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`flex h-11 shrink-0 items-center justify-center rounded-full px-4 text-label transition-transform duration-instant active:scale-[0.92] ${
                category === c
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-secondary-text"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Browse list */}
        <section className="mt-3 pb-10" aria-label="Exercises">
          {db.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Shimmer key={i} className="h-16 w-full rounded-card" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              headline="No matches"
              copy={`Nothing found for "${query.trim()}". Log it manually instead — takes ten seconds.`}
              action={{ label: "Add manually", onClick: () => setManualOpen(true) }}
            />
          ) : (
            <div className="space-y-4">
              {grouped.map(([cat, list]) => (
                <div key={cat}>
                  <p className="text-micro uppercase text-muted-foreground">{cat}</p>
                  <div className="mt-1.5 space-y-2">
                    {list.map((e) => (
                      <ExerciseRowCard
                        key={e.id}
                        exercise={e}
                        weightKg={weightKg}
                        onSelect={(ex) => setSelected({ name: ex.name, category: ex.category, met: ex.met })}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <DurationSheet
        exercise={selected}
        onOpenChange={(open) => !open && setSelected(null)}
        weightKg={weightKg}
        dateKey={dateKey}
      />
    </div>
  );
}
