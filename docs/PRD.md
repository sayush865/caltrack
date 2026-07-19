# CalTrack AI — Product Requirements Document (Rebuild)

**Status:** Approved for build. **Date:** 2026-07-20. **Constraint set:** Rebuild of the existing repo (React 18 + Vite + Tailwind + shadcn + Supabase). Existing schema extended via new migrations only; data-layer rewrites minimized. AI gateway: Lovable AI (Gemini) via the existing edge-function pattern.

---

## 1. Product Vision & Positioning

**Tagline: "Log it in a photo. Trust the number. Keep the habit."**

CalTrack AI is the honest AI-first nutrition tracker: sub-10-second multimodal logging (photo, text, barcode) that returns **decomposed, editable, confidence-labeled estimates** instead of Cal AI's opaque single number, paired with **adherence-neutral, adaptive weekly targets** instead of MyFitnessPal's static goals and red-number shaming. We win on the three things no leader combines: Cal AI's logging speed, MacroFactor's coaching intelligence and no-guilt tone, and Cronometer's trust posture — delivered as a mobile-first web/PWA (the surface every AI-native competitor ignores), with first-class support for Indian food, where every incumbent is weakest. The category's disease is week-2-to-10 churn driven by logging friction and shame; every product decision below is subordinated to killing those two churn drivers.

## 2. Target User & Jobs-to-be-Done

**Primary user:** The "pragmatic weight manager" — 22–45, smartphone-first, wants to lose or maintain weight without making tracking a hobby. Eats a mix of home-cooked (including Indian meals — katori/roti/dal units), restaurant, and packaged food. Has tried and abandoned MFP or Cal AI. Secondary segment (P1): GLP-1 users whose job flips from calorie restriction to protein/lean-mass protection.

**Top 3 Jobs-to-be-Done:**

1. **"Log this meal before I lose interest."** Get an accurate-enough record of what I just ate in under 10 seconds, from a photo, a sentence ("2 rotis with dal and chaas"), or a barcode — and let me fix the AI's guess in one tap when it's wrong.
2. **"Tell me if this is working, without doing math."** Turn my logs and weigh-ins into one clear answer — am I on track, what should my target be this week, and what one thing should I change — recalculated from *my* data, not a static formula from onboarding day.
3. **"Don't make me feel like garbage when I slip."** Let me miss a day, overeat at a wedding, or plateau for three weeks without red numbers, streak annihilation, or guilt notifications — and make coming back feel easy.

## 3. Competitive Strategy

### What we steal
| From | We take |
|---|---|
| **Cal AI** | The <3s photo-to-logged flow and confirmation-card UX; quiz onboarding ending in a personalized plan reveal with progress bar and affirmations; one-tap relog; light-default UI with big-numeral calorie ring hero; the Milestones/trophy-room pattern. |
| **MacroFactor** | Adaptive TDEE back-calculated from logged intake + smoothed weight trend with weekly target updates; adherence-neutral philosophy (over/under are data, never failure; missed days pause, never penalize); decomposed AI results — every scan becomes individual editable item rows; taps-to-logged as an instrumented KPI; trend weight everywhere, never raw scale weight. |
| **MyFitnessPal** | The unified logging surface (photo/text/barcode/search in one entry sheet); the 7-day weekly digest report; copy-yesterday / saved meals as the top friction reducers. |
| **SnapCalorie / research** | The "add a hint" correction field that re-runs the estimate; confidence rubric + clarifying-question UX; grams-first prompting with explicit upward bias correction for large portions. |

