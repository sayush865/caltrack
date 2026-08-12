// Meal detail / edit (/meal/:mealId?date=YYYY-MM-DD).
// mealId is either a LogMeta.mealId (group of rows) or "solo-<rowId>" for rows
// logged without one. NON-DESTRUCTIVE editing: base (per-1x) nutrition is
// inferred once (base = stored macros / meta.quantity) and every edit recomputes
// display = base × quantity — base itself is never overwritten.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CalendarDays, Minus, Plus, SearchX, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, PageHeader, Shimmer, Surface } from "@/components/system";
import { useAddMealItem, useDeleteMeal, useSaveMealEdits, type FoodLogRowUpdate } from "@/components/diary";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDay } from "@/hooks/useDay";
import { useDeleteLog } from "@/hooks/useMutations";
import { dayKey, friendlyDay, localDayEnd, parseDayKey } from "@/lib/dates";
import { parseLogMeta, type FoodLogRow, type LogMeta, type MacroSet, type MealType } from "@/lib/types";
import { cn } from "@/lib/utils";

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MEAL_TYPES: Array<{ value: MealType; label: string }> = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];
const QTY_STEP = 0.5;
const QTY_MIN = 0.5;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

interface EditItem {
  rowId: string;
  name: string;
  portion: string;
  quantity: number;
  base: MacroSet; // inferred per-1x nutrition — immutable
  meta: LogMeta | null;
}

