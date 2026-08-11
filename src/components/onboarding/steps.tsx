// The 14 onboarding quiz steps — copy verbatim from IA_FLOWS §6.
// Option steps auto-advance 250ms after select (≈1.3s when an affirmation
// banner shows first). Input steps use an explicit Continue.

import { useMemo, useState } from "react";
import { CalendarDays, HeartHandshake, Lock, Scale } from "lucide-react";
import { EmptyState } from "@/components/system";
import {
  cmToFtIn,
  displayWeight,
  formatWeight,
  ftInToCm,
  toKg,
  weightUnit,
  type Units,
} from "@/lib/units";
import { projectionDate, type Pace } from "@/lib/energy";
import {
  checkGoalWeight,
  formatLongDate,
  paceUnavailable,
  type Activity,
  type ExerciseDays,
  type FoodContext,
  type FoodStyle,
  type Obstacle,
  type QuizAnswers,
  type StepId,
} from "./quiz";
import {
  AffirmationBanner,
  NumberField,
  OptionCard,
  PrimaryButton,
  StepShell,
  useAdvanceTimer,
} from "./ui";

export interface StepProps {
  answers: QuizAnswers;
  patch: (p: Partial<QuizAnswers>) => void;
  next: () => void;
}

/* ── Generic auto-advancing choice step ───────────────────────── */

interface Choice<T extends string> {
  value: T;
  label: string;
  sub?: string;
  affirmation?: string;
  disabled?: boolean;
  note?: string;
  badge?: string;
}

function AutoChoiceStep<T extends string>({
  question,
  info,
  choices,
  value,
  onPick,
  next,
}: {
  question: string;
  info?: string;
  choices: Array<Choice<T>>;
  value: T | undefined;
  onPick: (value: T) => void;
  next: () => void;
}) {
  const [banner, setBanner] = useState<string | null>(null);
  const schedule = useAdvanceTimer(next);

  const handle = (c: Choice<T>) => {
    if (c.disabled) return;
    onPick(c.value);
    setBanner(c.affirmation ?? null);
    schedule(c.affirmation ? 1300 : 250);
  };

  return (
    <StepShell question={question} info={info}>
      <div className="space-y-2">
        {choices.map((c) => (
          <OptionCard
            key={c.value}
            label={c.label}
            sub={c.sub}
            note={c.note}
            badge={c.badge}
            selected={value === c.value}
            disabled={c.disabled}
            onClick={() => handle(c)}
          />
        ))}
      </div>
      {banner && <AffirmationBanner>{banner}</AffirmationBanner>}
    </StepShell>
  );
}

/* ── Step 1 — Goal ────────────────────────────────────────────── */

function GoalStep({ answers, patch, next }: StepProps) {
  return (
    <AutoChoiceStep
      question="What brings you to CalTrack?"
      choices={[
        { value: "lose", label: "Lose weight", affirmation: "Great — let's build a plan around that." },
        { value: "maintain", label: "Maintain my weight", affirmation: "Great — let's build a plan around that." },
        { value: "gain", label: "Gain muscle", affirmation: "Great — let's build a plan around that." },
      ]}
      value={answers.goal}
      onPick={(goal) => patch({ goal })}
      next={next}
    />
  );
}

/* ── Step 2 — Prior experience ────────────────────────────────── */

function ExperienceStep({ answers, patch, next }: StepProps) {
  return (
    <AutoChoiceStep
      question="Have you tried tracking food before?"
      choices={[
        {
          value: "app",
          label: "Yes, with another app",
          affirmation: "Then you'll like this: logging here takes about 3 seconds per meal.",
        },
        { value: "paper", label: "Yes, on paper or in my head" },
        {
          value: "never",
          label: "Never tracked before",
          affirmation: "Perfect timing — we've made this the easy way to start.",
        },
      ]}
      value={answers.experience}
      onPick={(experience) => patch({ experience })}
      next={next}
    />
  );
}

/* ── Step 3 — Discovery ───────────────────────────────────────── */

