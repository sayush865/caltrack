# Smarter "One big thing" + Insights tab + logging nuances

## How it works today (short answer)

"One big thing" on Today calls the `generate-insights` backend function. That function pulls your last 14 days of food, water, weight and streak data, computes averages, drops them into a prompt, and asks the AI for 3-5 short encouraging lines. The card shows only the **first** line. The result is cached in the browser per user per day, so it generates once a day (refresh button forces a new one).

Weaknesses: it is generic ("keep up the good work"), it is not really about *today* (14-day averages only), the other 2-4 generated insights are thrown away, output is free-form JSON that can drift, and it can't react to what you logged an hour ago.

## What it becomes

"One big thing" = **one prioritised, actionable line about your day right now**, not a random compliment.

The function gets a real deterministic snapshot before the AI ever runs:

- Today so far: calories eaten vs goal, remaining, projected end-of-day based on time and your usual eating curve, protein/fiber gap, water, exercise.
- Meal timing: what you've eaten, when, and gaps (e.g. 7h since last meal, late-night pattern).
- Rolling context: 7-day and 14-day averages, weekly surplus/deficit vs goal, weight trend, streak, adherence (days logged).
- Day state classification, computed in code: `surplus`, `on_track`, `under_eating`, `protein_short`, `fiber_short`, `no_logs_yet`, `low_water`, `late_start`, `plateau`, `strong_day`.

The AI is then asked for one focused headline + one concrete next action for that state, with a strict JSON schema (headline, body, category, one optional suggested action). Rules: reference a real number, name a concrete next step, no fluff, no emoji-spam (matches the minimalist rule).

**Surplus handling specifically:** when today is projected over goal, the insight becomes a recovery suggestion — e.g. "You're 420 over. A 35-min walk or a protein-forward dinner around 500 cal keeps the week on target." That comes with a tappable action chip that deep-links to Exercise or Describe prefilled.

Refresh cadence changes from once-a-day to: regenerate when the day state changes materially (crossed goal, first log of the day, new meal, 3h+ elapsed), still cached in between so it isn't chatty or expensive.

## Insights tab

- **Today's briefing** at the top: the full multi-insight set (all lines the AI returns, not just the first), grouped as What's working / What to fix / Next step, each with the number it's based on.
- **Weekly review**: calorie bars gain a goal line and surplus/deficit shading, plus a plain-language weekly verdict ("3 days over, net +820 — roughly 0.1 kg of drift").
- **Patterns section** (computed, no AI needed): best/worst weekday, average first-meal and last-meal time, protein hit-rate, most-logged foods, exercise consistency.
- **Macro averages** get target-vs-actual deltas instead of bare numbers.
- Existing plateau card stays, wired to the same day-state signals.
- Each card keeps its own skeleton; empty states say what to log to unlock the card.

## Logging nuances

1. **Order by time logged** — diary and Today meal lists sort chronologically within each meal group (earliest first inside a meal, meals in day order), and each row shows its time. Past-date logs currently all land at the same timestamp, so they'll keep insertion order.
2. **Time selection while logging** — the review sheet (photo, describe, food library, exercise, water) gets a time field next to the meal-type pills: defaults to now (or noon on a past date), tap to adjust with a compact hour/minute stepper. Meal type auto-suggests from the chosen time and stays overridable.
3. **Animation pass** — number count-ups on the hero when totals change, hairline progress transitions, staged sheet entry, chip press feedback, insight card cross-fade on refresh. All within the minimalist rule: no decorative glow, no bouncing, all respecting reduced-motion.

## Drinks: hydration + calories from one description

Right now a text description is treated purely as food, so "chia water" or "large iced latte" logs calories and no water — worth fixing.

Text/photo analysis gains a hydration field: each detected item can return `water_ml` alongside its macros (water 100% of volume, tea/coffee ~100%, chia water counts the liquid volume and the chia calories, milk/juice partial, alcohol 0). The review sheet then shows a "+ 350 ml water" line you can toggle off, and confirming writes the food log **and** the water log in one action. Plain water descriptions ("500ml water", "two glasses of water") skip the food log entirely and just log hydration.


## Technical details

- `supabase/functions/generate-insights/index.ts`: rewritten — deterministic snapshot builder + day-state classifier + strict `response_format` JSON schema; returns `{ headline, body, category, action?, state, snapshot }` plus a `briefing[]` array for the Insights tab. Falls back to a locally computed rule-based insight when the AI call fails, so the card is never empty.
- `src/lib/types.ts`: `Insight` extended (headline/body/action/state); `src/lib/analyze.ts` mapping updated.
- `src/hooks/useInsight.ts`: cache key becomes user + day + state-signature; exposes `briefing` and `action`.
- `src/components/today/InsightCard.tsx`: headline + body + action chip, cross-fade on refresh.
- `src/components/insights/*`: new `TodayBriefing.tsx` and `PatternsCard.tsx`; edits to `WeeklyCalorieChart`, `MacroAveragesCard`.
- Logging: `src/hooks/useDay.ts` sort order, `src/components/diary/MealGroup.tsx` + `LogItemRow` time display, new `TimeField` in `src/components/system/`, wired into `ScanReviewSheet`, `PortionSheet`, `DurationSheet`, `LogSheet`.
- Hydration: `analyze-food` / `analyze-food-text` schemas gain `water_ml` (+ a `drink_only` flag), mapped through `src/lib/analyze.ts` into `DraftItem`, surfaced in `ScanReviewSheet`, committed via the existing water mutation in `src/hooks/useMutations.ts`.
- No schema changes — `logged_at` already exists and is writable, and water logs already store `amount_ml`.

