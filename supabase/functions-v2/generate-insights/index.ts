// supabase/functions-v2/generate-insights/index.ts
// Personalized daily insights. v2 rebuild.
//
// Changes vs v1:
//   - Forced tool calling (v1 used "output ONLY a JSON array" + fence regex).
//   - Anti-generic prompt: every insight MUST cite a specific food, day, or
//     number from the provided data; banned stock phrases are validated in
//     code and trigger the repair-retry.
//   - Max 3 insights (v1 asked for 3-5).
//   - Day bucketing in the user's timezone (profiles.timezone when present,
//     added by migrations-v2/0001) instead of server UTC.
//   - Real error envelopes (v1 returned HTTP 200 with a canned fallback,
//     hiding every failure); the client keeps its own local fallback.
//   - Per-user rate limit (6/hour — the client caches once per day anyway).
//
// Request:  {} (POST, same as v1)
// Response: { insights: [{ category, emoji, message }] }  — SAME shape.
//           (emoji is populated server-side for backward compat; the v2
//            client maps category → lucide icon and ignores emoji.)

import {
  callGatewayTool,
  enforceRateLimit,
  errorResponse,
  handleOptions,
  jsonResponse,
  requireUser,
  serviceClient,
  V,
  ValidationError,
} from "../_shared/mod.ts";

const MODEL = "google/gemini-2.5-flash";

const CATEGORIES = [
  "strength",
  "improve",
  "goal",
  "quick_win",
  "celebration",
] as const;

const CATEGORY_EMOJI: Record<string, string> = {
  strength: "\u{1F4AA}", // 💪
  improve: "\u{1F3AF}", // 🎯
  goal: "\u{1F3C1}", // 🏁
  quick_win: "⚡", // ⚡
  celebration: "\u{1F389}", // 🎉
};

const BANNED_PHRASES = [
  "keep up the great work",
  "stay hydrated",
  "consistency is key",
  "balanced diet",
  "you're doing great",
  "small changes add up",
  "every step counts",
];

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are CalTrack's insight engine. You receive one user's last-14-day nutrition data and produce AT MOST 3 short insights via the report_insights tool.

HARD RULES:
1. SPECIFICITY IS MANDATORY. Every insight must cite at least one concrete number, named food, or named day taken from the data (e.g. "Tue you hit 142g protein", "3 of your last 5 dinners were biryani"). If an insight could apply to any random user, it is WRONG.
2. BANNED PHRASES — never use these or close paraphrases: ${BANNED_PHRASES.map((p) => `"${p}"`).join(", ")}.
3. STRUCTURE: specific observation → why it matters for THEIR stated goal → if suggesting a change, name a concrete food-level swap using foods they actually logged (e.g. "swap the 4pm samosa for roasted chana").
4. Each message under 100 characters. Plain text, no emoji inside messages.
5. TONE: warm, factual, adherence-neutral. Days over target are data, never failures. No shaming, no guilt.
6. COLD START: if total meals logged is under 10, return exactly ONE insight that cites how many meals/days they HAVE logged and the clearest pattern so far (e.g. "4 meals in 2 days logged — your 2 lunches averaged 58g protein, a strong start").
7. Prefer variety across categories. Never invent data that is not in the context.