function DiscoveryStep({ answers, patch, next }: StepProps) {
  return (
    <AutoChoiceStep
      question="Where did you hear about us?"
      choices={[
        { value: "friend", label: "A friend" },
        { value: "social", label: "Instagram / TikTok / YouTube" },
        { value: "search", label: "App store or web search" },
        { value: "other", label: "Somewhere else" },
      ]}
      value={answers.discovery}
      onPick={(discovery) => patch({ discovery })}
      next={next}
    />
  );
}

/* ── Step 4 — Sex ─────────────────────────────────────────────── */

function SexStep({ answers, patch, next }: StepProps) {
  return (
    <AutoChoiceStep
      question="What's your biological sex? We use this for your metabolic calculation — nothing else."
      info="Metabolic rate formulas differ by biological sex."
      choices={[
        { value: "female", label: "Female" },
        { value: "male", label: "Male" },
      ]}
      value={answers.sex}
      onPick={(sex) => patch({ sex })}
      next={next}
    />
  );
}

/* ── Step 5 — Age (13–100, under-18 gentle exit) ──────────────── */

function AgeStep({ answers, patch, next }: StepProps) {
  const [value, setValue] = useState(answers.age !== undefined ? String(answers.age) : "");
  const [underage, setUnderage] = useState(false);
  const age = parseInt(value, 10);
  const valid = Number.isFinite(age) && age >= 13 && age <= 100;

  if (underage) {
    return (
      <div className="animate-fade-rise pt-6">
        <EmptyState
          icon={HeartHandshake}
          headline="CalTrack is designed for adults"
          copy="Nutrition needs before 18 are different, and a generic calorie target could do more harm than good. Please talk to a parent or doctor about what's right for you."
          action={{ label: "Change my age", onClick: () => setUnderage(false) }}
        />
      </div>
    );
  }

  return (
    <StepShell question="How old are you?">
      <NumberField
        value={value}
        onChange={setValue}
        unit="years"
        placeholder="25"
        autoFocus
        ariaLabel="Your age"
      />
      {value !== "" && !valid && (
        <p className="text-caption text-muted-foreground">Enter an age between 13 and 100.</p>
      )}
      <PrimaryButton
        disabled={!valid}
        onClick={() => {
          patch({ age });
          if (age < 18) setUnderage(true);
          else next();
        }}
      >
        Continue
      </PrimaryButton>
    </StepShell>
  );
}

/* ── Step 6 — Height (cm / ft-in toggle sets units for everything) ── */

function HeightStep({ answers, patch, next }: StepProps) {
  const initial = answers.heightCm;
  const initialFtIn = initial !== undefined ? cmToFtIn(initial) : null;
  const [cm, setCm] = useState(initial !== undefined ? String(Math.round(initial)) : "");
  const [ft, setFt] = useState(initialFtIn ? String(initialFtIn.ft) : "");
  const [inch, setInch] = useState(initialFtIn ? String(initialFtIn.in) : "");

  const heightCm =
    answers.units === "metric"
      ? parseFloat(cm)
      : ft !== "" || inch !== ""
        ? ftInToCm(parseFloat(ft) || 0, parseFloat(inch) || 0)
        : NaN;
  const valid = Number.isFinite(heightCm) && heightCm >= 120 && heightCm <= 230;

  const setUnits = (units: Units) => patch({ units });

  return (
    <StepShell question="How tall are you?">
      <div className="flex rounded-full bg-secondary p-1" role="tablist" aria-label="Height units">
        {(
          [
            { value: "metric", label: "cm" },
            { value: "imperial", label: "ft / in" },
          ] as Array<{ value: Units; label: string }>
        ).map((u) => (
          <button
            key={u.value}
            type="button"
            role="tab"
            aria-selected={answers.units === u.value}
            onClick={() => setUnits(u.value)}
            className={`h-11 flex-1 rounded-full text-label transition-all duration-fast active:scale-[0.97] ${
              answers.units === u.value
                ? "bg-card text-foreground shadow-card"
                : "text-muted-foreground"
            }`}
          >
            {u.label}
          </button>
        ))}
      </div>

      {answers.units === "metric" ? (
        <NumberField value={cm} onChange={setCm} unit="cm" placeholder="170" ariaLabel="Height in centimeters" />
      ) : (
        <div className="flex gap-3">
          <NumberField value={ft} onChange={setFt} unit="ft" placeholder="5" ariaLabel="Height feet" className="flex-1" />
          <NumberField value={inch} onChange={setInch} unit="in" placeholder="7" ariaLabel="Height inches" className="flex-1" />
        </div>
      )}

      <PrimaryButton
        disabled={!valid}
        onClick={() => {
          patch({ heightCm: Math.round(heightCm * 10) / 10 });
          next();
        }}
      >
        Continue
      </PrimaryButton>
    </StepShell>
  );
}