### What we deliberately skip (with prejudice)
- **Open-ended AI chat coach.** RCTs show no weight-loss effect at 6 months; MFP and Noom already own it. Our AI budget goes to logging accuracy and the weekly insight card.
- **Exercise-calorie eat-back (MFP model).** Overestimates 20–50% and confuses users. Activity is baked into the target; adaptive TDEE absorbs real exercise automatically. Exercise logging stays as a lightweight record, not a currency.
- **Social feeds / groups / friend streaks in v1.** Accountability matters at weeks 3–6, not day 1. A shareable weekly recap (P1) is the 80/20; a network is not.
- **84-nutrient micro panels.** Protein and fiber front-and-center; sat fat/sodium/sugar in the weekly report; the rest stays in a collapsed detail view. Cronometer owns that niche; contesting it is bloat.
- **Voice logging in v1.** Text describe-a-meal is the same pipeline minus speech-to-text and covers the job; voice is a P2 checkbox once the pipeline is proven.
- **Dark-pattern monetization.** No hidden variable pricing, no 3-day auto-renew traps, no retroactive paywalling. Cal AI got removed from the App Store for this; trust is our positioning.
- **Native app / HealthKit in v1.** No web API exists for HealthKit; adaptive TDEE conveniently doesn't need wearable data. PWA now, Terra-style bridge later (P2).
- **Noom-style curriculum, food color-coding (good/bad), weekly challenges, water gamification.** Guilt machinery or dead weight. The existing broken `weekly_challenges` table gets abandoned, not fixed.

## 4. Feature List

### P0 — Must ship in this rebuild

**Logging (the wedge):**
- **Unified Log sheet** (bottom-nav center FAB): photo, describe-in-text, barcode, search, recents/favorites in one surface — multimodal is table stakes; fragmenting entry points is why the current app has 4 inconsistent flows.
- **Photo analysis v2**: client-side compression to ≤768px WebP (single Gemini tile, ~$0.0013/analysis), Gemini 3 Flash via Lovable gateway, forced structured output using the research corpus's vision prompt (scene check → itemize → scale anchor → grams-first quantify → bias-correct → confidence → one clarifying question) — accuracy and cost both demand it.
- **Decomposed, editable confirmation screen**: per-item rows with portion steppers, confidence badges, "add a hint" re-run, single clarifying-question chip, `is_food:false` friendly handling — this screen is the product; it converts a 26–36% MAPE model into a trusted number.
- **`food_log_items` child table** (new migration; `food_logs` becomes the meal envelope): per-item name, quantity+unit, macros, confidence, source — the current app destroys per-item data at save time, blocking editing, favorites, and accuracy auditing forever.
- **Text describe-a-meal on the same JSON contract** as photo (items[], Hinglish/Indian-unit few-shots from the prompts research) — kills the current single-blob text flow and unlocks the Indian-food differentiator cheaply.
- **Barcode scan**: zxing-wasm ponyfill in-browser → OpenFoodFacts v2 called from the client (per-user IP rate budget), cached into our own foods table; NOVA group stored for later UPF surfacing — free verified data, and MFP's barcode paywall is the category's most-hated decision.
- **Recents, favorites, copy-yesterday, one-tap relog** — "the biggest single friction-reducing lever"; favorites are currently uncreatable dead code.
- **Retro-logging**: date + meal-time picker on every flow, meal type auto-defaulted from time of day — users can browse past days today but can't log to them; this is a basic contract violation.

**Coaching (the moat):**
- **Onboarding quiz rebuild**: goal → stats → activity → pace slider with recommended band and deficit cap (~35% TDEE) → plan-computing animation → plan reveal with date-stamped projection; account creation already exists so plan reveal lands immediately post-signup; every answer gets a response; first photo log prompted within 2 minutes of finishing — the converged conversion pattern across every winner, and it fixes the username-clobbering and dead-goals bugs.
- **Adaptive weekly check-in v1**: smoothed (exponentially weighted) weight trend + logged intake → weekly TDEE re-estimate → proposed target update the user accepts with one tap. Simple energy-balance math, not MacroFactor's full algorithm — even naive weekly recalibration differentiates us from every static-target app, and it gives users a functional reason to return weekly.
- **Weight logging rescued from the orphaned /goals page**: weigh-in entry on the dashboard + trend chart with unit column added to `weight_logs`; single source of truth synced to goals — the only weight UI in the current app is unreachable.
- **Daily insight card, cached**: generate once/day into a new `ai_insights` table (Gemini Flash, the anti-generic prompt from research), manual refresh — currently an uncached LLM call on every dashboard mount.

