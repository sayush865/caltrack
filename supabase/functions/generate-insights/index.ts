// generate-insights — "One big thing" + daily briefing.
//
// Two stages:
//  1. Deterministic snapshot + day-state classifier (pure code, always available).
//  2. AI pass (strict JSON schema) that turns the snapshot into one prioritised
//     headline + concrete next action, plus a short briefing list.
// If the AI call fails, the rule-based fallback insights are returned instead, so
// the card is NEVER empty.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ActionKind = "exercise" | "describe" | "scan" | "water" | "weight" | "none";

interface OutInsight {
  category: string;
  headline: string;
  message: string;
  action?: { kind: ActionKind; label: string };
}

interface OutTrend {
  tag: string;
  title: string;
  message: string;
  metric: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function r(n: number): number {
  return Math.round(n);
}

/** Local-day key for a timestamp given the client's UTC offset (minutes, as from getTimezoneOffset). */
function localKey(iso: string, offsetMin: number): string {
  const t = new Date(iso).getTime() - offsetMin * 60_000;
  return new Date(t).toISOString().slice(0, 10);
}

function localHour(iso: string, offsetMin: number): number {
  const t = new Date(iso).getTime() - offsetMin * 60_000;
  return new Date(t).getUTCHours();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ error: "Invalid user" }, 401);

    // Client sends its local day + tz offset so buckets match the app exactly.
    let body: { dayKey?: string; tzOffsetMinutes?: number } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const offsetMin = Number.isFinite(body.tzOffsetMinutes) ? Number(body.tzOffsetMinutes) : 0;
    const nowIso = new Date().toISOString();
    const todayKey = body.dayKey && /^\d{4}-\d{2}-\d{2}$/.test(body.dayKey)
      ? body.dayKey
      : localKey(nowIso, offsetMin);
    const hourNow = localHour(nowIso, offsetMin);

    const since = new Date(Date.now() - 29 * 86_400_000).toISOString();

    const [profileRes, goalsRes, logsRes, waterRes, exerciseRes, weightRes, streakRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("user_goals").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("food_logs").select("food_name, calories, protein, carbs, fat, fiber, vitamin_a, vitamin_c, calcium, iron, meal_type, logged_at")
        .eq("user_id", user.id).eq("status", 1).gte("logged_at", since),
      supabase.from("water_logs").select("amount_ml, logged_at").eq("user_id", user.id).gte("logged_at", since),
      supabase.from("exercise_logs").select("exercise_name, duration_minutes, calories_burned, logged_at")
        .eq("user_id", user.id).eq("status", 1).gte("logged_at", since),
      supabase.from("weight_logs").select("weight, logged_at").eq("user_id", user.id)
        .order("logged_at", { ascending: false }).limit(20),
      supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

    const profile = profileRes.data as Record<string, unknown> | null;
    const goals = (goalsRes.data ?? {}) as Record<string, number | string | null>;
    const foodLogs = (logsRes.data ?? []) as Array<Record<string, unknown>>;
    const waterLogs = (waterRes.data ?? []) as Array<Record<string, unknown>>;
    const exerciseLogs = (exerciseRes.data ?? []) as Array<Record<string, unknown>>;
    const weightLogs = (weightRes.data ?? []) as Array<Record<string, unknown>>;
    const streak = streakRes.data as Record<string, number> | null;

    const goalCal = Number(goals.daily_calories ?? 0) || 2000;
    const goalProtein = Number(goals.daily_protein ?? 0) || 150;
    const goalFiber = Number(goals.daily_fiber ?? 0) || 30;
    const goalWater = Number(goals.daily_water ?? 0) || 2000;
    const goalType = String(goals.goal_type ?? "maintain");

    /* ── bucket per local day ─────────────────────────────────── */
    type Bucket = {
      calories: number; protein: number; carbs: number; fat: number; fiber: number;
      vitaminA: number; vitaminC: number; calcium: number; iron: number;
      water: number; burned: number; exMinutes: number; times: number[];
      items: string[];
      byMeal: Record<string, number>;
    };
    const empty = (): Bucket => ({
      calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
      vitaminA: 0, vitaminC: 0, calcium: 0, iron: 0,
      water: 0, burned: 0, exMinutes: 0, times: [], items: [],
      byMeal: { breakfast: 0, lunch: 0, snack: 0, dinner: 0 },
    });
    const byDay = new Map<string, Bucket>();
    const bucket = (key: string): Bucket => {
      let b = byDay.get(key);
      if (!b) { b = empty(); byDay.set(key, b); }
      return b;
    };

    for (const log of foodLogs) {
      const iso = String(log.logged_at ?? "");
      if (!iso) continue;
      const b = bucket(localKey(iso, offsetMin));
      b.calories += Number(log.calories ?? 0);
      b.protein += Number(log.protein ?? 0);
      b.carbs += Number(log.carbs ?? 0);
      b.fat += Number(log.fat ?? 0);
      b.fiber += Number(log.fiber ?? 0);
      b.vitaminA += Number(log.vitamin_a ?? 0);
      b.vitaminC += Number(log.vitamin_c ?? 0);
      b.calcium += Number(log.calcium ?? 0);
      b.iron += Number(log.iron ?? 0);
      const mt = String(log.meal_type ?? "snack").toLowerCase();
      if (mt in b.byMeal) b.byMeal[mt] += Number(log.calories ?? 0);
      b.times.push(localHour(iso, offsetMin));
      if (log.food_name) b.items.push(String(log.food_name));
    }
    for (const log of waterLogs) {
      const iso = String(log.logged_at ?? "");
      if (!iso) continue;
      bucket(localKey(iso, offsetMin)).water += Number(log.amount_ml ?? 0);
    }
    for (const log of exerciseLogs) {
      const iso = String(log.logged_at ?? "");
      if (!iso) continue;
      const b = bucket(localKey(iso, offsetMin));
      b.burned += Number(log.calories_burned ?? 0);
      b.exMinutes += Number(log.duration_minutes ?? 0);
    }

    const today = byDay.get(todayKey) ?? empty();

    // Rolling windows exclude today (partial day would skew averages).
    const pastKeys = [...byDay.keys()].filter((k) => k < todayKey).sort();
    const last7 = pastKeys.slice(-7).map((k) => byDay.get(k)!);
    const last14 = pastKeys.slice(-14).map((k) => byDay.get(k)!);
    const loggedPast = last14.filter((b) => b.calories > 0);
    const avg = (arr: Bucket[], pick: (b: Bucket) => number) =>
      arr.length ? arr.reduce((s, b) => s + pick(b), 0) / arr.length : 0;

    const avg7Cal = r(avg(last7.filter((b) => b.calories > 0), (b) => b.calories));
    const avg14Cal = r(avg(loggedPast, (b) => b.calories));
    const avg14Protein = r(avg(loggedPast, (b) => b.protein));
    const avg14Fiber = r(avg(loggedPast, (b) => b.fiber));
    const avg7Water = r(avg(last7.filter((b) => b.water > 0), (b) => b.water));

    // Weekly net drift vs goal across the last 7 logged days.
    const weekNet = r(
      last7.filter((b) => b.calories > 0).reduce((s, b) => s + (b.calories - b.burned - goalCal), 0),
    );

    const netToday = r(today.calories - today.burned);
    const remaining = r(goalCal - netToday);
    // Typical share of the day's calories consumed by this hour (eating curve).
    const curve = hourNow < 9 ? 0.12 : hourNow < 12 ? 0.28 : hourNow < 15 ? 0.55 : hourNow < 19 ? 0.75 : hourNow < 22 ? 0.95 : 1;
    const projected = netToday > 0 ? r(netToday / curve) : 0;

    const weights = weightLogs.map((w) => Number(w.weight)).filter((n) => Number.isFinite(n));
    const latestWeight = weights[0] ?? null;
    const weightChange = weights.length >= 2 ? Number((weights[0] - weights[weights.length - 1]).toFixed(1)) : null;

    const mealsToday = foodLogs.filter((l) => localKey(String(l.logged_at ?? nowIso), offsetMin) === todayKey);
    const lastMealHour = today.times.length ? Math.max(...today.times) : null;
    const firstMealHour = today.times.length ? Math.min(...today.times) : null;

    /* ── day state ────────────────────────────────────────────── */
    let state = "on_track";
    if (mealsToday.length === 0) state = hourNow >= 14 ? "late_start" : "no_logs_yet";
    else if (netToday > goalCal * 1.05) state = "surplus";
    else if (projected > goalCal * 1.1) state = "trending_over";
    else if (hourNow >= 20 && netToday < goalCal * 0.7) state = "under_eating";
    else if (hourNow >= 17 && today.protein < goalProtein * 0.6) state = "protein_short";
    else if (hourNow >= 17 && goalFiber > 0 && today.fiber < goalFiber * 0.5) state = "fiber_short";
    else if (hourNow >= 15 && goalWater > 0 && today.water < goalWater * 0.4) state = "low_water";
    else if (netToday >= goalCal * 0.85 && netToday <= goalCal * 1.02 && today.protein >= goalProtein * 0.85)
      state = "strong_day";

    const overBy = Math.max(0, netToday - goalCal);
    const projectedOverBy = Math.max(0, projected - goalCal);

    const snapshot = {
      state,
      hour: hourNow,
      goal: goalCal,
      goalType,
      eaten: r(today.calories),
      burned: r(today.burned),
      net: netToday,
      remaining,
      projected,
      protein: r(today.protein),
      goalProtein,
      fiber: r(today.fiber),
      goalFiber,
      water: r(today.water),
      goalWater,
      mealsLogged: mealsToday.length,
      firstMealHour,
      lastMealHour,
      avg7Cal,
      avg14Cal,
      avg14Protein,
      avg14Fiber,
      avg7Water,
      weekNet,
      daysLogged: loggedPast.length,
      streak: streak?.current_streak ?? 0,
      latestWeight,
      weightChange,
      exerciseMinutesToday: r(today.exMinutes),
    };

    /* ── aggregate view: rolling 28 days, week over week ──────── */
    const dayOf = (key: string) => new Date(`${key}T00:00:00Z`).getUTCDay(); // 0 Sun

    const window28 = pastKeys.slice(-28);
    const loggedKeys = window28.filter((k) => (byDay.get(k)!.calories ?? 0) > 0);
    const wk = (keys: string[]) => keys.map((k) => byDay.get(k)!).filter((b) => b.calories > 0);
    const thisWeekKeys = pastKeys.slice(-7);
    const prevWeekKeys = pastKeys.slice(-14, -7);
    const thisWeek = wk(thisWeekKeys);
    const prevWeek = wk(prevWeekKeys);

    const stat = (arr: Bucket[], pick: (b: Bucket) => number) => (arr.length ? r(avg(arr, pick)) : null);
    const weekSummary = (arr: Bucket[], keys: string[]) => ({
      daysLogged: arr.length,
      daysInWindow: keys.length,
      cal: stat(arr, (b) => b.calories),
      net: stat(arr, (b) => b.calories - b.burned),
      protein: stat(arr, (b) => b.protein),
      fiber: stat(arr, (b) => b.fiber),
      carbs: stat(arr, (b) => b.carbs),
      fat: stat(arr, (b) => b.fat),
      water: stat(arr, (b) => b.water),
      burned: stat(arr, (b) => b.burned),
      exerciseMinutes: r(arr.reduce((sum, b) => sum + b.exMinutes, 0)),
      daysOverGoal: arr.filter((b) => b.calories - b.burned > goalCal * 1.05).length,
      daysUnderGoal: arr.filter((b) => b.calories - b.burned < goalCal * 0.85).length,
      daysOnTarget: arr.filter((b) => {
        const n = b.calories - b.burned;
        return n >= goalCal * 0.85 && n <= goalCal * 1.05;
      }).length,
    });

    const allLogged = wk(loggedKeys);
    const rate = (arr: Bucket[], ok: (b: Bucket) => boolean) =>
      arr.length ? Math.round((arr.filter(ok).length / arr.length) * 100) : null;

    // Where the day's calories land, averaged over logged days.
    const mealSplit = (() => {
      if (!allLogged.length) return null;
      const totals = { breakfast: 0, lunch: 0, snack: 0, dinner: 0 };
      let sum = 0;
      for (const b of allLogged) {
        for (const k of Object.keys(totals) as Array<keyof typeof totals>) totals[k] += b.byMeal[k] ?? 0;
        sum += b.calories;
      }
      if (sum <= 0) return null;
      return {
        breakfastPct: Math.round((totals.breakfast / sum) * 100),
        lunchPct: Math.round((totals.lunch / sum) * 100),
        snackPct: Math.round((totals.snack / sum) * 100),
        dinnerPct: Math.round((totals.dinner / sum) * 100),
      };
    })();

    // Weekday vs weekend averages (Sat/Sun).
    const weekendKeys = loggedKeys.filter((k) => [0, 6].includes(dayOf(k)));
    const weekdayKeys = loggedKeys.filter((k) => ![0, 6].includes(dayOf(k)));

    // Recurring foods across the window.
    const foodCounts = new Map<string, number>();
    for (const key of loggedKeys) {
      for (const item of byDay.get(key)!.items) {
        const name = item.trim().toLowerCase().slice(0, 40);
        if (name) foodCounts.set(name, (foodCounts.get(name) ?? 0) + 1);
      }
    }
    const topFoods = [...foodCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));

    // Micronutrient adequacy vs ICMR-NIN 2020 adult references (India-first).
    const MICRO_RDA = { vitaminA: 900, vitaminC: 80, calcium: 1000, iron: 19 };
    const micros = allLogged.length
      ? {
          vitaminAPct: Math.round((avg(allLogged, (b) => b.vitaminA) / MICRO_RDA.vitaminA) * 100),
          vitaminCPct: Math.round((avg(allLogged, (b) => b.vitaminC) / MICRO_RDA.vitaminC) * 100),
          calciumPct: Math.round((avg(allLogged, (b) => b.calcium) / MICRO_RDA.calcium) * 100),
          ironPct: Math.round((avg(allLogged, (b) => b.iron) / MICRO_RDA.iron) * 100),
        }
      : null;

    // Weight trend across the logged history (rate per week).
    const weightTrend = (() => {
      if (weightLogs.length < 2) return null;
      const sorted = [...weightLogs]
        .map((w) => ({ w: Number(w.weight), t: new Date(String(w.logged_at)).getTime() }))
        .filter((x) => Number.isFinite(x.w))
        .sort((a, b) => a.t - b.t);
      if (sorted.length < 2) return null;
      const spanWeeks = (sorted[sorted.length - 1].t - sorted[0].t) / (7 * 86_400_000);
      if (spanWeeks < 0.5) return null;
      const delta = sorted[sorted.length - 1].w - sorted[0].w;
      return {
        from: sorted[0].w,
        to: sorted[sorted.length - 1].w,
        deltaTotal: Number(delta.toFixed(1)),
        perWeek: Number((delta / spanWeeks).toFixed(2)),
        spanWeeks: Number(spanWeeks.toFixed(1)),
        entries: sorted.length,
      };
    })();

    const lateCalorieShare = (() => {
      let late = 0;
      let total = 0;
      for (const log of foodLogs) {
        const iso = String(log.logged_at ?? "");
        if (!iso) continue;
        const cal = Number(log.calories ?? 0);
        total += cal;
        if (localHour(iso, offsetMin) >= 21) late += cal;
      }
      return total > 0 ? Math.round((late / total) * 100) : null;
    })();

    const aggregate = {
      windowDays: window28.length,
      daysLogged: loggedKeys.length,
      loggingRate: window28.length ? Math.round((loggedKeys.length / window28.length) * 100) : null,
      goal: goalCal,
      goalType,
      thisWeek: weekSummary(thisWeek, thisWeekKeys),
      prevWeek: weekSummary(prevWeek, prevWeekKeys),
      deltaVsPrevWeek: {
        cal: thisWeek.length && prevWeek.length ? r(avg(thisWeek, (b) => b.calories) - avg(prevWeek, (b) => b.calories)) : null,
        protein: thisWeek.length && prevWeek.length ? r(avg(thisWeek, (b) => b.protein) - avg(prevWeek, (b) => b.protein)) : null,
        fiber: thisWeek.length && prevWeek.length ? r(avg(thisWeek, (b) => b.fiber) - avg(prevWeek, (b) => b.fiber)) : null,
        water: thisWeek.length && prevWeek.length ? r(avg(thisWeek, (b) => b.water) - avg(prevWeek, (b) => b.water)) : null,
      },
      hitRates: {
        caloriesOnTarget: rate(allLogged, (b) => {
          const n = b.calories - b.burned;
          return n >= goalCal * 0.85 && n <= goalCal * 1.05;
        }),
        protein: rate(allLogged, (b) => b.protein >= goalProtein * 0.9),
        fiber: goalFiber > 0 ? rate(allLogged, (b) => b.fiber >= goalFiber * 0.9) : null,
        water: goalWater > 0 ? rate(allLogged, (b) => b.water >= goalWater * 0.9) : null,
      },
      weekdayVsWeekend: {
        weekdayCal: stat(wk(weekdayKeys), (b) => b.calories),
        weekendCal: stat(wk(weekendKeys), (b) => b.calories),
        weekendDays: weekendKeys.length,
      },
      mealSplit,
      lateCalorieShare,
      micros,
      topFoods,
      weightTrend,
      streak: streak?.current_streak ?? 0,
      longestStreak: streak?.longest_streak ?? 0,
    };

    /* ── deterministic fallback insights ──────────────────────── */
    const walkMinutes = Math.max(15, Math.min(90, Math.round((overBy || projectedOverBy) / 5)));
    const fallback: OutInsight[] = (() => {
      switch (state) {
        case "no_logs_yet":
          return [{
            category: "quick_win",
            headline: "Nothing logged yet today",
            message: `Your target is ${goalCal} kcal. Snap your next plate and the rest of the day plans itself.`,
            action: { kind: "scan", label: "Log a meal" },
          }];
        case "late_start":
          return [{
            category: "improve",
            headline: "The day is half gone, untracked",
            message: `Log what you've had so far — even rough numbers keep your ${goalCal} kcal target meaningful.`,
            action: { kind: "describe", label: "Describe a meal" },
          }];
        case "surplus":
          return [{
            category: "improve",
            headline: `You're ${overBy} kcal over target`,
            message: `A ${walkMinutes}-min brisk walk burns roughly ${walkMinutes * 5} kcal and brings today back in line.`,
            action: { kind: "exercise", label: "Log a walk" },
          }];
        case "trending_over":
          return [{
            category: "improve",
            headline: `On pace for ${projected} kcal`,
            message: `That's ${projectedOverBy} over your ${goalCal} target. Keep dinner protein-forward and around ${Math.max(300, remaining)} kcal.`,
            action: { kind: "none", label: "" },
          }];
        case "under_eating":
          return [{
            category: "improve",
            headline: `${remaining} kcal still unspent`,
            message: "Under-eating stalls progress as surely as over-eating. A solid protein snack closes the gap.",
            action: { kind: "describe", label: "Log a snack" },
          }];
        case "protein_short":
          return [{
            category: "improve",
            headline: `Protein at ${r(today.protein)}g of ${goalProtein}g`,
            message: "Anchor your next meal on protein — curd, eggs, chicken or dal will cover most of what's left.",
            action: { kind: "none", label: "" },
          }];
        case "fiber_short":
          return [{
            category: "improve",
            headline: `Fiber at ${r(today.fiber)}g of ${goalFiber}g`,
            message: "Add a fruit, salad or a spoon of chia to your next meal to close the gap.",
            action: { kind: "none", label: "" },
          }];
        case "low_water":
          return [{
            category: "quick_win",
            headline: `Only ${r(today.water)} ml of water so far`,
            message: `Two glasses now puts you back on pace for ${goalWater} ml.`,
            action: { kind: "water", label: "Add water" },
          }];
        case "strong_day":
          return [{
            category: "celebration",
            headline: "Today is a textbook day",
            message: `${netToday} kcal net against a ${goalCal} target with ${r(today.protein)}g protein. Repeat this and the trend does the rest.`,
            action: { kind: "none", label: "" },
          }];
        default:
          return [{
            category: "goal",
            headline: `${remaining} kcal left today`,
            message: `You're at ${netToday} of ${goalCal}. Your 7-day average is ${avg7Cal || "—"} kcal.`,
            action: { kind: "none", label: "" },
          }];
      }
    })();

    const MOTIVATION_LINES = [
      "Logging is the whole trick. The numbers only work when they exist.",
      "One honest day beats three perfect ones you didn't record.",
      "Protein early makes the evening easier. Nothing mystical, just fullness.",
      "Trends move slowly and that's fine — you're playing the long game.",
      "Water is the cheapest win on this screen.",
      "A slightly-over day is a rounding error across a week.",
    ];
    const motivation: OutInsight = {
      category: "motivation",
      headline: "",
      message: MOTIVATION_LINES[(snapshot.hour + snapshot.mealsLogged + snapshot.daysLogged) % MOTIVATION_LINES.length],
      action: { kind: "none", label: "" },
    };
    const fallbackWithSpark = [...fallback, motivation];

    /* ── deterministic aggregate trends (always available) ────── */
    const trendFallback = (() => {
      const out: OutTrend[] = [];
      const tw = aggregate.thisWeek;
      const pw = aggregate.prevWeek;
      if (tw.cal !== null && pw.cal !== null) {
        const d = tw.cal - pw.cal;
        out.push({
          tag: Math.abs(d) < 75 ? "pattern" : d > 0 ? "risk" : "win",
          title: Math.abs(d) < 75 ? "Intake is steady week over week" : `${d > 0 ? "Up" : "Down"} ${Math.abs(d)} kcal a day`,
          message: `Last 7 days averaged ${tw.cal} kcal against ${pw.cal} the week before, on a ${goalCal} target.`,
          metric: `${tw.cal} vs ${pw.cal} kcal`,
        });
      }
      if (aggregate.hitRates.protein !== null) {
        out.push({
          tag: aggregate.hitRates.protein >= 70 ? "win" : "risk",
          title: `Protein hit on ${aggregate.hitRates.protein}% of days`,
          message: `You averaged ${tw.protein ?? avg14Protein}g against a ${goalProtein}g target across ${aggregate.daysLogged} logged days.`,
          metric: `${aggregate.hitRates.protein}% of days`,
        });
      }
      if (aggregate.mealSplit) {
        out.push({
          tag: "pattern",
          title: `Dinner carries ${aggregate.mealSplit.dinnerPct}% of your day`,
          message: `Split runs breakfast ${aggregate.mealSplit.breakfastPct}%, lunch ${aggregate.mealSplit.lunchPct}%, snacks ${aggregate.mealSplit.snackPct}%, dinner ${aggregate.mealSplit.dinnerPct}%.`,
          metric: `${aggregate.mealSplit.dinnerPct}% at dinner`,
        });
      }
      if (aggregate.loggingRate !== null) {
        out.push({
          tag: aggregate.loggingRate >= 70 ? "win" : "risk",
          title: `Logged ${aggregate.daysLogged} of the last ${aggregate.windowDays} days`,
          message: "Gaps in the record are the main reason averages drift. Consistency beats precision here.",
          metric: `${aggregate.loggingRate}% coverage`,
        });
      }
      return out.slice(0, 4);
    })();

    const verdictFallback = aggregate.thisWeek.cal !== null
      ? `${aggregate.thisWeek.daysLogged} days logged this week at ${aggregate.thisWeek.cal} kcal a day against a ${goalCal} target.`
      : "Not enough logged days yet to read a trend. A few more days and the patterns show up.";

    if (!lovableApiKey) {
      return json({
        insights: fallbackWithSpark, snapshot, state, aggregate,
        trends: trendFallback, verdict: verdictFallback, source: "rules",
      });
    }


    /* ── AI pass ──────────────────────────────────────────────── */
    const sparkAngles = [
      "a small fun food-science fact tied to something they ate or their macros",
      "a light, dry one-liner of encouragement about the habit of logging",
      "a tiny reframe: what today's numbers would look like repeated for a week",
      "a playful nudge about the next meal, no numbers required",
      "a short note on why consistency beats perfect days",
      "an interesting nutrition tidbit relevant to their goal type",
    ];
    const spark = sparkAngles[(snapshot.hour + snapshot.mealsLogged + snapshot.daysLogged) % sparkAngles.length];

    const systemPrompt = `You are CalTrack's nutrition coach. You get a precomputed snapshot of the user's day and rolling averages, plus a classified day state. You do NOT compute anything new — only interpret.

Write:
1. ONE primary insight for the classified state: a headline (max 48 chars, states the fact with the real number) and a message (max 140 chars, ONE concrete next step the user can act on in the next few hours).
2. Two to four short briefing insights: what's working, what to fix, and one pattern from the rolling averages.
3. Exactly one final insight with category "motivation": ${spark}. Max 120 chars, no numbers you weren't given, action.kind "none". This one may be warm or lightly witty — still no emoji and no hype.

Rules:
- Always reference real numbers from the snapshot. Never invent data or numbers.
- If state is surplus or trending_over, the primary insight MUST be a recovery suggestion: a specific activity (with an approximate burn) or a specific calorie ceiling for the next meal.
- Plain, calm, adult tone. No emoji, no exclamation marks, no hype, no "amazing journey" language.
- Never suggest anything medically risky, never mention fasting for whole days, never shame the user.
- Set action.kind to the screen that helps most: exercise (log activity), describe (log a meal by text), scan (photo a meal), water, weight, or none. action.label is max 18 chars, empty when kind is none.
- The first insight in the array is the primary one; the motivation one is last.`;

    const schema = {
      type: "object",
      additionalProperties: false,
      required: ["insights"],
      properties: {
        insights: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["category", "headline", "message", "action"],
            properties: {
              category: { type: "string", enum: ["strength", "improve", "goal", "quick_win", "celebration", "motivation"] },

              headline: { type: "string" },
              message: { type: "string" },
              action: {
                type: "object",
                additionalProperties: false,
                required: ["kind", "label"],
                properties: {
                  kind: { type: "string", enum: ["exercise", "describe", "scan", "water", "weight", "none"] },
                  label: { type: "string" },
                },
              },
            },
          },
        },
      },
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Snapshot (JSON): ${JSON.stringify(snapshot)}\n\nProfile: age ${profile?.age ?? "unknown"}, gender ${profile?.gender ?? "unknown"}, activity ${profile?.activity_level ?? "moderate"}, units ${profile?.units_preference ?? "metric"}. Goal type: ${goalType}.\nRecent foods today: ${today.items.slice(0, 8).join(", ") || "none"}.`,
          },
        ],
        response_format: { type: "json_schema", json_schema: { name: "insights", strict: true, schema } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) return json({ error: "Rate limit exceeded. Please try again later.", insights: fallbackWithSpark, snapshot, state, source: "rules" }, 200);
      if (response.status === 402) return json({ error: "AI credits exhausted.", insights: fallbackWithSpark, snapshot, state, source: "rules" }, 200);
      return json({ insights: fallbackWithSpark, snapshot, state, source: "rules" });
    }

    const aiData = await response.json();
    const content = String(aiData.choices?.[0]?.message?.content ?? "");
    let insights: OutInsight[] = fallbackWithSpark;
    let source = "rules";
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned) as { insights?: OutInsight[] } | OutInsight[];
      const arr = Array.isArray(parsed) ? parsed : parsed.insights;
      if (Array.isArray(arr) && arr.length > 0) {
        insights = arr
          .filter((i) => i && typeof i.message === "string" && i.message.trim().length > 0)
          .map((i) => ({
            category: String(i.category ?? "goal"),
            headline: String(i.headline ?? "").slice(0, 80),
            message: String(i.message).slice(0, 220),
            action: i.action && i.action.kind && i.action.kind !== "none"
              ? { kind: i.action.kind, label: String(i.action.label ?? "Open").slice(0, 24) }
              : undefined,
          }));
        source = "ai";
      }
    } catch (err) {
      console.error("Failed to parse AI response:", content, err);
    }

    if (insights.length === 0) {
      insights = fallback;
      source = "rules";
    }

    return json({ insights, snapshot, state, source });
  } catch (error) {
    console.error("Error in generate-insights:", error);
    return json({
      error: error instanceof Error ? error.message : "Unknown error",
      insights: [{
        category: "goal",
        headline: "Insights are catching up",
        message: "We couldn't build today's read just now. Pull to refresh in a moment.",
      }],
      source: "error",
    });
  }
});