Categories:
- strength: something measurably working (cite the number).
- improve: a data-grounded gap plus one concrete swap.
- goal: progress vs their goal numbers (calories, weight trend, protein).
- quick_win: one easy action for TODAY grounded in today's/yesterday's data.
- celebration: a concrete achievement (streak length, best day, goal hit).`;

// ---------------------------------------------------------------------------
// Tool schema + validation
// ---------------------------------------------------------------------------

const TOOL = {
  name: "report_insights",
  description:
    "Report 1-3 data-grounded insights. Every message must cite a specific number, food, or day from the provided data.",
  parameters: {
    type: "object",
    properties: {
      insights: {
        type: "array",
        description: "1 to 3 insights, most useful first",
        items: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: [...CATEGORIES],
            },
            message: {
              type: "string",
              description:
                "Under 100 chars. Must cite a specific number/food/day from the data. No emoji.",
            },
          },
          required: ["category", "message"],
        },
      },
    },
    required: ["insights"],
  },
};

interface InsightOut {
  category: (typeof CATEGORIES)[number];
  message: string;
}

const shapeValidator = V.object<{ insights: InsightOut[] } & Record<string, unknown>>({
  insights: V.array(
    V.object<InsightOut & Record<string, unknown>>({
      category: V.oneOf(CATEGORIES),
      message: V.string({ min: 5, max: 160 }),
    }),
    { min: 1, max: 3 },
  ),
});

function validateInsights(input: unknown, path?: string): { insights: InsightOut[] } {
  const parsed = shapeValidator(input, path);
  for (const insight of parsed.insights) {
    const lower = insight.message.toLowerCase();
    for (const banned of BANNED_PHRASES) {
      if (lower.includes(banned)) {
        throw new ValidationError(
          `message contains the banned generic phrase "${banned}" — replace it with a specific observation from the data`,
        );
      }
    }
    if (!/\d/.test(insight.message)) {
      throw new ValidationError(
        `message "${insight.message}" cites no specific number from the data — every insight must include at least one concrete figure`,
      );
    }
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Data context (day bucketing in the USER's timezone)
// ---------------------------------------------------------------------------

function dayKeyInTz(iso: string, timeZone: string): string {
  // en-CA gives YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function weekdayInTz(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" })
    .format(new Date(iso));
}

function safeTimeZone(tz: unknown): string {
  if (typeof tz !== "string" || tz.length === 0) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const supabase = serviceClient();
    const user = await requireUser(req, supabase);
    await enforceRateLimit(supabase, user.id, "generate-insights", 6, 3600);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const sinceISO = fourteenDaysAgo.toISOString();

    const [profileRes, goalsRes, logsRes, waterRes, weightRes, streakRes] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_goals").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("food_logs").select("food_name, calories, protein, carbs, fat, fiber, meal_type, logged_at")
          .eq("user_id", user.id).eq("status", 1).gte("logged_at", sinceISO),
        supabase.from("water_logs").select("amount_ml, logged_at")
          .eq("user_id", user.id).gte("logged_at", sinceISO),
        supabase.from("weight_logs").select("weight, logged_at")
          .eq("user_id", user.id).order("logged_at", { ascending: false }).limit(15),
        supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

    const profile = profileRes.data as Record<string, unknown> | null;
    const goals = goalsRes.data as Record<string, unknown> | null;
    const foodLogs = (logsRes.data ?? []) as Array<Record<string, unknown>>;
    const waterLogs = (waterRes.data ?? []) as Array<Record<string, unknown>>;
    const weightLogs = (weightRes.data ?? []) as Array<Record<string, unknown>>;
    const streak = streakRes.data as Record<string, unknown> | null;

    const tz = safeTimeZone(profile?.timezone);

    // --- per-day totals (user-local days) ---
    interface DayTotal {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
      meals: number;
      weekday: string;
    }
    const dayTotals: Record<string, DayTotal> = {};
    const foodFreq: Record<string, { count: number; totalKcal: number }> = {};

    for (const log of foodLogs) {
      const iso = String(log.logged_at);
      const day = dayKeyInTz(iso, tz);
      if (!dayTotals[day]) {
        dayTotals[day] = {
          calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, meals: 0,
          weekday: weekdayInTz(iso, tz),
        };
      }
      const d = dayTotals[day];
      d.calories += Number(log.calories) || 0;
      d.protein += Number(log.protein) || 0;
      d.carbs += Number(log.carbs) || 0;
      d.fat += Number(log.fat) || 0;
      d.fiber += Number(log.fiber) || 0;
      d.meals += 1;

      const name = String(log.food_name ?? "").trim().toLowerCase();
      if (name) {
        foodFreq[name] = foodFreq[name] ?? { count: 0, totalKcal: 0 };
        foodFreq[name].count += 1;
        foodFreq[name].totalKcal += Number(log.calories) || 0;
      }
    }

    const dayKeys = Object.keys(dayTotals).sort();
    const daysLogged = dayKeys.length;
    const totalMeals = foodLogs.length;
    const avg = (fn: (d: DayTotal) => number) =>
      daysLogged > 0
        ? Math.round(dayKeys.reduce((s, k) => s + fn(dayTotals[k]), 0) / daysLogged)
        : 0;

    const dayLines = dayKeys.map((k) => {
      const d = dayTotals[k];
      return `  ${k} (${d.weekday}): ${Math.round(d.calories)} kcal, ${Math.round(d.protein)}g P, ${Math.round(d.carbs)}g C, ${Math.round(d.fat)}g F, ${Math.round(d.fiber)}g fiber, ${d.meals} meal(s)`;
    }).join("\n");

    const topFoods = Object.entries(foodFreq)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([name, f]) =>
        `  ${name} — ${f.count}x, avg ${Math.round(f.totalKcal / f.count)} kcal`
      ).join("\n");

    // --- water ---
    const waterByDay: Record<string, number> = {};
    for (const log of waterLogs) {
      const day = dayKeyInTz(String(log.logged_at), tz);
      waterByDay[day] = (waterByDay[day] ?? 0) + (Number(log.amount_ml) || 0);
    }
    const waterDays = Object.values(waterByDay);
    const avgWater = waterDays.length > 0
      ? Math.round(waterDays.reduce((s, v) => s + v, 0) / waterDays.length)
      : 0;

    // --- weight trend ---
    const latestWeight = weightLogs[0]?.weight;
    const oldestWeight = weightLogs[weightLogs.length - 1]?.weight;
    const weightChange = latestWeight != null && oldestWeight != null
      ? Number(latestWeight) - Number(oldestWeight)
      : null;

    const now = new Date();
    const localHour = Number(
      new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false })
        .format(now),
    );
    const timeOfDay = localHour < 12 ? "morning" : localHour < 17 ? "afternoon" : "evening";
    const todayKey = dayKeyInTz(now.toISOString(), tz);
    const today = dayTotals[todayKey];

    const userContext = `USER DATA (last 14 days, all days in the user's local timezone ${tz}):

Profile: age ${profile?.age ?? "unknown"}, gender ${profile?.gender ?? "unknown"}, activity ${profile?.activity_level ?? "unknown"}
Goal: ${goals?.goal_type ?? "maintain"} weight | current ${goals?.current_weight ?? "?"} kg -> target ${goals?.goal_weight ?? "?"} kg
Daily targets: ${goals?.daily_calories ?? 2000} kcal, ${goals?.daily_protein ?? 120}g protein, ${goals?.daily_carbs ?? 250}g carbs, ${goals?.daily_fat ?? 65}g fat, ${goals?.daily_fiber ?? 25}g fiber, ${goals?.daily_water ?? 2000}ml water

Totals: ${totalMeals} meals over ${daysLogged}/14 days logged
Averages on logged days: ${avg((d) => d.calories)} kcal, ${avg((d) => d.protein)}g protein, ${avg((d) => d.carbs)}g carbs, ${avg((d) => d.fat)}g fat, ${avg((d) => d.fiber)}g fiber
Average water: ${avgWater} ml/day over ${waterDays.length} day(s) with water logged

Per-day breakdown:
${dayLines || "  (no food logged in the last 14 days)"}

Most-logged foods:
${topFoods || "  (none)"}

Weight: latest ${latestWeight ?? "no data"} kg, change over last ${weightLogs.length} weigh-ins: ${
      weightChange !== null ? `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)} kg` : "no data"
    }
Streak: current ${streak?.current_streak ?? 0} day(s), longest ${streak?.longest_streak ?? 0} day(s)
Right now for the user it is ${timeOfDay} on ${weekdayInTz(now.toISOString(), tz)}.${
      today
        ? ` So far today: ${Math.round(today.calories)} kcal, ${Math.round(today.protein)}g protein over ${today.meals} meal(s).`
        : " Nothing logged yet today."
    }`;

    const result = await callGatewayTool<{ insights: InsightOut[] }>({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContext },
      ],
      tool: TOOL,
      validate: validateInsights,
    });

    // Backward-compatible shape: { insights: [{ category, emoji, message }] }
    const insights = result.insights.slice(0, 3).map((i) => ({
      category: i.category,
      emoji: CATEGORY_EMOJI[i.category] ?? "",
      message: i.message,
    }));

    console.log(JSON.stringify({
      event: "insights_generated",
      model: MODEL,
      count: insights.length,
      days_logged: daysLogged,
      total_meals: totalMeals,
      tz,
    }));

    return jsonResponse({ insights });
  } catch (error) {
    return errorResponse(error);
  }
});