function rowToEditItem(row: FoodLogRow): EditItem {
  const meta = parseLogMeta(row.notes);
  const q = meta?.quantity && meta.quantity > 0 ? meta.quantity : 1;
  return {
    rowId: row.id,
    name: row.food_name ?? "Logged food",
    portion: meta?.portion ?? "1 serving",
    quantity: q,
    base: {
      calories: (row.calories ?? 0) / q,
      protein: (row.protein ?? 0) / q,
      carbs: (row.carbs ?? 0) / q,
      fat: (row.fat ?? 0) / q,
      fiber: (row.fiber ?? 0) / q,
      sugar: (row.sugar ?? 0) / q,
      sodium: (row.sodium ?? 0) / q,
      vitaminA: (row.vitamin_a ?? 0) / q,
      vitaminC: (row.vitamin_c ?? 0) / q,
      calcium: (row.calcium ?? 0) / q,
      iron: (row.iron ?? 0) / q,
      vitaminB12: (row.vitamin_b12 ?? 0) / q,
      folate: (row.folate ?? 0) / q,
      vitaminD: (row.vitamin_d ?? 0) / q,
      zinc: (row.zinc ?? 0) / q,
      magnesium: (row.magnesium ?? 0) / q,
      potassium: (row.potassium ?? 0) / q,
    },
    meta,
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

const MACRO_CHIPS = [
  { key: "protein", letter: "P", dot: "bg-protein" },
  { key: "carbs", letter: "C", dot: "bg-carbs" },
  { key: "fat", letter: "F", dot: "bg-fat" },
] as const;

interface ItemSnapshot {
  name: string;
  quantity: number;
}

function MealDetailSkeleton() {
  return (
    <div className="space-y-3">
      <Shimmer className="h-44 w-full rounded-card" />
      <Shimmer className="h-28 w-full rounded-card" />
      <Shimmer className="h-28 w-full rounded-card" />
      <Shimmer className="h-14 w-full rounded-card" />
    </div>
  );
}

export default function MealDetail() {
  const { mealId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const dateKey = useMemo(() => {
    const param = searchParams.get("date");
    return param && DAY_KEY_RE.test(param) ? param : dayKey(new Date());
  }, [searchParams]);

  const soloRowId = mealId.startsWith("solo-") ? mealId.slice(5) : null;
  const groupId = soloRowId ?? mealId; // items added to a solo meal carry meta.mealId = original row id

  const dayQuery = useDay(dateKey);
  const saveEdits = useSaveMealEdits();
  const addItem = useAddMealItem();
  const deleteMeal = useDeleteMeal();
  const deleteLog = useDeleteLog();

  const rows = useMemo(() => {
    const all = dayQuery.data?.all ?? [];
    const matched = all.filter((r) => r.id === soloRowId || parseLogMeta(r.notes)?.mealId === groupId);
    // useDay orders desc; edit in chronological/logged order for stability
    return [...matched].reverse();
  }, [dayQuery.data, soloRowId, groupId]);

  /* ── Local edit state (initialized ONCE from the fetched rows) ── */
  const [initialized, setInitialized] = useState(false);
  const [items, setItems] = useState<EditItem[]>([]);
  const [mealType, setMealType] = useState<MealType>("snack");
  const [timeStr, setTimeStr] = useState("12:00");
  const [editDateKey, setEditDateKey] = useState(dateKey);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  // Manual "Add item" mini-form
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addKcal, setAddKcal] = useState("");
  const [addProtein, setAddProtein] = useState("");
  const [addCarbs, setAddCarbs] = useState("");
  const [addFat, setAddFat] = useState("");

  const initialRef = useRef<{
    items: Map<string, ItemSnapshot>;
    mealType: MealType;
    timeStr: string;
    dateKey: string;
  } | null>(null);

  useEffect(() => {
    if (initialized || rows.length === 0) return;
    const first = rows[0];
    const editItems = rows.map(rowToEditItem);
    const loggedAt = new Date(first.logged_at);
    const time = Number.isNaN(loggedAt.getTime()) ? "12:00" : `${pad2(loggedAt.getHours())}:${pad2(loggedAt.getMinutes())}`;
    const type = MEAL_TYPES.some((m) => m.value === first.meal_type) ? (first.meal_type as MealType) : "snack";

    setItems(editItems);
    setMealType(type);
    setTimeStr(time);
    setEditDateKey(dateKey);
    initialRef.current = {
      items: new Map(editItems.map((i) => [i.rowId, { name: i.name, quantity: i.quantity }])),
      mealType: type,
      timeStr: time,
      dateKey,
    };
    setInitialized(true);
  }, [rows, initialized, dateKey]);

  const imageUrl = rows.find((r) => r.image_url)?.image_url ?? null;

  const initial = initialRef.current;
  const groupChanged =
    !!initial && (initial.mealType !== mealType || initial.timeStr !== timeStr || initial.dateKey !== editDateKey);
  const changedItems = items.filter((i) => {
    const snap = initial?.items.get(i.rowId);
    return !snap || snap.name !== i.name || snap.quantity !== i.quantity;
  });
  const dirty = initialized && (groupChanged || changedItems.length > 0);

  const totalCalories = Math.round(
    items.reduce((sum, i) => sum + (i.base.calories ?? 0) * i.quantity, 0),
  );

  const updateItem = (rowId: string, patch: Partial<Pick<EditItem, "name" | "quantity">>) => {
    setItems((prev) => prev.map((i) => (i.rowId === rowId ? { ...i, ...patch } : i)));
  };

  const buildLoggedAtISO = (): string => {
    const [h, m] = timeStr.split(":").map(Number);
    const d = parseDayKey(editDateKey);
    d.setHours(Number.isFinite(h) ? h : 12, Number.isFinite(m) ? m : 0, 0, 0);
    return d.toISOString();
  };

  /* ── Actions ─────────────────────────────────────────────────── */

  const save = () => {
    if (!dirty || saveEdits.isPending) return;
    const loggedAt = buildLoggedAtISO();
    const toUpdate = groupChanged ? items : changedItems;
    const updates: FoodLogRowUpdate[] = toUpdate.map((item) => {
      const q = item.quantity;
      const meta: LogMeta = {
        ...(item.meta ?? { v: 2 as const, source: "manual" as const }),
        quantity: q,
        portion: item.portion,
        // solo rows joined by an added item need the shared group id going forward
        mealId: item.meta?.mealId ?? (soloRowId ? groupId : undefined),
      };
      return {
        id: item.rowId,
        food_name: item.name.trim() || "Logged food",
        calories: round1((item.base.calories ?? 0) * q),
        protein: round1((item.base.protein ?? 0) * q),
        carbs: round1((item.base.carbs ?? 0) * q),
        fat: round1((item.base.fat ?? 0) * q),
        fiber: round1((item.base.fiber ?? 0) * q),
        sugar: round1((item.base.sugar ?? 0) * q),
        sodium: round1((item.base.sodium ?? 0) * q),
        vitamin_a: round1((item.base.vitaminA ?? 0) * q),
        vitamin_c: round1((item.base.vitaminC ?? 0) * q),
        calcium: round1((item.base.calcium ?? 0) * q),
        iron: round1((item.base.iron ?? 0) * q),
        vitamin_b12: round1((item.base.vitaminB12 ?? 0) * q),
        folate: round1((item.base.folate ?? 0) * q),
        vitamin_d: round1((item.base.vitaminD ?? 0) * q),
        zinc: round1((item.base.zinc ?? 0) * q),
        magnesium: round1((item.base.magnesium ?? 0) * q),
        potassium: round1((item.base.potassium ?? 0) * q),
        meal_type: mealType,
        logged_at: loggedAt,
        notes: JSON.stringify(meta),
      };
    });
    saveEdits.mutate(
      { updates, dayKeys: [dateKey, editDateKey] },
      {
        onSuccess: () => {
          toast.success("Meal updated");
          navigate(`/log?date=${editDateKey}`);
        },
      },
    );
  };

  const removeItem = (item: EditItem) => {
    deleteLog.mutate({ id: item.rowId, dayKey: dateKey, name: item.name });
    const remaining = items.filter((i) => i.rowId !== item.rowId);
    setItems(remaining);
    initialRef.current?.items.delete(item.rowId);
    if (remaining.length === 0) navigate(`/log?date=${dateKey}`);
  };

  const deleteAll = () => {
    setConfirmDeleteAll(false);
    deleteMeal.mutate(
      { ids: items.map((i) => i.rowId), dayKey: dateKey, name: items[0]?.name },
      { onSuccess: () => navigate(`/log?date=${dateKey}`) },
    );
  };

  const resetAddForm = () => {
    setAddOpen(false);
    setAddName("");
    setAddKcal("");
    setAddProtein("");
    setAddCarbs("");
    setAddFat("");
  };

  const submitAddItem = () => {
    const name = addName.trim();
    if (!name || addItem.isPending) return;
    const base: MacroSet = {
      calories: Math.max(0, Number(addKcal) || 0),
      protein: Math.max(0, Number(addProtein) || 0),
      carbs: Math.max(0, Number(addCarbs) || 0),
      fat: Math.max(0, Number(addFat) || 0),
    };
    addItem.mutate(
      { name, base, mealId: groupId, mealType, loggedAt: buildLoggedAtISO(), dayKey: editDateKey },
      {
        onSuccess: (row) => {
          const editItem = rowToEditItem(row);
          setItems((prev) => [...prev, editItem]);
          initialRef.current?.items.set(editItem.rowId, { name: editItem.name, quantity: editItem.quantity });
          toast.success(`Added ${name}`);
          resetAddForm();
        },
      },
    );
  };

  /* ── Render ──────────────────────────────────────────────────── */

  const notFound = !dayQuery.isLoading && !dayQuery.isError && rows.length === 0 && !initialized;

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader
        title="Edit meal"
        back
        action={
          initialized ? (
            <button
              type="button"
              aria-label="Delete meal"
              onClick={() => setConfirmDeleteAll(true)}
              className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-transform duration-instant hover:text-destructive active:scale-[0.92]"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          ) : undefined
        }
      />

      <main className="mx-auto max-w-md space-y-3 px-4 pt-2">
        {dayQuery.isLoading || (!initialized && !notFound && !dayQuery.isError) ? (
          <MealDetailSkeleton />
        ) : dayQuery.isError ? (
          <Surface className="flex flex-col items-center p-6 text-center">
            <p className="text-body text-secondary-text">Couldn't load this meal.</p>
            <button
              type="button"
              onClick={() => dayQuery.refetch()}
              className="mt-3 flex h-11 items-center justify-center rounded-control bg-primary px-5 text-label text-primary-foreground transition-transform duration-instant active:scale-[0.92]"
            >
              Retry
            </button>
          </Surface>
        ) : notFound ? (
          <EmptyState
            icon={SearchX}
            headline="Meal not found"
            copy="It may have been deleted, or it lives on a different day."
            action={{ label: "Back to diary", onClick: () => navigate(`/log?date=${dateKey}`) }}
          />
        ) : (
          <>
            {imageUrl && (
              <img src={imageUrl} alt="Meal photo" className="h-44 w-full rounded-card border border-border object-cover" />
            )}

            {/* Meal type pills */}
            <div className="flex gap-1.5">
              {MEAL_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMealType(value)}
                  className={cn(
                    "flex h-11 flex-1 items-center justify-center rounded-full text-label transition-transform duration-instant active:scale-[0.92]",
                    mealType === value
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-secondary-text",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Date + time */}
            <Surface className="flex items-center gap-2 p-3">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-11 flex-1 items-center gap-2 rounded-control border border-border px-3 transition-transform duration-instant active:scale-[0.97]"
                  >
                    <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-body text-foreground">{friendlyDay(editDateKey)}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto rounded-card border-border bg-card p-0 shadow-raised" align="start">
                  <Calendar
                    mode="single"
                    selected={parseDayKey(editDateKey)}
                    defaultMonth={parseDayKey(editDateKey)}
                    disabled={(date) => date > localDayEnd()}
                    onSelect={(date) => {
                      if (!date) return;
                      setEditDateKey(dayKey(date));
                      setCalendarOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value || timeStr)}
                aria-label="Meal time"
                className="h-11 shrink-0 rounded-control border border-border bg-card px-3 text-body text-foreground tabular-nums"
              />
            </Surface>

            {/* Item rows */}
            {items.map((item) => (
              <Surface key={item.rowId} className="space-y-2.5 p-3">
                <div className="flex items-center gap-1">
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(item.rowId, { name: e.target.value })}
                    aria-label="Food name"
                    className="h-11 flex-1 rounded-control border-border bg-card text-body text-foreground"
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => removeItem(item)}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground transition-transform duration-instant hover:text-destructive active:scale-[0.92]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      disabled={item.quantity <= QTY_MIN}
                      onClick={() =>
                        updateItem(item.rowId, { quantity: Math.max(QTY_MIN, round1(item.quantity - QTY_STEP)) })
                      }
                      className={cn(
                        "grid h-11 w-11 place-items-center rounded-full border border-border transition-transform duration-instant",
                        item.quantity <= QTY_MIN ? "text-text-disabled" : "text-foreground active:scale-[0.92]",
                      )}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-[72px] text-center text-label tabular-nums text-foreground">
                      {item.quantity}× {item.portion}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => updateItem(item.rowId, { quantity: round1(item.quantity + QTY_STEP) })}
                      className="grid h-11 w-11 place-items-center rounded-full border border-border text-foreground transition-transform duration-instant active:scale-[0.92]"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="font-display text-[17px] font-semibold tabular-nums text-foreground">
                    {Math.round((item.base.calories ?? 0) * item.quantity)} kcal
                  </span>
                </div>

                <div className="flex items-center gap-3 text-caption text-muted-foreground tabular-nums">
                  {MACRO_CHIPS.map(({ key, letter, dot }) => (
                    <span key={key} className="flex items-center gap-1">
                      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden="true" />
                      {round1((item.base[key] ?? 0) * item.quantity)}
                      {letter}
                    </span>
                  ))}
                </div>
              </Surface>
            ))}

            {/* Add item */}
            {addOpen ? (
              <Surface className="animate-fade-rise space-y-2 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-label text-foreground">Add an item</p>
                  <button
                    type="button"
                    aria-label="Close add item"
                    onClick={resetAddForm}
                    className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-transform duration-instant active:scale-[0.92]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Name — e.g. Buttered toast"
                  className="h-11 rounded-control border-border bg-card text-body"
                />
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: addKcal, set: setAddKcal, label: "kcal" },
                    { value: addProtein, set: setAddProtein, label: "P (g)" },
                    { value: addCarbs, set: setAddCarbs, label: "C (g)" },
                    { value: addFat, set: setAddFat, label: "F (g)" },
                  ].map(({ value, set, label }) => (
                    <div key={label}>
                      <Input
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        inputMode="decimal"
                        placeholder="0"
                        aria-label={label}
                        className="h-11 rounded-control border-border bg-card text-center text-body tabular-nums"
                      />
                      <p className="mt-1 text-center text-micro uppercase text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={submitAddItem}
                  disabled={!addName.trim() || addItem.isPending}
                  className={cn(
                    "flex h-11 w-full items-center justify-center rounded-control text-label transition-transform duration-instant active:scale-[0.92]",
                    addName.trim() && !addItem.isPending
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-text-disabled",
                  )}
                >
                  {addItem.isPending ? "Adding…" : "Add item"}
                </button>
              </Surface>
            ) : (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="flex h-11 w-full items-center gap-2 rounded-control px-3 text-label text-primary transition-transform duration-instant active:scale-[0.97]"
              >
                <Plus className="h-4 w-4" />
                Add item
              </button>
            )}

            <div className="flex items-baseline justify-between px-1 pt-1">
              <span className="text-label text-secondary-text">Meal total</span>
              <span className="text-display-md tabular-nums text-foreground">{totalCalories} kcal</span>
            </div>
          </>
        )}
      </main>

      {/* Sticky save bar */}
      {initialized && !notFound && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/90 backdrop-blur">
          <div className="mx-auto max-w-md px-4 pb-safe">
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saveEdits.isPending}
              className={cn(
                "my-3 flex h-12 w-full items-center justify-center rounded-control text-label transition-transform duration-instant active:scale-[0.92]",
                dirty && !saveEdits.isPending
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-text-disabled",
              )}
            >
              {saveEdits.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}

      <AlertDialog open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
        <AlertDialogContent className="rounded-card border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-heading text-foreground">Delete this meal?</AlertDialogTitle>
            <AlertDialogDescription className="text-body text-muted-foreground">
              {items.length === 1
                ? "This removes the logged item from your diary. You'll get 5 seconds to undo."
                : `This removes all ${items.length} items from your diary. You'll get 5 seconds to undo.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-control">Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAll}
              className="h-11 rounded-control bg-destructive text-destructive-foreground transition-transform duration-instant active:scale-[0.92]"
            >
              Delete meal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
