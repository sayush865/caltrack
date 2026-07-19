# CalTrack AI — Information Architecture & Flows (Rebuild Spec)

**Status: DECIDED.** This document is the binding IA for the rebuild. Every route, flow, and state below is a commitment, not an option. Constraints honored: same repo, Supabase schema extended by migration only (new tables: `food_log_items`, `ai_insights`, `weekly_checkins`; new columns: `profiles.timezone`, `profiles.display_name`, `food_logs.source`, `food_logs.meal_type` CHECK), AI via Lovable gateway (Gemini) through the existing edge-function pattern.

---

## 1. Screen Map — Every Route in the Rebuilt App

**14 routes total (down from 13 with better coverage).** All logging happens in sheets/full-screen modals layered over tabs, so tab state is never lost mid-log.

### Public routes

| Route | Purpose | Primary components |
|---|---|---|
| `/welcome` | First-run onboarding quiz (unauthenticated; answers persist in localStorage until signup). Landing for all logged-out first visits. | `QuizShell` (progress bar, step router), `QuizStep` variants, `PlanBuildAnimation`, `PlanReveal`, `PermissionPrimer` |
| `/auth` | Sign in for returning users; sign-up screen reached only as the final quiz step. Adds forgot-password and email-verification-pending states (both missing today). | `AuthForm`, `ForgotPasswordForm`, `VerifyEmailNotice` |

### Protected routes — the four tabs

| Route | Tab | Purpose | Primary components |
|---|---|---|---|
| `/` | **Today** | The daily loop, <60s. Hero calorie ring + macro bars, today's meal cards, streak/week strip, one AI insight card. | `HeroCard` (shared `ProgressRing`, swipeable page 2: fiber/water/sodium), `WeekStrip`, `MealCardList`, `OneBigThingCard` (cached `ai_insights`), `QuickLogRow`, `StreakFlame` |
| `/log` | **Diary** | Full day ledger for any date (`/log?date=2026-07-19`). Meals grouped by type, exercise section, water, day totals. Replaces DailyLog + absorbs retro-day browsing. | `DayHeader` (date pager + calendar popover, future dates blocked), `DaySummaryBar`, `MealGroup`, `ExerciseSection`, `WaterSection` |
| `/insights` | **Insights** | Weekly recap + trends. Weekly check-in card (adaptive target proposal), 7-day calorie bars, macro averages, weight trend sparkline, best-day, exercise totals (currently excluded — now included). | `WeeklyCheckinCard`, `WeeklyCalorieChart`, `MacroAveragesCard`, `WeightTrendCard` (smoothed trend line), `RecapShareCard` |
| `/you` | **You** | Profile hub: plan summary, weight, milestones, settings. Single front door to everything that is orphaned today. | `PlanSummaryCard` (links `/you/goals`), `WeightQuickLog`, `MilestonesPreview`, `SettingsList` |

### Protected routes — stacked pages (pushed over tabs, back returns to tab)

