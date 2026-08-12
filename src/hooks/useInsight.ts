// Daily AI insight ("One big thing" + briefing).
//
// Cached in localStorage per user + local day + a *day-state signature* derived from
// what's actually logged: the insight regenerates when the day changes materially
// (first log, new meal, crossing the goal, a new 3-hour block) and is served from
// cache in between. Never throws to the UI.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchDailyInsights } from "@/lib/analyze";
import { dayKey } from "@/lib/dates";
import type { Insight, InsightPayload, InsightSnapshot, InsightTrend } from "@/lib/types";
import { useDay } from "./useDay";
import { useGoals } from "./useGoals";
import { useSession } from "./useSession";

interface CachedPayload {
  insights: Insight[];
  snapshot: InsightSnapshot | null;
  state: string | null;
  trends: InsightTrend[];
  verdict: string | null;
  /** Epoch ms when this payload was generated. */
  generatedAt?: number;
}

function cacheKeyFor(uid: string, day: string, signature: string): string {
  return `ct-insight-v3-${uid}-${day}-${signature}`;
}

function readCache(key: string): CachedPayload | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload | null;
    if (parsed && Array.isArray(parsed.insights) && parsed.insights.every((i) => typeof i?.message === "string")) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeCache(key: string, payload: CachedPayload): void {
  try {
    // Keep storage tidy: drop older insight entries.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k !== key && k.startsWith("ct-insight")) localStorage.removeItem(k);
    }
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // storage full/unavailable — non-fatal
  }
}


export interface UseInsightResult {
  /** All insights: [0] is the primary "one big thing", the rest are the briefing. */
  insight: Insight[] | null;
  primary: Insight | null;
  briefing: Insight[];
  snapshot: InsightSnapshot | null;
  state: string | null;
  /** Aggregate week-over-week findings (rolling 28 days). */
  trends: InsightTrend[];
  /** One-sentence read on the last week. */
  verdict: string | null;
  loading: boolean;
  /** True once a payload exists (from cache or a generate run). */
  hasData: boolean;
  /** Epoch ms of the last successful generation, if known. */
  generatedAt: number | null;
  refresh: () => void;
}

export function useInsight(): UseInsightResult {
  const { session } = useSession();
  const uid = session?.user.id;
  const todayKey = dayKey(new Date());
  const dayQuery = useDay(todayKey);
  const goalsQuery = useGoals();

  const goal = goalsQuery.data?.daily_calories ?? 0;
  const net = Math.round((dayQuery.data?.totals.calories ?? 0) - (dayQuery.data?.exercise.calories ?? 0));
  const mealCount = dayQuery.data?.all.length ?? 0;

  /** Coarse fingerprint of the day: changes only on material moves. */
  const signature = useMemo(() => {
    const block = Math.floor(new Date().getHours() / 3); // new read every ~3h
    const calBand = Math.floor(net / 300);
    const over = goal > 0 && net > goal ? 1 : 0;
    return `${block}.${calBand}.${mealCount}.${over}`;
  }, [net, goal, mealCount]);

  const [payload, setPayload] = useState<CachedPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const load = useCallback(
    async (bypassCache: boolean) => {
      if (!uid) {
        setPayload(null);
        setLoading(false);
        return;
      }
      const key = cacheKeyFor(uid, todayKey, signature);

      if (!bypassCache) {
        const cached = readCache(key);
        if (cached) {
          setPayload(cached);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      try {
        const fresh: InsightPayload = await fetchDailyInsights();
        const next: CachedPayload = {
          insights: fresh.insights,
          snapshot: fresh.snapshot,
          state: fresh.state,
          trends: fresh.trends,
          verdict: fresh.verdict,
          generatedAt: Date.now(),
        };
        writeCache(key, next);
        if (aliveRef.current) setPayload(next);
      } catch {
        // Offline / function failure: keep what we had. Never throw.
        if (aliveRef.current) setPayload((prev) => prev ?? readCache(key));
      } finally {
        if (aliveRef.current) setLoading(false);
      }
    },
    [uid, todayKey, signature],
  );

  // Cache-only hydration: AI never runs on mount. The user asks for it explicitly
  // via refresh() (Generate / Refresh buttons), which keeps token spend intentional.
  useEffect(() => {
    if (dayQuery.isLoading || !uid) return;
    setPayload(readCache(cacheKeyFor(uid, todayKey, signature)));
  }, [uid, todayKey, signature, dayQuery.isLoading]);

  const refresh = useCallback(() => {
    load(true);
  }, [load]);

  const insights = payload?.insights ?? null;

  return {
    insight: insights,
    primary: insights?.[0] ?? null,
    briefing: insights ? insights.slice(1) : [],
    snapshot: payload?.snapshot ?? null,
    state: payload?.state ?? null,
    trends: payload?.trends ?? [],
    verdict: payload?.verdict ?? null,
    loading,
    hasData: payload != null,
    generatedAt: payload?.generatedAt ?? null,
    refresh,
  };
}