**Foundation (non-negotiable engineering):**
- **Data integrity migration**: restore FKs with ON DELETE CASCADE on all user tables (delete-account currently orphans everything — GDPR-grade), composite (user_id, logged_at) indexes, meal_type CHECK, `timezone` column on profiles with all day-bucketing/streak logic moved to user-local time, private food-images bucket, kill the email-leaking SECURITY DEFINER RPCs.
- **Shared edge-function module + per-user rate limiting** (Postgres counter, ~10 analyses/min): unify the 4x copy-pasted boilerplate, Zod-validate requests *and* model outputs, clamp ranges, stop leaking raw error messages, structured tool-calling everywhere.
- **React Query adoption end-to-end**: shared session/profile/goals cache, optimistic log mutations — the dashboard currently fires ~8 auth+fetch waterfalls per load.
- **Design system v1**: brand hue + macro identity palette (protein/carbs/fat/fiber) + semantic on-track/near/over colors as CSS variables; one webfont with display numerals; ONE ProgressRing component (animated fill + count-up); one card/radius/shadow system; safe-area insets + viewport-fit=cover + ≥44px targets; light-default, no dark mode in v1 (strip the 21 stale `dark:` classes) — the app currently ships gray confetti.
- **Auth completion**: forgot-password, email-verification UX, separate `display_name` column — table stakes we simply lack.
- **Streaks with forgiveness**: keep the DB-trigger architecture (the best-engineered part), move it to user timezone, add 1 free miss/week + earned streak freezes, count "days logged" alongside current streak, and never hard-reset to zero — strict streaks measurably cause abandonment. Rip out the 7 unearnable achievements; ship ~8 that all work, awarded server-side.

### P1 — Fast-follow (first 1–2 months post-launch)
- **Weekly Report / recap**: auto-generated 7-day digest (trend weight, adherence-neutral calorie/protein summary, best pattern, one suggested change), shareable card — the strongest documented long-term retention loop; needs 2+ weeks of user data to be good, hence P1.
- **GLP-1 mode**: protein ring as the hero, fiber/hydration floors, optional dose reminders + side-effect notes — clearest underserved fast-growing segment; ships as a mode toggle on existing infrastructure.
- **PWA install + notifications**: vite-plugin-pwa, iOS add-to-home-screen banner (browser-mode only), max 2 notifications/day (1 contextual meal reminder suppressed once logged + 1 insight), JITAI-style backoff on ignores.
- **Offline-tolerant logging**: TanStack persisted mutations + resumePausedMutations — real differentiator for a web app, but not launch-blocking.
- **Plateau & bad-day flows**: stall detection from the trend line around weeks 4–8 with data-grounded explanation and maintenance-phase offer; self-compassion copy after overages — evidence-backed retention, needs the trend engine live first.
- **Custom foods + verified-source badges**: user_id column on food_database, USDA/IFCT/OFF source flags — trust layer, sequenced after the logging pipeline stabilizes.
- **Milestones tab v2**: animated badges, streak-freeze inventory, logging micro-toasts ("Protein Power!") with real (non-gray) celebration.

### P2 — Later
- **Voice logging** (speech-to-text → existing text pipeline).
- **UPF/food-quality score** surfaced from stored NOVA data — next-battleground feature, needs data accumulation first.
- **Accountability lite**: share weekly recap with a buddy — after solo habit mechanics prove out.
- **Wearable bridge (Terra) / native shim** — only if adaptive TDEE demand for activity data materializes.
- **Data export + clinician-friendly reports** — feeds the web/PWA B2B second act.
- **Dark mode** — rebuilt properly on the new token system, stats-surfaces-first.

**Explicitly deleted from the current app:** weekly challenges, water-keyword easter egg in text flow, the 26-row Western-only food browse page as a primary surface (folded into unified search), duplicate goal editors (one Goals surface), dead components (ProfileMenu, WeightHistoryChart, CalorieProgress, SaveAsTemplateButton).

## 5. Retention Loop Design

Three nested loops, all adherence-neutral, all designed against the documented weeks-3–10 churn cliff:

