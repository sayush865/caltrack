// Ported from src/hooks/useAnalysisAbort.ts (legacy) — abort + beforeunload guard
// for in-flight AI analysis. Owned by the scan/describe flow.

import { useCallback, useEffect, useRef } from "react";

/**
 * One AbortController per analysis run. `startAnalysis()` aborts any previous
 * run and hands back a fresh signal; unmount aborts whatever is in flight.
 * NOTE: analyzePhoto/analyzeText only honor the signal at pre/post-network
 * checkpoints (supabase functions.invoke can't abort mid-flight) — aborting
 * makes the eventual result throw AbortError instead of resolving.
 */
export function useAnalysisAbort() {
  const controllerRef = useRef<AbortController | null>(null);

  const startAnalysis = useCallback((): AbortSignal => {
    controllerRef.current?.abort();
    controllerRef.current = new AbortController();
    return controllerRef.current.signal;
  }, []);

  const abortAnalysis = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  return { startAnalysis, abortAnalysis };
}

/** Warns on browser refresh/close while an analysis is running. */
export function useNavigationGuard(active: boolean, message?: string) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message ?? "Analysis in progress. Are you sure you want to leave?";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active, message]);
}
