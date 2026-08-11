// ScanReviewSheet — THE review surface shared by /scan and /describe.
// Per-item editable rows (name, quantity stepper rescaling from base), kcal
// count-up, confidence badges, add-item mini form, segmented total bar,
// meal-type pills, date row, hint/re-analyze, save via useLogMeal.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Coffee,
  Droplets,
  Cookie,
  Minus,
  Moon,
  Plus,
  RefreshCw,
  Sparkles,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react";
import { Shimmer, Surface, TimeField, useCountUp } from "@/components/system";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLogMeal, useLogWater } from "@/hooks/useMutations";
import { dayKey, formatTime, friendlyDay, isToday, parseDayKey, suggestedMealType } from "@/lib/dates";
import type { DraftItem, LogSource, MacroSet, MealType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/system";

/* ── helpers ─────────────────────────────────────────────────── */

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Non-destructive rescale: display macros = immutable base × quantity. */
function rescale(item: DraftItem, quantity: number): DraftItem {
  // Quantity keeps 2-decimal precision — rounding it to 1dp would corrupt 0.25 steps
  // (1.25 → 1.3). Macro *values* still display at 1dp.
  const q = Math.max(0.25, Math.round(quantity * 100) / 100);
  const b = item.base;
  return {
    ...item,
    quantity: q,
    calories: r1((b.calories ?? 0) * q),
    protein: r1((b.protein ?? 0) * q),
    carbs: r1((b.carbs ?? 0) * q),
    fat: r1((b.fat ?? 0) * q),
    fiber: b.fiber !== undefined ? r1(b.fiber * q) : undefined,
    sugar: b.sugar !== undefined ? r1(b.sugar * q) : undefined,
    sodium: b.sodium !== undefined ? r1(b.sodium * q) : undefined,
  };
}

function sumTotals(items: DraftItem[]): MacroSet {
  return items.reduce<MacroSet>(
    (acc, it) => ({
      calories: acc.calories + (it.calories ?? 0),
      protein: acc.protein + (it.protein ?? 0),
      carbs: acc.carbs + (it.carbs ?? 0),
      fat: acc.fat + (it.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

const MEAL_TYPES: Array<{ value: MealType; label: string; icon: LucideIcon }> = [
  { value: "breakfast", label: "Breakfast", icon: Coffee },
  { value: "lunch", label: "Lunch", icon: Sun },
  { value: "dinner", label: "Dinner", icon: Moon },
  { value: "snack", label: "Snack", icon: Cookie },
];

/* ── confidence badge ────────────────────────────────────────── */

function ConfidenceBadge({ confidence }: { confidence?: number }) {
  if (confidence === undefined) return null;
  const tier =
    confidence >= 75
      ? { label: "High", text: "text-confidence-high", bg: "bg-success-soft" }
      : confidence >= 45
        ? { label: "Med", text: "text-confidence-med", bg: "bg-warning-soft" }
        : { label: "Low", text: "text-confidence-low", bg: "bg-muted" };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-micro uppercase", tier.text, tier.bg)}>
      {tier.label}
    </span>
  );
}

/* ── one item row ────────────────────────────────────────────── */

interface ItemRowProps {
  item: DraftItem;
  index: number;
  onChange: (item: DraftItem) => void;
  onRemove: (id: string) => void;
}

function ItemRow({ item, index, onChange, onRemove }: ItemRowProps) {
  const kcal = useCountUp(Math.round(item.calories ?? 0), 500);

  return (
    <Surface
      className="animate-fade-rise p-4"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={item.name}
            aria-label="Food name"
            onChange={(e) => onChange({ ...item, name: e.target.value })}
            className="w-full border-b border-transparent bg-transparent py-1 text-body font-semibold text-foreground focus:border-primary focus:outline-none"
          />
          <div className="mt-0.5 flex items-center gap-2">
            <span className="truncate text-caption text-muted-foreground">{item.portion}</span>
            <ConfidenceBadge confidence={item.confidence} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-heading font-bold tabular-nums text-foreground">{kcal}</span>
            <span className="text-caption text-muted-foreground">kcal</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 tabular-nums">
            <span className="text-caption text-protein">{Math.round(item.protein ?? 0)}P</span>
            <span className="text-caption text-carbs">{Math.round(item.carbs ?? 0)}C</span>
            <span className="text-caption text-fat">{Math.round(item.fat ?? 0)}F</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        {/* quantity stepper — 0.25 steps, min 0.25, rescales from base */}
        <div className="flex items-center rounded-full border border-border">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={item.quantity <= 0.25}
            onClick={() => onChange(rescale(item, item.quantity - 0.25))}
            className="grid h-11 w-11 place-items-center rounded-full text-foreground transition-transform duration-instant active:scale-[0.92] disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-12 text-center font-display text-label font-medium tabular-nums text-foreground">
            {item.quantity}×
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => onChange(rescale(item, item.quantity + 0.25))}
            className="grid h-11 w-11 place-items-center rounded-full text-foreground transition-transform duration-instant active:scale-[0.92]"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          aria-label={`Remove ${item.name}`}
          onClick={() => onRemove(item.id)}
          className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-transform duration-instant active:scale-[0.92]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </Surface>
  );
}

/* ── add item mini form ──────────────────────────────────────── */

interface AddItemFormState {
  name: string;
  kcal: string;
  p: string;
  c: string;
  f: string;
}

function AddItemRow({
  initialName,
  autoOpen,
  onAdd,
}: {
  initialName?: string;
  autoOpen?: boolean;
  onAdd: (item: DraftItem) => void;
}) {
  const [open, setOpen] = useState(!!autoOpen);
  const [form, setForm] = useState<AddItemFormState>({
    name: initialName ?? "",
    kcal: "",
    p: "",
    c: "",
    f: "",
  });

  const set = (key: keyof AddItemFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const valid = form.name.trim().length > 0 && Number(form.kcal) > 0;

  const submit = () => {
    if (!valid) return;
    const base: MacroSet = {
      calories: Math.max(0, Number(form.kcal) || 0),
      protein: Math.max(0, Number(form.p) || 0),
      carbs: Math.max(0, Number(form.c) || 0),
      fat: Math.max(0, Number(form.f) || 0),
    };
    onAdd({
      id: crypto.randomUUID(),
      name: form.name.trim(),
      portion: "1 serving",
      quantity: 1,
      base,
      ...base,
    });
    setForm({ name: "", kcal: "", p: "", c: "", f: "" });
    setOpen(false);
  };

  const numInput =
    "h-11 w-full rounded-control border border-input bg-card px-3 text-body text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-ring";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-card border border-dashed border-border-strong text-label text-secondary-text transition-transform duration-instant active:scale-[0.97]"
      >
        <Plus className="h-4 w-4" />
        Add item
      </button>
    );
  }

  return (
    <Surface className="animate-fade-rise p-4">
      <div className="flex items-center justify-between">
        <p className="text-label font-medium text-foreground">Add an item</p>
        <button
          type="button"
          aria-label="Close add item"
          onClick={() => setOpen(false)}
          className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-transform duration-instant active:scale-[0.92]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-2 space-y-2">
        <input
          type="text"
          placeholder="Name (e.g. Plain curd)"
          value={form.name}
          onChange={set("name")}
          className="h-11 w-full rounded-control border border-input bg-card px-3 text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="grid grid-cols-4 gap-2">
          <div>
            <input type="number" min={0} inputMode="numeric" placeholder="0" value={form.kcal} onChange={set("kcal")} className={numInput} aria-label="Calories" />
            <p className="mt-1 text-center text-micro uppercase text-muted-foreground">kcal</p>
          </div>
          <div>
            <input type="number" min={0} inputMode="numeric" placeholder="0" value={form.p} onChange={set("p")} className={numInput} aria-label="Protein grams" />
            <p className="mt-1 text-center text-micro uppercase text-protein">P g</p>
          </div>
          <div>
            <input type="number" min={0} inputMode="numeric" placeholder="0" value={form.c} onChange={set("c")} className={numInput} aria-label="Carbs grams" />
            <p className="mt-1 text-center text-micro uppercase text-carbs">C g</p>
          </div>
          <div>
            <input type="number" min={0} inputMode="numeric" placeholder="0" value={form.f} onChange={set("f")} className={numInput} aria-label="Fat grams" />
            <p className="mt-1 text-center text-micro uppercase text-fat">F g</p>
          </div>
        </div>
        <button
          type="button"
          disabled={!valid}
          onClick={submit}
          className="h-11 w-full rounded-control bg-primary text-label font-medium text-primary-foreground transition-transform duration-instant active:scale-[0.92] disabled:opacity-40"
        >
          Add to meal
        </button>
      </div>
    </Surface>
  );
}

/* ── loading skeleton (Describe inline loading + re-analyze) ─── */

export function ReviewSheetSkeleton({ withPhoto = false }: { withPhoto?: boolean }) {
  return (
    <div className="space-y-3">
      {withPhoto && <Shimmer className="h-44 w-full rounded-card" />}
      <Shimmer className="h-28 w-full rounded-card" />
      <Shimmer className="h-28 w-full rounded-card" />
      <Shimmer className="h-24 w-full rounded-card" />
      <div className="flex gap-2">
        <Shimmer className="h-11 flex-1 rounded-full" />
        <Shimmer className="h-11 flex-1 rounded-full" />
        <Shimmer className="h-11 flex-1 rounded-full" />
        <Shimmer className="h-11 flex-1 rounded-full" />
      </div>
      <Shimmer className="h-12 w-full rounded-control" />
    </div>
  );
}

/* ── the sheet ───────────────────────────────────────────────── */

export interface ScanReviewSheetProps {
  /** Result of the analysis. Re-synced whenever `analysisId` changes. */
  initialItems: DraftItem[];
  /** Bump to push fresh items into the sheet (re-analysis) without losing meal type/date. */
  analysisId?: string | number;
  source: LogSource;
  /** Local dataURL preview shown at the top (Scan). Describe passes nothing. */
  photoPreview?: string | null;
  /** Awaited at save time — resolves the uploaded storage URL (or null). */
  resolveImageUrl?: () => Promise<string | null>;
  /** Preset day from ?date=<key> navigation. */
  presetDayKey?: string | null;
  /**
   * Re-run analysis. Photo mode re-sends the cached image (deployed analyze-food
   * accepts only { imageBase64 } — no hint). Text mode gets the hint string.
   */
  onReanalyze?: (hint: string) => void;
  /** True while a re-analysis is in flight — item rows show skeletons. */
  reanalyzing?: boolean;
  /** Whether the deployed API can use a typed hint (text mode only). */
  hintEnabled?: boolean;
  /** Pre-fill for the manual add form when items are empty (parse-fail fallback). */
  initialManualName?: string;
}

export function ScanReviewSheet({
  initialItems,
  analysisId = 0,
  source,
  photoPreview,
  resolveImageUrl,
  presetDayKey,
  onReanalyze,
  reanalyzing = false,
  hintEnabled = false,
  initialManualName,
}: ScanReviewSheetProps) {
  const navigate = useNavigate();
  const logMeal = useLogMeal();
  const logWater = useLogWater();

  const [items, setItems] = useState<DraftItem[]>(initialItems);
  const [mealType, setMealType] = useState<MealType>(() => suggestedMealType());
  const [dateKey, setDateKey] = useState<string>(() => {
    if (presetDayKey && /^\d{4}-\d{2}-\d{2}$/.test(presetDayKey)) return presetDayKey;
    return dayKey(new Date());
  });
  const [dateOpen, setDateOpen] = useState(false);
  // Logging time: now for today, midday for a past day. Editable below the date.
  const [loggedTime, setLoggedTime] = useState<Date>(() => {
    const base = presetDayKey && !isToday(presetDayKey) ? parseDayKey(presetDayKey) : new Date();
    if (presetDayKey && !isToday(presetDayKey)) base.setHours(12, 0, 0, 0);
    return base;
  });
  const [logHydration, setLogHydration] = useState(true);
  const [hint, setHint] = useState("");
  const [saving, setSaving] = useState(false);

  // Fresh analysis results replace the rows but keep meal type/date choices.
  const lastAnalysisId = useRef(analysisId);
  useEffect(() => {
    if (lastAnalysisId.current !== analysisId) {
      lastAnalysisId.current = analysisId;
      setItems(initialItems);
    }
  }, [analysisId, initialItems]);

  // The time control only carries hours/minutes — re-anchor it whenever the day changes.
  useEffect(() => {
    setLoggedTime((prev) => {
      const day = parseDayKey(dateKey);
      const next = new Date(day);
      next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
      if (isToday(dateKey) && next.getTime() > Date.now()) return new Date();
      return next;
    });
  }, [dateKey]);

  const totals = useMemo(() => sumTotals(items), [items]);

  // Hydration detected by the analysis (chia water, coffee, soup…), scaled by quantity.
  const waterMl = useMemo(
    () => Math.round(items.reduce((sum, it) => sum + (it.waterMl ?? 0) * (it.quantity || 1), 0)),
    [items],
  );
  const totalKcal = useCountUp(Math.round(totals.calories));

  // Segmented macro bar by kcal share (P/C ×4, F ×9)
  const pKcal = totals.protein * 4;
  const cKcal = totals.carbs * 4;
  const fKcal = totals.fat * 9;
  const macroKcal = pKcal + cKcal + fKcal;

  const confidences = items.map((i) => i.confidence).filter((c): c is number => c !== undefined);
  const avgConfidence =
    confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : null;
  const lowConfidence = avgConfidence !== null && avgConfidence < 50;

  const updateItem = (next: DraftItem) =>
    setItems((prev) => prev.map((it) => (it.id === next.id ? next : it)));
  const removeItem = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));

  const handleSave = async () => {
    if (items.length === 0 || saving || logMeal.isPending) return;
    setSaving(true);
    let imageUrl: string | undefined;
    try {
      if (resolveImageUrl) imageUrl = (await resolveImageUrl()) ?? undefined;
    } catch {
      imageUrl = undefined; // meal still saves without its photo
    }
    logMeal.mutate(
      { items, mealType, dayKey: dateKey, source, imageUrl, time: loggedTime },
      {
        onSuccess: () => {
          if (logHydration && waterMl > 0) {
            logWater.mutate({ dayKey: dateKey, deltaMl: waterMl });
          }
          navigate(isToday(dateKey) ? "/" : `/log?date=${dateKey}`);
        },
        onSettled: () => setSaving(false),
      },
    );
  };

  const busy = saving || logMeal.isPending;

  return (
    <div className="space-y-3 pb-32">
      {/* Photo settles into its card */}
      {photoPreview && (
        <div className="animate-fade-rise overflow-hidden rounded-card border border-border shadow-card">
          <img src={photoPreview} alt="Your meal" className="h-44 w-full object-cover" />
        </div>
      )}

      {/* Items cascade in */}
      {reanalyzing ? (
        <div className="space-y-3">
          <Shimmer className="h-28 w-full rounded-card" />
          <Shimmer className="h-28 w-full rounded-card" />
        </div>
      ) : (
        <>
          {items.map((item, i) => (
            <ItemRow key={item.id} item={item} index={i} onChange={updateItem} onRemove={removeItem} />
          ))}
          <AddItemRow
            initialName={items.length === 0 ? initialManualName : undefined}
            autoOpen={items.length === 0}
            onAdd={(item) => setItems((prev) => [...prev, item])}
          />
        </>
      )}

      {/* Low-confidence hint / honest re-analyze */}
      {lowConfidence && onReanalyze && !reanalyzing && (
        <Surface className="animate-fade-rise p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-label font-medium text-foreground">Give these a quick check</p>
          </div>
          {hintEnabled ? (
            <>
              <input
                type="text"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="Add a hint (e.g. 'cooked in 2 tsp oil')"
                className="mt-2 h-11 w-full rounded-control border border-input bg-card px-3 text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                disabled={hint.trim().length === 0}
                onClick={() => onReanalyze(hint.trim())}
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-control bg-primary text-label font-medium text-primary-foreground transition-transform duration-instant active:scale-[0.92] disabled:opacity-40"
              >
                <RefreshCw className="h-4 w-4" />
                Re-analyze with hint
              </button>
            </>
          ) : (
            <>
              <p className="mt-1 text-caption text-muted-foreground">
                We weren't fully sure about this plate. Adjust the rows above, or read the photo again.
              </p>
              <button
                type="button"
                onClick={() => onReanalyze("")}
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-control border border-border bg-card text-label font-medium text-secondary-text transition-transform duration-instant active:scale-[0.92]"
              >
                <RefreshCw className="h-4 w-4" />
                Re-scan photo
              </button>
            </>
          )}
        </Surface>
      )}

      {/* Total bar: display-md kcal + segmented macro bar */}
      <Surface className="p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-label text-secondary-text">Total</span>
          <div className="flex items-baseline gap-1">
            <span className="text-display-md tabular-nums text-foreground">{totalKcal}</span>
            <span className="text-caption text-muted-foreground">kcal</span>
          </div>
        </div>
        <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-calories-track">
          {macroKcal > 0 && (
            <>
              <div className="h-full bg-protein transition-[width] duration-expressive ease-out" style={{ width: `${(pKcal / macroKcal) * 100}%` }} />
              <div className="h-full bg-carbs transition-[width] duration-expressive ease-out" style={{ width: `${(cKcal / macroKcal) * 100}%` }} />
              <div className="h-full bg-fat transition-[width] duration-expressive ease-out" style={{ width: `${(fKcal / macroKcal) * 100}%` }} />
            </>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3 tabular-nums">
          <span className="text-caption text-protein">P {Math.round(totals.protein)}g</span>
          <span className="text-caption text-carbs">C {Math.round(totals.carbs)}g</span>
          <span className="text-caption text-fat">F {Math.round(totals.fat)}g</span>
        </div>
      </Surface>

      {/* Meal type pills — auto-applied from time of day, editable */}
      <div className="flex gap-2">
        {MEAL_TYPES.map(({ value, label, icon: Icon }) => {
          const selected = mealType === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => setMealType(value)}
              className={cn(
                "flex h-11 min-w-[44px] flex-1 items-center justify-center gap-1.5 rounded-full border text-label transition-transform duration-instant active:scale-[0.92]",
                selected
                  ? "border-primary bg-primary font-medium text-primary-foreground"
                  : "border-border bg-card text-secondary-text",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden min-[380px]:inline">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Date row — defaults now; preset from ?date= */}
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-12 w-full items-center gap-3 rounded-card border border-border bg-card px-4 shadow-card transition-transform duration-instant active:scale-[0.97]"
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-secondary-text" />
            <span className="text-label font-medium text-foreground">{friendlyDay(dateKey)}</span>
            <span className="ml-auto text-caption text-muted-foreground">{formatTime(loggedTime.toISOString())}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-auto rounded-card border-border bg-popover p-0 shadow-raised">
          <Calendar
            mode="single"
            selected={parseDayKey(dateKey)}
            onSelect={(d) => {
              if (d) {
                setDateKey(dayKey(d));
                setDateOpen(false);
              }
            }}
            disabled={(d) => d.getTime() > Date.now()}
          />
        </PopoverContent>
      </Popover>

      {/* Time of day — defaults to now (midday on past days) */}
      <TimeField
        value={loggedTime}
        onChange={setLoggedTime}
        max={isToday(dateKey) ? new Date() : undefined}
        label="Logged at"
      />

      {/* Hydration detected in the analysis — counted toward water unless turned off */}
      {waterMl > 0 && (
        <button
          type="button"
          role="switch"
          aria-checked={logHydration}
          onClick={() => setLogHydration((v) => !v)}
          className="flex w-full items-center gap-3 rounded-card border border-border bg-card px-4 py-3 text-left transition-transform duration-instant active:scale-[0.97]"
        >
          <Droplets className="h-4 w-4 shrink-0 text-water" />
          <span className="min-w-0 flex-1">
            <span className="block text-label font-medium text-foreground">
              Add {waterMl} ml to water
            </span>
            <span className="block text-caption text-muted-foreground">
              Detected hydration from these items
            </span>
          </span>
          <span
            className={cn(
              "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-instant",
              logHydration ? "border-primary bg-primary" : "border-border bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-card transition-transform duration-instant",
                logHydration ? "translate-x-[22px]" : "translate-x-0.5",
              )}
              style={{ height: 18, width: 18 }}
            />
          </span>
        </button>
      )}

      {/* Sticky save */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-background/90 pb-safe backdrop-blur">
        <div className="mx-auto w-full max-w-md px-4 pb-4 pt-2">
          <button
            type="button"
            disabled={items.length === 0 || busy || reanalyzing}
            onClick={handleSave}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-control bg-primary text-body font-semibold text-primary-foreground shadow-raised transition-transform duration-instant active:scale-[0.92] disabled:opacity-40"
          >
            {busy ? (
              <>
                <Spinner size={18} />
                Saving
              </>
            ) : (
              <span className="tabular-nums">
                Log meal · {Math.round(totals.calories)} kcal
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