/* ── Step 7 — Current weight ──────────────────────────────────── */

function WeightStep({ answers, patch, next }: StepProps) {
  const unit = weightUnit(answers.units);
  const [value, setValue] = useState(
    answers.weightKg !== undefined ? String(displayWeight(answers.weightKg, answers.units)) : "",
  );
  const kg = toKg(parseFloat(value), answers.units);
  const valid = Number.isFinite(kg) && kg >= 30 && kg <= 300;

  return (
    <StepShell question="What's your current weight?">
      <NumberField
        value={value}
        onChange={setValue}
        unit={unit}
        placeholder={answers.units === "imperial" ? "154" : "70"}
        autoFocus
        ariaLabel={`Current weight in ${unit}`}
      />
      <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        Thanks — this stays private, always.
      </p>
      <PrimaryButton
        disabled={!valid}
        onClick={() => {
          patch({ weightKg: Math.round(kg * 10) / 10 });
          next();
        }}
      >
        Continue
      </PrimaryButton>
    </StepShell>
  );
}

/* ── Step 8 — Activity level ──────────────────────────────────── */

function ActivityStep({ answers, patch, next }: StepProps) {
  return (
    <AutoChoiceStep<Activity>
      question="Outside of workouts, how active is your typical day?"
      info="We count deliberate exercise separately — this is about your baseline."
      choices={[
        { value: "sedentary", label: "Mostly sitting", sub: "Desk job, driving" },
        { value: "lightly_active", label: "On my feet some of the day", sub: "Teaching, retail" },
        { value: "moderately_active", label: "Active most of the day", sub: "Nursing, trades, delivery" },
        { value: "very_active", label: "Very physically demanding work" },
      ]}
      value={answers.activity}
      onPick={(activity) => patch({ activity })}
      next={next}
    />
  );
}

/* ── Step 9 — Exercise frequency ──────────────────────────────── */

function ExerciseStep({ answers, patch, next }: StepProps) {
  return (
    <AutoChoiceStep<ExerciseDays>
      question="How many days a week do you exercise on purpose?"
      choices={[
        { value: "0-1", label: "0–1" },
        { value: "2-3", label: "2–3", affirmation: "That's a solid base — consistency beats intensity." },
        { value: "4-5", label: "4–5" },
        { value: "6+", label: "6+" },
      ]}
      value={answers.exerciseDays}
      onPick={(exerciseDays) => patch({ exerciseDays })}
      next={next}
    />
  );
}

/* ── Step 10 — Goal weight (guardrailed) ──────────────────────── */