| Route | Purpose | Primary components |
|---|---|---|
| `/scan` | Photo log flow: capture → analyzing → review/edit → save. Full-screen. | `CameraCapture` (kept), `AnalysisProgress` (kept), `ScanReviewSheet` (new crown jewel: per-item editable rows, confidence, clarifying-question chip, hint field) |
| `/describe` | Text + voice log. Same review sheet, same `items[]` contract as `/scan`. | `DescribeInput` (textarea + mic via SpeechRecognition where available), `ScanReviewSheet` (reused) |
| `/foods` | Food library: verified database (seeded, trigram search), user custom foods (new), favorites/templates. Portion + meal-type picker on add (missing today). | `FoodSearch`, `FoodCard`, `PortionSheet`, `CreateCustomFood` |
| `/exercise` | Exercise picker + duration → log. Seeded `exercise_database` (empty today). | `ExerciseSearch`, `DurationSheet` (unit bug fixed via shared `units.ts`) |
| `/meal/:id` | Meal detail/edit: per-item rows (from `food_log_items`), edit name/quantity/meal type/date, real per-food gram conversions, non-destructive rescale (base nutrition × quantity). Replaces EditFoodLog. | `MealDetail`, `ItemRow` with quantity stepper, `MealTypeSelector` (kept) |
| `/you/goals` | THE single goal editor (kills the Goals/Settings split): calories, all macros, fiber, water, pace slider, recompute-from-profile button, GLP-1 mode toggle (protein floor). | `TargetsForm`, `PaceSlider`, `RecomputeCard`, `GlpModeToggle` |
| `/you/weight` | Weight logging + smoothed trend chart + goal projection. Weight writes update both `weight_logs` and `user_goals.current_weight` (disconnected today). | `WeightEntrySheet`, `TrendChart`, `ProjectionCard` |
| `/you/milestones` | Trophy room. Server-side awarded achievements only — every badge shown is earnable (7 of 18 are dead today). | `BadgeGrid`, `StatsRow`, `ConfettiCelebration` (with brand colors, not gray) |
| `/you/settings` | Account, units, notifications, data export, delete account (with fixed cascade). Slimmed from 1,232 lines — all goal editing moved to `/you/goals`. | `ProfileSection`, `UnitsToggle`, `NotificationPrefs`, `DangerZone` |
| `*` | NotFound using design tokens, SPA `<Link>` home. | — |

---

## 2. Navigation Model

**Bottom tab bar: 4 tabs + raised center FAB.** This is the current app's best pattern; we keep the skeleton and fix the chrome (real `env(safe-area-inset-bottom)`, `viewport-fit=cover`, 44px+ targets).

```
[ Today ]  [ Diary ]   ( + )   [ Insights ]  [ You ]
```

**The FAB opens the Log Sheet — the single entry point for all logging.** Contents, top to bottom:

1. **Scan a meal** (camera icon) → `/scan` — primary, largest target
2. **Describe it** (text/mic icon) → `/describe`
3. **Favorites & recents** — horizontal chip row, inline 2-tap logging, no navigation
4. **Copy yesterday's [breakfast/lunch/dinner]** — contextual to time of day, 1 tap
5. **Food library** → `/foods` | **Log exercise** → `/exercise` | **Log weight** → weight sheet inline

**Why this shape:**
- Logging speed is the retention lever (sub-30s KPI); favorites/copy-yesterday must be zero-navigation, so they live in the sheet itself, not behind a route.
- Weight logging gets three entry points (Log Sheet, `/you`, `/insights` check-in) because the adaptive-target engine is starved without weigh-ins — and today it is reachable only by typing a URL.
- **Every feature has exactly one canonical route and at least one visible entry point.** The orphaned-page class of bug (Goals, SaveAsTemplateButton) is banned by rule: no route ships without a nav path in this doc.
- Onboarding renders **without** BottomNav (ProtectedRoute no longer wraps it) — the current leak that lets users tab away mid-onboarding is closed.

**Post-log destination — unified.** Every logging flow (scan, describe, foods, quick log, exercise) ends at **Today (`/`)** with the new entry visible at the top of the meal list and a 5s undo toast. If the user logged for a past date, they land on `/log?date=<that date>` instead. No more camera→dashboard vs database→daily-log split.

**Session/data layer:** one React Query cache with `useSession`, `useProfile`, `useGoals`, `useDay(date)` hooks. ProtectedRoute checks onboarding status once per session from cache, not per navigation. Realtime subscriptions are user-scoped and consolidated into one channel.

---

## 3. The Six Key Flows

### Flow 1 — First-run onboarding quiz → plan reveal → signup

The converged Cal AI/Noom/Yazio pattern: value first, account last. Quiz answers live in localStorage; the account is created at the end and answers are written to `profiles` + `user_goals` in one transaction.

