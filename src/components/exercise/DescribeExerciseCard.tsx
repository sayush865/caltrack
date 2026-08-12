// DescribeExerciseCard — the AI path for exercise logging: type what you did,
// Gemini turns it into name/minutes/kcal via MET reasoning, you confirm or edit.

import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Spinner, Surface } from "@/components/system";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useLogExercise } from "@/hooks/useMutations";

interface DraftExercise {
  exercise_name: string;
  exercise_type: string;
  duration_minutes: number;
  calories_burned: number;
  intensity: string;
}

export interface DescribeExerciseCardProps {
  dateKey: string;
  weightKg: number;
  onDone?: () => void;
}

export function DescribeExerciseCard({ dateKey, weightKg, onDone }: DescribeExerciseCardProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<DraftExercise | null>(null);
  const [reasoning, setReasoning] = useState("");
  const logExercise = useLogExercise();

  const analyze = async () => {
    const description = text.trim();
    if (!description || loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-exercise", {
        body: { description, weightKg },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDraft(data.exercise as DraftExercise);
      setReasoning(data.analysis?.reasoning ?? "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that workout.");
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    if (!draft) return;
    logExercise.mutate(
      {
        name: draft.exercise_name,
        minutes: draft.duration_minutes,
        calories: draft.calories_burned,
        dayKey: dateKey,
        type: draft.exercise_type,
        intensity: draft.intensity,
      },
      {
        onSuccess: () => {
          toast.success(`Logged ${draft.exercise_name}`);
          setDraft(null);
          setText("");
          onDone?.();
        },
      },
    );
  };

  return (
    <Surface className="p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <p className="text-label font-medium text-foreground">Describe your workout</p>
      </div>

      <Input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") analyze();
        }}
        placeholder="e.g. 40 min brisk walk then 15 min weights"
        aria-label="Workout description"
        className="mt-2 h-12 rounded-control bg-background text-body"
      />

      <button
        type="button"
        onClick={analyze}
        disabled={loading || text.trim().length === 0}
        className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-control bg-primary text-label font-medium text-primary-foreground transition-transform duration-instant active:scale-[0.92] disabled:opacity-40"
      >
        {loading ? <Spinner size={18} /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Reading your workout…" : draft ? "Analyze again" : "Estimate calories"}
      </button>

      {draft && (
        <div className="mt-3 animate-fade-rise rounded-card border border-border bg-background p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="min-w-0 truncate text-body font-medium text-foreground">{draft.exercise_name}</p>
            <p className="shrink-0 font-display text-heading font-bold tabular-nums text-foreground">
              {draft.calories_burned}
              <span className="ml-1 text-caption font-medium text-muted-foreground">kcal</span>
            </p>
          </div>
          <p className="mt-0.5 text-caption text-muted-foreground">
            {draft.duration_minutes} min · {draft.exercise_type} · {draft.intensity} intensity
          </p>
          {reasoning && <p className="mt-1 text-caption text-muted-foreground">{reasoning}</p>}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-micro uppercase text-muted-foreground">
              Minutes
              <Input
                type="number"
                inputMode="numeric"
                value={draft.duration_minutes}
                onChange={(e) =>
                  setDraft({ ...draft, duration_minutes: Math.max(1, Number(e.target.value) || 1) })
                }
                className="mt-1 h-11 rounded-control bg-card text-body tabular-nums"
              />
            </label>
            <label className="text-micro uppercase text-muted-foreground">
              Calories
              <Input
                type="number"
                inputMode="numeric"
                value={draft.calories_burned}
                onChange={(e) =>
                  setDraft({ ...draft, calories_burned: Math.max(0, Number(e.target.value) || 0) })
                }
                className="mt-1 h-11 rounded-control bg-card text-body tabular-nums"
              />
            </label>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="flex h-11 items-center justify-center gap-1.5 rounded-control border border-border px-4 text-label text-secondary-text transition-transform duration-instant active:scale-[0.92]"
            >
              <RefreshCw className="h-4 w-4" />
              Redo
            </button>
            <button
              type="button"
              onClick={save}
              disabled={logExercise.isPending}
              className="flex h-11 flex-1 items-center justify-center rounded-control bg-primary text-label font-medium text-primary-foreground transition-transform duration-instant active:scale-[0.92] disabled:opacity-60"
            >
              {logExercise.isPending ? <Spinner size={18} /> : "Log it"}
            </button>
          </div>
        </div>
      )}
    </Surface>
  );
}
