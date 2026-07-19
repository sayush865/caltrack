import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  ChevronRight,
  CopyPlus,
  Dumbbell,
  MessageSquareText,
  Scale,
  Search,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import WeightSheet from "@/components/WeightSheet";
import { dayKey, isToday, parseDayKey, suggestedMealType } from "@/lib/dates";
import { parseLogMeta, type DraftItem, type Favorite, type FoodLogRow } from "@/lib/types";
import { useDay } from "@/hooks/useDay";
import { useFavorites } from "@/hooks/useFavorites";
import { useLogMeal } from "@/hooks/useMutations";

/* ── Context ─────────────────────────────────────────────────── */

interface LogSheetContextValue {
  openLogSheet: (dateKey?: string) => void;
  closeLogSheet: () => void;
}

const LogSheetContext = createContext<LogSheetContextValue | null>(null);

export function useLogSheet(): LogSheetContextValue {
  const ctx = useContext(LogSheetContext);
  if (!ctx) throw new Error("useLogSheet must be used inside <LogSheetProvider>");
  return ctx;
}

export function LogSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dateKey, setDateKey] = useState<string>(() => dayKey(new Date()));

  const openLogSheet = useCallback((key?: string) => {
    setDateKey(key ?? dayKey(new Date()));
    setOpen(true);
  }, []);
  const closeLogSheet = useCallback(() => setOpen(false), []);

  const value = useMemo(() => ({ openLogSheet, closeLogSheet }), [openLogSheet, closeLogSheet]);

  return (
    <LogSheetContext.Provider value={value}>
      {children}
      <LogSheetBody open={open} onOpenChange={setOpen} dateKey={dateKey} />
    </LogSheetContext.Provider>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */

function shiftDayKey(key: string, days: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + days);
  return dayKey(d);
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Rebuild a DraftItem from a logged row so it can be re-logged (base = per-1x macros). */
function rowToDraftItem(row: FoodLogRow): DraftItem {
  const meta = parseLogMeta(row.notes);
  const quantity = meta?.quantity && meta.quantity > 0 ? meta.quantity : 1;
  const base = {
    calories: (row.calories ?? 0) / quantity,
    protein: (row.protein ?? 0) / quantity,
    carbs: (row.carbs ?? 0) / quantity,
    fat: (row.fat ?? 0) / quantity,
    fiber: row.fiber != null ? row.fiber / quantity : undefined,
    sugar: row.sugar != null ? row.sugar / quantity : undefined,
    sodium: row.sodium != null ? row.sodium / quantity : undefined,
  };
  return {
    id: newId(),
    name: row.food_name ?? "Meal",
    portion: meta?.portion ?? "1 serving",
    quantity,
    base,
    calories: row.calories ?? 0,
    protein: row.protein ?? 0,
    carbs: row.carbs ?? 0,
    fat: row.fat ?? 0,
    fiber: row.fiber ?? undefined,
    sugar: row.sugar ?? undefined,
    sodium: row.sodium ?? undefined,
  };
}

/** Fresh ids + extra multiplier on top of each item's stored quantity (useLogMeal derives macros from base × quantity). */
function withMultiplier(items: DraftItem[], mult: number): DraftItem[] {
  return items.map((item) => ({ ...item, id: newId(), quantity: (item.quantity || 1) * mult }));
}

interface QuickMeal {
  key: string;
  name: string;
  calories: number;
  items: DraftItem[];
  favorite?: Favorite;
}

/** Group logged rows by shared mealId into distinct re-loggable meals, newest first. */
function groupIntoMeals(rows: FoodLogRow[], limit: number): QuickMeal[] {
  const sorted = [...rows].sort((a, b) => b.logged_at.localeCompare(a.logged_at));
  const groups = new Map<string, FoodLogRow[]>();
  for (const row of sorted) {
    const meta = parseLogMeta(row.notes);
    const k = meta?.mealId ?? row.id;
    const arr = groups.get(k);
    if (arr) arr.push(row);
    else groups.set(k, [row]);
  }
  const seen = new Set<string>();
  const out: QuickMeal[] = [];
  for (const [k, groupRows] of groups) {
    const first = groupRows[0].food_name ?? "Meal";
    const name = groupRows.length > 1 ? `${first} +${groupRows.length - 1}` : first;
    if (seen.has(name)) continue;
    seen.add(name);
    out.push({
      key: k,
      name,
      calories: Math.round(groupRows.reduce((s, r) => s + (r.calories ?? 0), 0)),
      items: groupRows.map(rowToDraftItem),
    });
    if (out.length >= limit) break;
  }
  return out;
}

/* ── Rows / chips ────────────────────────────────────────────── */

interface ActionRowProps {
  icon: LucideIcon;
  label: string;
  caption?: string;
  onClick: () => void;
}

function ActionRow({ icon: Icon, label, caption, onClick }: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-full items-center gap-3 rounded-control px-2 text-left transition-transform duration-instant active:scale-[0.97]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium text-foreground">{label}</span>
        {caption && <span className="block truncate text-caption text-muted-foreground">{caption}</span>}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </button>
  );
}

function MealChip({ meal, onSelect }: { meal: QuickMeal; onSelect: (meal: QuickMeal) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(meal)}
      className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-4 transition-transform duration-instant active:scale-[0.97]"
    >
      <span className="max-w-[140px] truncate text-label text-foreground">{meal.name}</span>
      <span className="text-caption tabular-nums text-muted-foreground">{meal.calories} kcal</span>
    </button>
  );
}

const MULTIPLIERS = [0.5, 1, 1.5, 2] as const;

/* ── Sheet body ──────────────────────────────────────────────── */

interface LogSheetBodyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateKey: string;
}