1. `/welcome` — Splash: 6s demo loop of photo→macros reveal. CTA "Build my plan" / secondary "I have an account" → `/auth`.
2. Quiz steps 1–14 (verbatim in Section 6). Progress bar throughout; every answer gets a response (affirmation, micro-education, or updated projection).
3. **Plan build animation** (6s, A/B the duration): named real steps — "Calculating your metabolic rate… Setting your protein target… Calibrating your pace…"
4. **Plan reveal:** named plan ("Your Steady-Cut Plan"), hero calorie number, macro donut (P/C/F/fiber), date-stamped projection curve ("72 kg by November 9"), honest footnote: "This is our best starting estimate. We'll fine-tune it weekly from your real data."
5. **Commit screen:** tap-and-hold "I'm in" gesture + "12,400 plans started this week."
6. **Signup (last):** email + password only (username auto-generated, editable later in Settings — onboarding never touches the unique username again; display name is a separate `display_name` column). On success: quiz answers → DB, `onboarding_completed=true`.
7. **First value, immediately:** land on Today with a single full-screen prompt: "Snap your first meal — it takes 3 seconds." Camera opens directly. Skip allowed. **Activation metric = first successful photo log in session 1; core-value metric = 3+ logged days in week 1.** Both instrumented per screen from day one.

Guardrails: Mifflin-St Jeor × activity, pace via 7,700 kcal/kg **in the user's chosen units** (fixes the 2.2× imperial bug), deficit hard-capped at 35% of TDEE and floored at 1,200/1,500 kcal (F/M), unrealistic goal weights blocked at entry. All math lives in one shared `lib/energy.ts` used by onboarding, goals, and insights (kills the 3 divergent BMR copies).

### Flow 2 — Photo log (camera → analyzing → review/edit → saved)

1. FAB → **Scan a meal** → `/scan`. Camera opens instantly (or upload/drag-drop on desktop).
2. Capture → client-side compress to ≤768px WebP (single Gemini tile, ~$0.0013/analysis).
3. **Parallel:** upload to storage (bucket returned to **private**, images served via signed URLs) + call `analyze-food` (Gemini via Lovable gateway, forced tool call, new vision prompt from the prompts research: scale references, +15–25% large-portion bias correction, `is_food:false` path, per-item confidence rubric). Keep `AnalysisProgress` staged theater and the abort/nav-guard.
4. **Review sheet** (the crown jewel):
   - Photo on top; **one editable row per detected item**: name (tappable), quantity stepper with unit, kcal + macro chips, confidence badge (high/medium/low). Remove or add items.
   - **Clarifying-question chip** when the model returns one ("Ghee tadka or plain?") — answering re-runs text-only refinement; skipping never blocks.
   - **"Add a hint"** field (paste menu text, "cooked in 2 tsp oil") — re-runs estimate.
   - Meal type **auto-applied** from time of day (editable). Date/time editable → **retro-logging finally works**; defaults to now, or to the browsed date if the user came from a past day in Diary.
   - Quantity edits rescale macros **in code** — no re-analysis, no destructive overwrite.
5. **Save:** one `food_logs` row (meal) + N `food_log_items` child rows (name, quantity, unit, per-item macros, confidence, portion_basis). Aggregates denormalized onto the parent for cheap dashboard reads. Source column = `photo`.
6. Land on Today, new meal card at top, undo toast, streak/ring animate. Long-press the card → "Save as favorite" (the resurrection of the dead template feature).

Target: **photo → saved in under 10 seconds** when no edits are needed.

### Flow 3 — Text / voice log

1. FAB → **Describe it** → `/describe`.
2. Textarea + example chips + **mic button** (Web SpeechRecognition on Chromium and iOS Safari 14.5+; button hidden where unsupported — voice is transcription into the same text box, not a separate pipeline).
3. Submit → `analyze-food-text`, rebuilt to the **same `items[]` contract and forced tool call** as the photo path ("2 eggs, toast, coffee" = 3 rows, not one blob), with Indian-unit priors and Hinglish few-shots baked into the prompt. Model: Gemini Flash (Pro is overkill for text).
4. Same `ScanReviewSheet` as Flow 2 — one review UI to maintain, one contract, one save path. Source = `text` or `voice`.
5. Water easter egg is promoted to an explicit behavior: if the model returns a drink item that is plain water, the review sheet shows it as a water entry with a droplet icon and saves to `water_logs`. No more client-side regex.

### Flow 4 — Quick log (favorites / recents / copy-yesterday)