function GoalWeightStep({ answers, patch, next }: StepProps) {
  const unit = weightUnit(answers.units);
  const [value, setValue] = useState(
    answers.goalWeightKg !== undefined
      ? String(displayWeight(answers.goalWeightKg, answers.units))
      : "",
  );
  const kg = toKg(parseFloat(value), answers.units);
  const valid = Number.isFinite(kg) && kg >= 30 && kg <= 300;

  const issue =
    valid && answers.weightKg !== undefined && answers.heightCm !== undefined
      ? checkGoalWeight(answers.weightKg, answers.heightCm, kg)
      : null;

  const deltaKg = valid && answers.weightKg !== undefined ? kg - answers.weightKg : 0;
  const realistic = valid && !issue && Math.abs(deltaKg) >= 0.5;

  return (
    <StepShell question="What weight are you aiming for?">
      <NumberField
        value={value}
        onChange={setValue}
        unit={unit}
        placeholder={answers.units === "imperial" ? "143" : "65"}
        autoFocus
        ariaLabel={`Goal weight in ${unit}`}
      />

      {issue &&
        (() => {
          // Ceil in display units so the value we advertise always clears the
          // guardrail (rounding down could leave the goal still blocked).
          const suggested = Math.ceil(displayWeight(issue.suggestedKg, answers.units));
          return (
            <div className="animate-fade-rise space-y-3 rounded-control bg-warning-soft px-4 py-3">
              <p className="text-label text-warning">
                Let's aim for {suggested} {unit} first — you can set a new goal when you get there.
              </p>
              <button
                type="button"
                onClick={() => setValue(String(suggested))}
                className="flex h-11 items-center rounded-control bg-card px-4 text-label text-foreground shadow-card transition-transform duration-instant active:scale-[0.97]"
              >
                Use {suggested} {unit}
              </button>
            </div>
          );
        })()}

      {realistic && (
        <AffirmationBanner>
          {deltaKg < 0 ? "Losing" : "Gaining"} {formatWeight(Math.abs(deltaKg), answers.units, 1)} is
          a very achievable target.
        </AffirmationBanner>
      )}

      <PrimaryButton
        disabled={!valid || !!issue}
        onClick={() => {
          patch({ goalWeightKg: Math.round(kg * 10) / 10 });
          next();
        }}
      >
        Continue
      </PrimaryButton>
    </StepShell>
  );
}

/* ── Step 11 — Pace (recommended band + live projection) ──────── */

function PaceStep({ answers, patch, next }: StepProps) {
  const selected: Pace = answers.pace ?? "steady";

  const choices: Array<Choice<Pace>> = (
    [
      { value: "gentle" as Pace, label: "Gentle", sub: "about 0.25 kg (0.5 lb) per week" },
      { value: "steady" as Pace, label: "Steady", sub: "about 0.5 kg (1 lb) per week", badge: "Recommended" },
      { value: "ambitious" as Pace, label: "Ambitious", sub: "about 0.75 kg (1.5 lb) per week" },
    ]
  ).map((c) =>
    paceUnavailable(c.value, answers)
      ? { ...c, disabled: true, note: "Not available — this pace would cut deeper than 35% of your daily burn." }
      : c,
  );

  const projection = useMemo(() => {
    if (answers.weightKg === undefined || answers.goalWeightKg === undefined) return null;
    return projectionDate(answers.weightKg, answers.goalWeightKg, selected);
  }, [answers.weightKg, answers.goalWeightKg, selected]);

  return (
    <StepShell question="How fast do you want to get there?">
      <div className="space-y-2">
        {choices.map((c) => (
          <OptionCard
            key={c.value}
            label={c.label}
            sub={c.sub}
            note={c.note}
            badge={c.badge}
            selected={selected === c.value}
            disabled={c.disabled}
            onClick={() => patch({ pace: c.value })}
          />
        ))}
      </div>

      {projection && answers.goalWeightKg !== undefined && (
        <p className="flex animate-fade-rise items-center gap-2 text-label text-foreground">
          <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
          You'd reach {formatWeight(answers.goalWeightKg, answers.units, 0)} around{" "}
          {formatLongDate(projection)}.
        </p>
      )}

      <PrimaryButton
        onClick={() => {
          if (answers.pace === undefined) patch({ pace: selected });
          next();
        }}
      >
        Continue
      </PrimaryButton>
    </StepShell>
  );
}

/* ── Step 12 — Food style + context ───────────────────────────── */

const FOOD_CONTEXT_OPTIONS: Array<{ value: FoodContext; label: string }> = [
  { value: "home_cooked", label: "I mostly eat home-cooked Indian food" },
  { value: "eat_out", label: "I eat out / order in a lot" },
  { value: "none", label: "None of these" },
];