function LogSheetBody({ open, onOpenChange, dateKey }: LogSheetBodyProps) {
  const navigate = useNavigate();
  const [weightOpen, setWeightOpen] = useState(false);
  const [pending, setPending] = useState<QuickMeal | null>(null);
  const [mult, setMult] = useState(1);

  const mealType = suggestedMealType();
  const yesterdayKey = shiftDayKey(dateKey, -1);
  const todayQuery = useDay(dateKey);
  const yesterdayQuery = useDay(yesterdayKey);
  const logMeal = useLogMeal();
  const { favorites: favoriteRows, logFavorite } = useFavorites();

  const favorites: QuickMeal[] = useMemo(
    () =>
      (favoriteRows ?? []).slice(0, 8).map((fav) => ({
        key: fav.id,
        name: fav.name,
        calories: Math.round(fav.totals.calories ?? 0),
        items: fav.items,
        favorite: fav,
      })),
    [favoriteRows],
  );

  const recents: QuickMeal[] = useMemo(() => {
    const rows = [...(todayQuery.data?.all ?? []), ...(yesterdayQuery.data?.all ?? [])];
    return groupIntoMeals(rows, 10);
  }, [todayQuery.data, yesterdayQuery.data]);

  const yesterdayMealRows = yesterdayQuery.data?.meals?.[mealType] ?? [];
  const yesterdayMealCalories = Math.round(
    yesterdayMealRows.reduce((s, r) => s + (r.calories ?? 0), 0),
  );

  const close = useCallback(() => {
    setPending(null);
    setMult(1);
    onOpenChange(false);
  }, [onOpenChange]);

  const go = (path: string) => {
    close();
    navigate(path);
  };

  const selectMeal = (meal: QuickMeal) => {
    setPending(meal);
    setMult(1);
  };

  const quickLog = () => {
    if (!pending || pending.items.length === 0) return;
    if (pending.favorite && isToday(dateKey)) {
      // Favorites path: also bumps use_count and toasts on success.
      logFavorite(pending.favorite, mult);
    } else {
      logMeal.mutate({
        items: withMultiplier(pending.items, mult),
        mealType: suggestedMealType(),
        dayKey: dateKey,
        source: "quick",
      });
      toast.success(`Logged ${pending.name}`);
    }
    close();
  };

  const copyYesterday = () => {
    if (yesterdayMealRows.length === 0) return;
    logMeal.mutate({
      items: yesterdayMealRows.map(rowToDraftItem),
      mealType,
      dayKey: dateKey,
      source: "quick",
    });
    toast.success(`Copied yesterday's ${mealType}`);
    close();
  };

  const pendingCalories = pending
    ? Math.round(pending.items.reduce((s, i) => s + (i.base.calories ?? 0) * (i.quantity || 1), 0) * mult)
    : 0;

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
        <SheetContent
          side="bottom"
          className="rounded-t-[24px] border-t border-border bg-card px-4 pb-2 pt-5 shadow-raised"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="text-title text-foreground">Log something</SheetTitle>
          </SheetHeader>

          <div className="pb-safe">
            {/* Favorites + Recents chips */}
            <div className="mt-3 space-y-2">
              {favorites.length > 0 && (
                <div>
                  <p className="text-micro uppercase text-muted-foreground">Favorites</p>
                  <div className="-mx-1 mt-1.5 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
                    {favorites.map((meal) => (
                      <MealChip key={meal.key} meal={meal} onSelect={selectMeal} />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-micro uppercase text-muted-foreground">Recents</p>
                {recents.length > 0 ? (
                  <div className="-mx-1 mt-1.5 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
                    {recents.map((meal) => (
                      <MealChip key={meal.key} meal={meal} onSelect={selectMeal} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-1.5 text-caption text-muted-foreground">
                    Meals you log will appear here for one-tap relogging.
                  </p>
                )}
              </div>
            </div>

            {/* Inline confirm strip for a selected chip */}
            {pending && (
              <div className="mt-3 animate-fade-rise rounded-card border border-border bg-background p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate text-body font-medium text-foreground">{pending.name}</p>
                  <p className="shrink-0 text-label tabular-nums text-secondary-text">{pendingCalories} kcal</p>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  {MULTIPLIERS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMult(m)}
                      className={`flex h-11 min-w-[44px] items-center justify-center rounded-full px-2 text-label tabular-nums transition-transform duration-instant active:scale-[0.92] ${
                        mult === m
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-card text-secondary-text"
                      }`}
                    >
                      {m}x
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={quickLog}
                    className="ml-auto flex h-11 items-center justify-center rounded-control bg-primary px-4 text-label text-primary-foreground transition-transform duration-instant active:scale-[0.92]"
                  >
                    Log it
                  </button>
                </div>
              </div>
            )}

            {/* Action rows */}
            <div className="mt-3 flex flex-col">
              <ActionRow icon={Camera} label="Scan a meal" caption="Snap your plate — 3 seconds" onClick={() => go("/scan")} />
              <ActionRow icon={MessageSquareText} label="Describe it" caption="Type or dictate what you ate" onClick={() => go("/describe")} />
              {yesterdayMealRows.length > 0 && (
                <ActionRow
                  icon={CopyPlus}
                  label={`Copy yesterday's ${mealType}`}
                  caption={`${yesterdayMealCalories} kcal · one tap`}
                  onClick={copyYesterday}
                />
              )}
              <ActionRow icon={Search} label="Food library" onClick={() => go("/foods")} />
              <ActionRow icon={Dumbbell} label="Log exercise" onClick={() => go("/exercise")} />
              <ActionRow
                icon={Scale}
                label="Log weight"
                onClick={() => {
                  close();
                  setWeightOpen(true);
                }}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <WeightSheet open={weightOpen} onOpenChange={setWeightOpen} />
    </>
  );
}

export default LogSheetProvider;