No route. Everything inline in the Log Sheet — this is the sub-5-second path for repeat eaters.

1. FAB → sheet shows **Favorites** chips (name + kcal) and **Recents** (last 10 distinct meals).
2. Tap a chip → confirm strip appears in-sheet: portion multiplier (0.5× / 1× / 1.5× / 2×), meal type pre-filled from time of day → **Log it**. Two taps total.
3. **"Copy yesterday's lunch"** row (label contextual to current time): shows yesterday's meal summary → one tap clones all rows (meal + items) to today.
4. Toast on Today with undo. Source = `quick`.
5. Favorites creation: long-press any meal card (Today or Diary) → "Save as favorite" (stores per-item snapshot from `food_log_items`, so favorites are editable at log time).

### Flow 5 — Weekly insight review (the retention engine)

Runs weekly, anchored to the user's timezone (new `profiles.timezone` column; all day-bucketing and the streak trigger move to local time).

1. Sunday evening/Monday morning: **one** push/notification (if opted in) + a badge on the Insights tab: "Your Week 3 check-in is ready."
2. `/insights` opens on the **Weekly Check-in card**, generated server-side once and cached in `ai_insights` (never regenerated per mount — kills the LLM-call-per-dashboard-load):
   - **The week in numbers:** avg calories vs target, protein hit-rate, days logged (framed as "5 of 7 days logged — solid," never as broken perfection).
   - **One comparative insight** citing the user's own data (anti-generic prompt: must reference a specific food/day/number).
   - **Adaptive target proposal:** after 14+ days of data, recompute expenditure from logged intake + smoothed weight trend (MacroFactor pattern, adherence-neutral). "Your data suggests your burn is ~2,340 kcal, about 90 above our estimate. Update your target to 1,840?" → **Accept** (one tap, writes `user_goals`, logged in `weekly_checkins`) / **Keep current** / **Adjust manually** (→ `/you/goals`).
   - If weight data is missing: the card asks for a weigh-in instead of guessing.