function FoodStep({ answers, patch, next }: StepProps) {
  const style = answers.foodStyle;
  const ctx = answers.foodContext ?? [];

  const toggleCtx = (v: FoodContext) => {
    let out: FoodContext[];
    if (v === "none") out = ctx.includes("none") ? [] : ["none"];
    else if (ctx.includes(v)) out = ctx.filter((c) => c !== v);
    else out = [...ctx.filter((c) => c !== "none"), v];
    patch({ foodContext: out });
  };

  return (
    <StepShell question="How do you usually eat?">
      <div className="space-y-2">
        {(
          [
            { value: "vegetarian", label: "Vegetarian" },
            { value: "eggetarian", label: "Eggetarian" },
            { value: "non_vegetarian", label: "Non-vegetarian" },
            { value: "vegan", label: "Vegan" },
          ] as Array<{ value: FoodStyle; label: string }>
        ).map((c) => (
          <OptionCard
            key={c.value}
            label={c.label}
            selected={style === c.value}
            onClick={() => patch({ foodStyle: c.value })}
          />
        ))}
      </div>

      {style && (
        <div className="animate-fade-rise space-y-2">
          <p className="text-label text-secondary-text">Any of these apply? (optional)</p>
          {FOOD_CONTEXT_OPTIONS.map((c) => (
            <OptionCard
              key={c.value}
              label={c.label}
              selected={ctx.includes(c.value)}
              onClick={() => toggleCtx(c.value)}
            />
          ))}
        </div>
      )}

      <PrimaryButton
        disabled={!style}
onClick={next}
      >
        Continue
      </PrimaryButton>
    </StepShell>
  );
}

/* ── Step 13 — Biggest obstacle ───────────────────────────────── */

function ObstacleStep({ answers, patch, next }: StepProps) {
  return (
    <AutoChoiceStep<Obstacle>
      question="What's made this hard in the past?"
      choices={[
        { value: "chore", label: "Logging felt like a chore" },
        { value: "eating_out", label: "Eating out and social meals" },
        { value: "late_night", label: "Late-night snacking" },
        {
          value: "motivation",
          label: "Losing motivation after a bad week",
          affirmation:
            "Then you should know: one heavy day never breaks your plan here. We look at your week, not your worst day.",
        },
        { value: "new", label: "Nothing yet — I'm new to this" },
      ]}
      value={answers.obstacle}
      onPick={(obstacle) => patch({ obstacle })}
      next={next}
    />
  );
}

/* ── Step 14A — Expectations (trust screen, no input) ─────────── */

function ExpectationsStep({ next }: StepProps) {
  return (
    <div className="animate-fade-rise space-y-6">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-primary-soft">
        <Scale className="h-6 w-6 text-primary" strokeWidth={1.75} />
      </div>
      <h1 className="text-title text-foreground">Real talk: the scale often doesn't move in week one.</h1>
      <p className="text-body text-secondary-text">
        Water weight hides fat loss. Give it 14 days of honest logging and the trend will show.
        We'll never shame you for a number.
      </p>
      <PrimaryButton onClick={next}>Got it</PrimaryButton>
    </div>
  );
}

/* ── Step 14B — Notification primer ───────────────────────────── */

function NotificationsStep({ patch, next }: StepProps) {
  const schedule = useAdvanceTimer(next);

  const answer = (reminders: boolean) => {
    patch({ reminders });
    if (reminders && typeof Notification !== "undefined" && Notification.permission === "default") {
      // Only a "Yes" triggers the browser permission prompt (IA step 14).
      void Notification.requestPermission().catch(() => undefined);
    }
    schedule(250);
  };

  return (
    <StepShell
      question="Want a nudge at your usual meal times?"
      info="People with reminders log about twice as consistently. Max one reminder + one insight a day — and they stop when you've already logged."
    >
      <div className="space-y-2">
        <OptionCard label="Yes, remind me" onClick={() => answer(true)} />
        <OptionCard label="No thanks" onClick={() => answer(false)} />
      </div>
    </StepShell>
  );
}

/* ── Registry ─────────────────────────────────────────────────── */

export const STEP_COMPONENTS: Record<StepId, (props: StepProps) => JSX.Element> = {
  goal: GoalStep,
  experience: ExperienceStep,
  discovery: DiscoveryStep,
  sex: SexStep,
  age: AgeStep,
  height: HeightStep,
  weight: WeightStep,
  activity: ActivityStep,
  exercise: ExerciseStep,
  goalWeight: GoalWeightStep,
  pace: PaceStep,
  food: FoodStep,
  obstacle: ObstacleStep,
  expectations: ExpectationsStep,
  notifications: NotificationsStep,
};
