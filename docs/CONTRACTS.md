# CalTrack Rebuild — Code Contracts (binding for all build agents)

Every agent MUST read docs/DESIGN_SYSTEM.md and docs/IA_FLOWS.md first. This file defines the exact
interfaces between the foundation layer and the screens. Do not invent parallel utilities — import these.

## Hard rules
1. **No raw Tailwind palette classes** (`text-green-600`, `bg-blue-50`, …). Only token classes:
   `bg-background bg-card text-foreground text-secondary-text text-muted-foreground border-border
    bg-primary text-primary bg-primary-soft text-protein bg-protein-soft text-carbs bg-carbs-soft
    text-fat bg-fat-soft text-fiber bg-fiber-soft text-water bg-water-soft text-success bg-success-soft
    text-warning bg-warning-soft text-destructive text-streak bg-streak-soft` etc.
2. **No `dark:` classes. No emoji as icons** — lucide-react only.
3. Typography classes (defined in tailwind config): `text-display-xl`, `text-display-lg`, `text-display-md`
   (Space Grotesk, auto-applied via fontFamily in the size token), `text-title`, `text-heading`, `text-body`,
   `text-label`, `text-caption`, `text-micro`. Numerals that update use `tabular-nums`.
4. Cards: `rounded-card border border-border bg-card shadow-card` (use the `<Surface>` helper below).
   Controls: `rounded-control`. Pills/chips/FAB: `rounded-full`.
5. Every tappable element: `active:scale-[0.97]` (cards/rows) or `active:scale-[0.92]` (buttons/FAB),
   `transition-transform duration-instant`, min 44px hit target.
6. Toasts: `import { toast } from "sonner"` ONLY. No use-toast/radix toaster.
7. Loading: skeletons that mirror layout (use `<Shimmer>` blocks). The literal text "Loading..." is banned.
8. Empty states: use `<EmptyState>`; components must never return `null` when empty.
9. All data access via the hooks below. No direct `supabase.from(...)` inside pages/components
   (except inside the hooks layer itself).
10. Dates: all "day" logic is **user-local**, via `lib/dates.ts`. Never `toISOString().split('T')[0]` on a
    local Date, never UTC day bucketing.
11. Existing shadcn primitives in `src/components/ui/*` are available (Button, Sheet, Dialog, Drawer,
    Input, Slider, Popover, etc.). Style them with token classes.
12. TypeScript strict-friendly: no `any` unless unavoidable; export prop types.

## Files owned by the FOUNDATION (import, never re-create)

### `src/lib/types.ts`
```ts
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type LogSource = "photo" | "text" | "quick" | "library" | "manual";

export interface MacroSet { calories: number; protein: number; carbs: number; fat: number; fiber?: number; sugar?: number; sodium?: number; }

/** One editable item row in the review sheet (from AI or manual). */
export interface DraftItem extends MacroSet {
  id: string;                 // client uuid
  name: string;
  portion: string;            // "1 cup", "150 g"
  quantity: number;           // multiplier applied to base macros (default 1)
  confidence?: number;        // 0-100 from AI
  base: MacroSet;             // immutable per-1x nutrition; display = base * quantity
}

/** Deployed analyze-food response (DO NOT change client expectations). */
export interface AnalyzeFoodResponse {
  items: Array<{ name: string; portion: string; confidence: number } & MacroSet & Record<string, number | string>>;
  nutritionData: { food_name: string } & MacroSet & Record<string, number | string>;
  analysis: { visual_analysis: string; portion_estimation: string; nutritional_reasoning: string };
  meta: { items_count: number; processing_time_ms: number };
}
/** Deployed analyze-food-text response: single blob — map to ONE DraftItem. */
export interface AnalyzeTextResponse { nutritionData: { food_name: string } & MacroSet & Record<string, number | string>; analysis?: Record<string, string>; }

export interface FoodLogRow { /* mirrors DB */ id: string; user_id: string; food_name: string | null; image_url: string | null;
  calories: number | null; protein: number | null; carbs: number | null; fat: number | null; fiber: number | null;
  sugar: number | null; sodium: number | null; meal_type: string | null; notes: string | null; logged_at: string; status: number; }

/** Per-item metadata packed into food_logs.notes as JSON (schema is frozen; notes is our extension point). */
export interface LogMeta { v: 2; source: LogSource; portion?: string; confidence?: number; quantity?: number; mealId?: string; }
export function parseLogMeta(notes: string | null): LogMeta | null;

export interface Profile { id: string; username: string | null; email: string | null; age: number | null; gender: string | null;
  height: number | null; activity_level: string | null; units_preference: "metric" | "imperial"; onboarding_completed: boolean; has_seen_tutorial: boolean; }
export interface Goals { daily_calories: number; daily_protein: number; daily_carbs: number; daily_fat: number;
  daily_fiber: number; daily_water: number; goal_type: "lose" | "maintain" | "gain"; current_weight: number | null; goal_weight: number | null;
  daily_active_calories: number; daily_exercise_minutes: number; weekly_exercise_days: number; }
```