3. Below the card: 7-day calorie bars, macro averages, weight trend (smoothed line, raw dots ghosted), exercise totals, best day.
4. **Shareable recap card** (Wrapped-style image) — the distribution hook.
5. Plateau handling: stalled 3+ week trend at a deficit triggers an explanatory insight (metabolic adaptation, in the user's numbers) plus two options: maintenance break or small target adjustment. Never "try harder."

### Flow 6 — Goal adjustment

One surface: `/you/goals`. The Goals-page/Settings-drawer split is dead.

1. Entry points: You tab plan card, "Adjust manually" from the weekly check-in, Settings deep link.
2. Top: **current plan summary** (calories, P/C/F/fiber, water, pace) with provenance: "Set from your Week 6 check-in."
3. **Recompute from profile:** re-runs onboarding math (shared `lib/energy.ts`) against current weight/activity — the re-runnability that doesn't exist today. Shows old→new diff before applying.
4. **Pace slider** with recommended band; deficit >35% TDEE blocked with explanation; **maintenance mode** is a first-class option (pause deficit, keep logging).
5. **Manual overrides** for every target (calories, protein, carbs, fat, fiber, water — full parity, one form) with the existing zod validation.
6. **GLP-1 mode toggle:** protein floor becomes the hero target, fiber/hydration floors surface on Today's hero card page 2, calorie ring de-emphasized. (Dose reminders are post-v1; the mode flag and target re-weighting ship now.)
7. Save → single `user_goals` upsert → cache invalidation updates Today's ring instantly. Weight edits here also write a `weight_logs` row — one weight truth.

---

## 4. State Handling — Per Key Screen

**Global rules (apply everywhere):**
- **Loading:** skeletons mirroring final layout (extend the existing `SkeletonDashboard` pattern to Diary/Insights/Foods). Literal "Loading…" text is banned. One data layer (React Query) means one loading state per screen, not eight widget waterfalls.
- **Offline:** PWA via `vite-plugin-pwa`. TanStack Query `networkMode: 'offlineFirst'` + persisted cache (IndexedDB) + `setMutationDefaults`/`resumePausedMutations` — quick logs, text drafts, water, and weight queue offline and sync on reconnect with optimistic UI. A slim "Offline — changes will sync" pill shows globally.
- **Errors:** route-level React error boundaries (none exist today). Edge functions return a stable error envelope; raw `error.message` never reaches the client. One toast system (**sonner**; radix toaster removed).
- **Empty states:** never blank, never `null`-vanishing widgets. Every empty state is an activation CTA.

| Screen | Empty | Loading | Error | Offline |
|---|---|---|---|---|
| **Today** | "Snap your first meal" hero CTA opening camera; ring shows full budget remaining (not zero-panic). Streak at 0 shows "Log today to start a streak," not hidden. | Full-page skeleton (kept pattern), single fetch via `useDay(today)`. Ring renders instantly from cached goals; never flashes wrong values (exercise deduction computed in the same query, not a child callback). | Inline retry card per section; hero ring always renders from cache. Insight card falls back to last cached insight, labeled with its date. | Fully readable from persisted cache; quick-log works (queued); scan/describe buttons disabled with "needs connection" hint. |
| **Diary (`/log`)** | Per-day: "Nothing logged for Tuesday" + **Log a meal for this day** (opens Log Sheet with date pre-set — fixes today's dead-end CTA to the dashboard). Future dates: read-only "This day hasn't happened yet." | Day-summary + meal-group skeletons; date paging is instant for cached days. | Retry banner for the day query; cached days still browsable. | Past cached days readable; retro-logging queues offline. |
| **Scan (`/scan`)** | n/a (camera is the state). Permission denied → upload-file fallback + how-to-re-enable instructions. | `AnalysisProgress` staged theater (kept), abort guard (kept), 30s timeout → error state. | Non-food (`is_food:false`): friendly model-provided reason + Retake. Gateway 429/402: "The kitchen's busy — try again in a minute" + queue-for-later option. Parse failure: one auto repair-retry, then manual-entry fallback pre-filled with whatever parsed. | Photo capture works; compressed image + intent queue in IndexedDB; "Will analyze when you're back online" and it auto-runs on reconnect. |
| **Describe (`/describe`)** | Placeholder examples incl. Hinglish ("2 roti, dal, salad"). Mic hidden where unsupported. | Inline shimmer on the review-sheet skeleton (<4s typical; no staged theater needed). | Same envelope as Scan; text draft is never lost on failure. | Draft saved locally; analyze queues. |
| **Review sheet** | n/a — always has ≥1 item or the non-food state. Low overall confidence (<0.5) auto-expands all rows with "Give these a quick check." | Item rows stream-skeleton if the sheet mounts before parse completes. | Per-item hint re-run failure keeps prior values + toast. | Save queues offline (image already uploaded or queued). |
| **Insights** | <7 days of data: "Your first weekly report unlocks Sunday" + progress meter (3/7 days) + what it will contain. No fake charts. | Card-by-card skeletons; charts render on cached data first, refresh in background. | Check-in generation failure → deterministic numeric summary (computed client-side) with "AI summary unavailable"; never a silent canned insight masquerading as fresh (kills the 200-with-fallback masking). | Fully readable from cache; target-accept queues. |
| **Foods (`/foods`)** | No search results: "Can't find it? **Describe it to AI** or **create a custom food**" — both one tap. | Search debounce + row skeletons (server-side trigram search, not full-table client fetch). | Retry inline; recent/favorite foods from cache. | Favorites/recents/custom foods cached and loggable; database search disabled. |
| **You / Goals / Weight** | Weight: "Two weigh-ins and we can show your trend" + big Add Weight CTA. Milestones: all badges visible, locked state with earn criteria. | Form skeletons; plan card from cached goals. | Form-level inline errors (zod); save failures keep local edits. | Edits queue; milestones/settings readable. |

---

## 5. Kill / Merge / Keep (vs. code-flows audit)

### Killed outright
| Current | Verdict |
|---|---|
| `/goals` page | **Killed.** Split into `/you/goals` (targets) + `/you/weight` (weight). It was orphaned with zero inbound links. |
| `/edit-food/:id` | **Killed.** Replaced by `/meal/:id` on the per-item data model. The fake 1-serving=100g=6tbsp conversion and destructive rescale-save do not survive. |
| `/camera`, `/text-food` | **Killed as routes**, reborn as `/scan` and `/describe` with a shared review sheet and shared `items[]` contract. |
| Dead code: `SaveAsTemplateButton`, `ProfileMenu`, `WeightHistoryChart`, `CalorieProgress`, `App.css`, unused Settings imports, 21 stale `dark:` classes, unused keyframes/tokens (or wired in, per design doc) | **Deleted.** |
| Client-side achievement awarding; the 7 unearnable achievements; `weekly_challenges` (progress never incremented by anything) | **Killed.** Achievements move server-side (triggers/cron) with a smaller, fully-earnable set. Weekly challenges are cut from v1 entirely — the weekly check-in is the retention mechanic. |
| Merged-single-row photo saves; localStorage login lockout; email-leaking RPCs (`get_email_by_username`, `get_user_by_username_or_email`); public `food-images` bucket | **Killed** (data model, server-side rate limiting, RPC removal/lockdown, private bucket + signed URLs). |
| Onboarding overwriting `username` with free text | **Killed.** `display_name` column added. |

### Merged
| Current | Into |
|---|---|
| `/daily-log` + retro-day browsing on Index | `/log` (Diary tab) with date param |
| `/weekly-summary` + `DailyInsightCard` generation logic | `/insights` (cached `ai_insights` + weekly check-in) |
| `/settings` goal drawers + `/goals` targets form | `/you/goals` (single editor, full field parity) |
| `/achievements` | `/you/milestones` |
| `/food-database` + meal templates/favorites + (new) custom foods | `/foods` |
| Two hero rings (`CalorieProgress`/`NetCalorieProgress`) + `MacroCard` ring | one shared `ProgressRing` |
| BMR/TDEE math in 3 files | `lib/energy.ts`; all unit handling in `lib/units.ts` (fixes exercise-kcal, weeks-to-goal, weight-chart unit bugs) |
| Two toast systems | sonner only |

### Kept (the strong bones)
- Bottom nav + center FAB + add-options sheet (rebuilt chrome, same IA).
- Photo-analysis UX: parallel upload-during-analysis, confidence badges, portion multipliers, re-analyze from cached image, abort/nav-guard, `AnalysisProgress` theater.
- `analyze-food`'s forced-tool-call structured output — now the pattern for **all** AI endpoints, plus server-side Zod validation, range clamping, macro-consistency check, and per-user rate limits (Postgres counter, 10 analyses/min).
- DB-trigger streak system — migrated to user-timezone day bucketing, made forgiving (1 free miss/week + "days logged this week" as the primary stat).
- `MealTypeSelector` time-of-day suggestion — now auto-applied.
- Undo toasts, soft delete, onboarding tooltips/progress dots, `SkeletonDashboard`, generate-insights' parallel data fetch (now behind caching).
- `user_goals` validation/trigger-initialization; RLS owner-check policies (extended to new tables); FKs restored everywhere by migration.

---

## 6. Onboarding Quiz — Verbatim Questions & Options

14 quiz steps + build + reveal + commit + signup. Progress bar on every step. Bracketed notes are implementation directives, not copy.

**Step 1 — Goal**
"What brings you to CalTrack?"
- Lose weight
- Maintain my weight
- Gain muscle
[Response: "Great — let's build a plan around that."]

**Step 2 — Prior experience** *(investment + segmentation; doesn't feed the calculation)*
"Have you tried tracking food before?"
- Yes, with another app
- Yes, on paper or in my head
- Never tracked before
[Response for app-switchers: "Then you'll like this: logging here takes about 3 seconds per meal." For never-trackers: "Perfect timing — we've made this the easy way to start."]

**Step 3 — Discovery** *(market research disguised as quiz)*
"Where did you hear about us?"
- A friend
- Instagram / TikTok / YouTube
- App store or web search
- Somewhere else

**Step 4 — Sex**
"What's your biological sex? We use this for your metabolic calculation — nothing else."
- Female
- Male
[Info tooltip: "Metabolic rate formulas differ by biological sex."]

**Step 5 — Age**
"How old are you?"
- [Number input, 13–100. Under 18 → gentle exit: "CalTrack is designed for adults."]

**Step 6 — Height**
"How tall are you?"
- [cm / ft-in toggle — sets `units_preference` for the whole app]

**Step 7 — Current weight**
"What's your current weight?"
- [kg / lb input matching units choice]
[Response: "Thanks — this stays private, always."]

**Step 8 — Activity level**
"Outside of workouts, how active is your typical day?"
- Mostly sitting (desk job, driving)
- On my feet some of the day (teaching, retail)
- Active most of the day (nursing, trades, delivery)
- Very physically demanding work
[Info: "We count deliberate exercise separately — this is about your baseline." Maps to activity multipliers; deliberately excludes exercise to avoid double-counting.]

**Step 9 — Exercise frequency**
"How many days a week do you exercise on purpose?"
- 0–1 | 2–3 | 4–5 | 6+
[Response at 2–3: "That's a solid base — consistency beats intensity."]

**Step 10 — Goal weight** *(skipped if Step 1 = Maintain)*
"What weight are you aiming for?"
- [Input with live guardrail. If implied loss >25% of body weight or target BMI <18.5: "Let's aim for [safe target] first — you can set a new goal when you get there." Blocks continue until adjusted.]
[Response when realistic: "Losing 6 kg is a very achievable target."]

**Step 11 — Pace**
"How fast do you want to get there?"
- Gentle — about 0.25 kg (0.5 lb) per week
- **Steady — about 0.5 kg (1 lb) per week (recommended)**
- Ambitious — about 0.75 kg (1.5 lb) per week
[Slider with highlighted recommended band; live-updating projection date below: "You'd reach 72 kg around November 9." Deficit >35% TDEE unavailable. Units follow Step 6.]

**Step 12 — Food style** *(feeds AI prompts + food defaults; Indian-aware)*
"How do you usually eat?"
- Vegetarian
- Eggetarian
- Non-vegetarian
- Vegan
Then: "Any of these apply?" (multi-select, optional)
- I mostly eat home-cooked Indian food
- I eat out / order in a lot
- I'm taking a GLP-1 medication (Ozempic, Wegovy, Mounjaro)
- None of these
[GLP-1 selection flips protein-first plan framing and enables GLP-1 mode at reveal.]

**Step 13 — Biggest obstacle** *(investment + future personalization)*
"What's made this hard in the past?"
- Logging felt like a chore
- Eating out and social meals
- Late-night snacking
- Losing motivation after a bad week
- Nothing yet — I'm new to this
[Response to "bad week": "Then you should know: one heavy day never breaks your plan here. We look at your week, not your worst day."]

**Step 14 — Expectations + notifications** *(trust screen + pre-permission primer)*
Screen A (no input): "Real talk: the scale often doesn't move in week one — water weight hides fat loss. Give it 14 days of honest logging and the trend will show. We'll never shame you for a number."
Screen B: "Want a nudge at your usual meal times? People with reminders log about twice as consistently. Max one reminder + one insight a day — and they stop when you've already logged."
- Yes, remind me
- No thanks
[Only "Yes" triggers the browser permission prompt.]

**Then:** Plan build animation (6s, named steps) → **Plan reveal** (named plan, calorie target, macro donut, projection curve, "we fine-tune weekly" footnote) → **Commit** (tap-and-hold "I'm in" + live social proof) → **Signup** (email + password; header: "Save your plan") → Today with first-scan prompt.

---

### Instrumentation commitments (so we know this IA works)
- Per-quiz-step drop-off; quiz completion ≠ activation.
- **Activation:** first photo log in session 1. **Core value:** 3+ logged days in week 1.
- Taps-to-logged and seconds-to-logged per source (`photo`/`text`/`quick`/`library`) as standing KPIs.
- Cohort retention at D1/D7/D30 plotted against the weeks 3–10 cliff; weekly check-in open rate and target-accept rate as the retention leading indicators.