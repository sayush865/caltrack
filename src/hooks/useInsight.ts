import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDailyInsights } from "@/lib/analyze";
import { dayKey } from "@/lib/dates";
import type { Insight } from "@/lib/types";
import { useSession } from "./useSession";

function cacheKeyFor(uid: string, day: string): string {
  return `ct-insight-${uid}-${day}`;
}

function readCache(key: string): Insight[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.every((i) => i && typeof (i as Insight).message === "string")) {
      return parsed as Insight[];
    }
    return null;
  } catch {
    return null;
  }
}

function writeCache(key: string, insights: Insight[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(insights));
  } catch {
    // storage full/unavailable — non-fatal
  }
}

/**
 * Daily AI insights, cached in localStorage per user+local-day so generate-insights
 * runs at most once a day. refresh() bypasses the cache. Never throws to the UI:
 * offline/errors resolve to a null insight.
 */
export function useInsight(): { insight: Insight[] | null; loading: boolean; refresh: () => void } {
  const { session } = useSession();
  const uid = session?.user.id;
  const todayKey = dayKey(new Date());

  const [insight, setInsight] = useState<Insight[] | null>(null);
  const [loading, setLoading] = useState(true);
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
        setInsight(null);
        setLoading(false);
        return;
      }
      const key = cacheKeyFor(uid, todayKey);

      if (!bypassCache) {
        const cached = readCache(key);
        if (cached) {
          setInsight(cached);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      try {
        const fresh = await fetchDailyInsights();
        writeCache(key, fresh);
        if (aliveRef.current) setInsight(fresh);
      } catch {
        // Offline / edge-function failure: keep whatever we had, else null. Never throw.
        if (aliveRef.current) setInsight((prev) => prev ?? readCache(key));
      } finally {
        if (aliveRef.current) setLoading(false);
      }
    },
    [uid, todayKey],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const refresh = useCallback(() => {
    load(true);
  }, [load]);

  return { insight, loading, refresh };
}