- **Daily loop (<60s):** Open → ring shows calories left in trend context → log via photo/relog in <10s → immediate micro-feedback (ring animates, count-up, occasional "Protein Power!" toast — never for overages, never guilt). One contextual meal reminder max, anchored to the user's actual eating times, suppressed once logged, silenced after repeated ignores. Streak flame with week-strip day circles; a missed day consumes a freeze or the weekly free pass — the streak *decays*, never zeroes. "Day logged" = ≥2 eating occasions (the validated adherence marker).
- **Weekly loop (the engine):** Sunday check-in recalculates TDEE from trend weight + intake and proposes updated targets — returning weekly *changes your plan*, which is a functional reason to come back, not a nag. Paired with the Weekly Report recap (P1): one comparative trend, one win, one specific food-level suggestion citing the user's own data. Each week is self-contained; no make-up penalties.
- **Milestone loop:** day 7 / 30 / 100 celebrations, total-days-logged and longest-streak stats, trophy room with badges that are all actually earnable and awarded server-side. Real confetti, in color.
- **Rescue loops (churn-cliff specific):** week-2 "honest expectations" insight (water-weight slowdown is normal), weeks 4–8 plateau explanation from the user's own trend data with a maintenance-phase offer, and a lapsed-user return flow that says "welcome back, here's where your trend stands" — never "you broke your streak."

## 6. Monetization Stance for v1

**Decision: free at launch. Instrument everything; charge in v2.** Rationale: retention is unproven and retention is the whole game — a paywall on an app with 8% D30 monetizes churn. We ship the quiz-onboarding funnel with the plan-reveal moment already built (the paywall slot), so turning on monetization later is a config change, not a rebuild.

**Pre-committed v2 pricing posture (so we don't drift into Cal AI's sins):**
- **Freemium, transparent, no ads ever.** Free tier permanently includes: barcode scanning, manual/text logging, basic macros, weight trend, streaks. We never retroactively paywall — MFP's barcode-gating is the category's canonical betrayal.
- **Premium at $39.99/yr or $4.99/mo** (under Lose It!, half of MFP, Cal AI territory): unlimited AI photo analyses (free tier gets 3/day), adaptive weekly coaching, weekly report, GLP-1 mode, insights history.
- Pricing shown before trial, easy cancellation, pre-renewal reminder. Clean billing is a marketed trust feature in this category post-Cal-AI-delisting.

## 7. Success Metrics

**North star: % of weekly actives logging ≥2 eating occasions on ≥4 days/week** (the validated adherence marker, measured weekly).

**Activation (first session / week 1):**
- First successful AI photo log within 10 min of signup: **≥60%** (this, not onboarding completion, is activation).
- Onboarding quiz completion ≥75%; instrument per-screen drop-off.
- Logged on 3+ distinct days in week 1 (core-value event): **≥40%**.

**Speed & quality (product health):**
- Median taps-to-logged: photo ≤5, relog ≤3, barcode ≤5. Median photo-to-confirmed <15s end-to-end.
- AI edit rate: 30–60% of photo logs edited (below 30% means users aren't checking; above 60% means the model isn't trusted). Clarifying-question answer rate ≥25%.
- AI pipeline: schema-validation failure <1% after repair-retry; cost <$0.25/user/month.

**Retention (against category benchmarks D1 ~30%, D7 ~17%, D30 ~8–14%):**
- Targets: **D1 40% / D7 25% / D30 15% / D90 10%**, with explicit cohort tracking through the weeks-3–10 cliff.
- Streak-break survival: ≥50% of users who miss a day log again within 72h (the forgiveness-mechanics acid test).
- Weekly check-in acceptance rate ≥60% of eligible users (the loop's pulse).

**Trust:**
- Zero deceptive-pattern complaints; account deletion completes fully (verified by the restored cascades); support tickets about "wrong calories" trending down as hint/correction usage trends up.

**Kill criteria / re-plan triggers:** if D7 <15% after the first three cohorts, stop feature work and attack logging friction; if photo edit rate >70%, pause growth and re-benchmark the vision prompt/model on our own photo set.