### `src/lib/dates.ts`
```ts
export function localDayStart(d?: Date): Date;
export function localDayEnd(d?: Date): Date;
export function dayKey(d: Date): string;                    // "2026-07-20" in LOCAL time
export function parseDayKey(key: string): Date;             // local midnight
export function dayRangeISO(key: string): { fromISO: string; toISO: string }; // for .gte/.lt logged_at
export function isToday(key: string): boolean; export function isFuture(key: string): boolean;
export function suggestedMealType(d?: Date): MealType;       // <11 breakfast, <15:30 lunch, <21 dinner, else snack
export function formatTime(iso: string): string;             // "1:45 PM"
export function friendlyDay(key: string): string;            // "Today" | "Yesterday" | "Tue, Jul 15"
```

### `src/lib/units.ts`
```ts
export type Units = "metric" | "imperial";
export function kgToLb(kg: number): number; export function lbToKg(lb: number): number;
export function cmToFtIn(cm: number): { ft: number; in: number }; export function ftInToCm(ft: number, inches: number): number;
export function formatWeight(kg: number, units: Units, digits?: number): string;   // "72.4 kg" | "159.6 lb"
export function weightUnit(units: Units): "kg" | "lb";
export function displayWeight(kg: number, units: Units): number; export function toKg(value: number, units: Units): number;
```
**All weights are stored in kg everywhere** (weight_logs.weight, user_goals.current_weight/goal_weight). Convert at the edge (display/input) only.

### `src/lib/energy.ts`  (single source of truth for ALL metabolic math)
```ts
export interface EnergyInput { gender: "male" | "female"; age: number; heightCm: number; weightKg: number;
  activityLevel: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extra_active"; }
export function bmr(i: EnergyInput): number;                          // Mifflin-St Jeor
export function tdee(i: EnergyInput): number;
export type Pace = "gentle" | "steady" | "ambitious";                  // 0.25 / 0.5 / 0.75 kg per week
export function paceKgPerWeek(p: Pace): number;
export function dailyTarget(tdee: number, goal: "lose"|"maintain"|"gain", p: Pace, gender: "male"|"female"): number; // deficit cap 35% TDEE, floors 1200F/1500M
export function macroTargets(calories: number, weightKg: number, goal: string): { protein: number; carbs: number; fat: number; fiber: number };
export function projectionDate(currentKg: number, goalKg: number, p: Pace, from?: Date): Date | null;
export function smoothWeights(rows: Array<{ logged_at: string; weight: number }>, alpha?: number): Array<{ date: string; raw: number; trend: number }>; // EWMA alpha 0.25
export function weeklyExpenditure(intakeKcalByDay: number[], trendDeltaKg: number): number | null; // adaptive TDEE estimate
```

### `src/hooks` (React Query; QueryClient configured in App with sensible staleTimes)
```ts
useSession(): { session: Session | null; loading: boolean }            // context provider <AuthProvider> in App
useProfile(): UseQueryResult<Profile | null>
useGoals(): UseQueryResult<Goals | null>
useDay(dayKey: string): UseQueryResult<DayData>   // ONE parallel fetch: food_logs (status=1), water total, exercise rows for that local day
   // DayData = { meals: Record<MealType, FoodLogRow[]>; all: FoodLogRow[]; totals: MacroSet; water: number; exercise: { rows: ExerciseRow[]; calories: number } }
useWeights(): UseQueryResult<Array<{ id: string; logged_at: string; weight: number }>>  // kg, ascending
useStreak(): UseQueryResult<{ current: number; longest: number; daysThisWeek: number }> // computed CLIENT-side from food_logs distinct local days (last 120d)
useInsight(): { insight: Insight[] | null; loading: boolean; refresh: () => void }      // localStorage cache key `ct-insight-<uid>-<dayKey>`; calls generate-insights max once/day
// Mutations (all optimistic where cheap, invalidate ["day", dayKey] etc.):
useLogMeal(): mutate({ items: DraftItem[]; mealType: MealType; dayKey: string; source: LogSource; imageUrl?: string; time?: Date })
   // inserts ONE food_logs row PER item; notes = JSON.stringify(LogMeta) with shared mealId
useDeleteLog(): soft delete (status=2) + 5s sonner undo that restores
useLogWater(): mutate({ dayKey; deltaMl }) ; useLogWeight(): mutate({ kg; when?: Date }) // also updates user_goals.current_weight
useLogExercise(): mutate({ name; minutes; calories; dayKey })
useFavorites(): meal_templates CRUD  — template stores { items: DraftItem[] } snapshot in its JSON column/fields
useUpdateGoals(): partial upsert of user_goals ; useUpdateProfile()
```

### `src/lib/analyze.ts`
```ts
export async function analyzePhoto(imageBase64: string, signal?: AbortSignal): Promise<DraftItem[]>;  // calls analyze-food, maps items[] -> DraftItem[] (base = per-1x)
export async function analyzeText(text: string, signal?: AbortSignal): Promise<DraftItem[]>;          // calls analyze-food-text, maps blob -> [one DraftItem]
export async function fetchDailyInsights(): Promise<Insight[]>;                                       // generate-insights passthrough
export function compressImage(file: Blob, maxDim?: number): Promise<string>;                          // canvas -> WebP dataURL ≤768px (reuse/replace lib/imageProcessing.ts)
```

### System components (`src/components/system/`)
```tsx
<ProgressRing value={0..1+} size={176} stroke={14} trackClass="text-calories-track" fillClass="text-foreground"
   overClass="text-warning" animate>{children /* center content */}</ProgressRing>
useCountUp(target: number, duration = 700): number      // eased, respects prefers-reduced-motion
<Surface className?>…</Surface>                          // the ONE card treatment
<EmptyState icon={Lucide} headline copy action?={{label, onClick}} celebratory? />
<Shimmer className />                                    // skeleton block, pass rounded-* + sizes
<MacroBar kind="protein"|"carbs"|"fat"|"fiber"|"water" value target compact? />  // label + 6px bar + "86/140g"
<StreakChip />                                           // uses useStreak; zero state "Start a streak"; never hidden
<MealCard log={FoodLogRow[] grouped} …/>                 // NOTE: Today/Diary render per-item rows via <LogItemRow>
<LogItemRow row={FoodLogRow} onEdit onDelete />          // 56px thumb • title • time/meal chip • kcal + P/C/F dots • confidence pip
<ConfettiBurst />                                        // brand-colored, fired imperatively via fireConfetti()
<PageHeader title back? action? />
```

### Navigation / shell (foundation-owned)
- `src/components/BottomNav.tsx` — 4 tabs (Today `/`, Diary `/log`, Insights `/insights`, You `/you`) + center FAB.
- `src/components/LogSheet.tsx` — the FAB sheet: Scan a meal → `/scan`; Describe it → `/describe`;
  Favorites & Recents chip rows (inline 2-tap log via useLogMeal); "Copy yesterday's <meal>" row;
  Food library → `/foods`; Log exercise → `/exercise`; Log weight → inline `<WeightSheet>`.
  Exposes `openLogSheet(dateKey?)` via a small zustand-free context `LogSheetProvider`.
- `src/components/WeightSheet.tsx` — weight entry drawer used from LogSheet and /you.
- `src/App.tsx` — routes (below), `<AuthProvider>`, single `QueryClientProvider`, sonner `<Toaster>`, ErrorBoundary.

### Routes (final — stubs exist; each agent overwrites their own)
| Route | File |
|---|---|
| `/welcome` | `src/pages/Welcome.tsx` |
| `/auth` | `src/pages/Auth.tsx` |
| `/` | `src/pages/Today.tsx` |
| `/log` | `src/pages/Diary.tsx` |
| `/insights` | `src/pages/Insights.tsx` |
| `/you` | `src/pages/You.tsx` |
| `/scan` | `src/pages/Scan.tsx` |
| `/describe` | `src/pages/Describe.tsx` |
| `/foods` | `src/pages/Foods.tsx` |
| `/exercise` | `src/pages/Exercise.tsx` |
| `/meal/:mealId` | `src/pages/MealDetail.tsx` (mealId = LogMeta.mealId; edits the group's rows) |
| `/you/goals` | `src/pages/YouGoals.tsx` |
| `/you/weight` | `src/pages/YouWeight.tsx` |
| `/you/milestones` | `src/pages/YouMilestones.tsx` |
| `/you/settings` | `src/pages/YouSettings.tsx` |
| `*` | `src/pages/NotFound.tsx` |

Auth gating: unauthenticated → `/welcome` (not /auth). Authenticated but `!onboarding_completed` → `/welcome` resumes at plan/profile-write step. Onboarding renders WITHOUT BottomNav.

## Deployed-backend constraints (v1 must respect)
- Schema is FROZEN at current state (see src/integrations/supabase/types.ts). New tables/columns are NOT available at runtime. `notes` (TEXT) on food_logs carries LogMeta JSON. meal_templates carries favorites.
- `analyze-food` returns items[] per-item (good). `analyze-food-text` returns a single blob → one DraftItem.
- `generate-insights` returns `{insights: [{category, emoji, message}]}` — render with lucide icon mapped from category, IGNORE the emoji field.
- Storage bucket `food-images` is public (upload path: keep current Camera.tsx behavior).
- Improved edge functions/migrations are written to `supabase/functions-v2/` + `supabase/migrations-v2/` + `docs/DEPLOY.md` and are NOT imported by the app.
