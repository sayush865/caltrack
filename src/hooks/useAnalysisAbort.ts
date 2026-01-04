import { useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Hook to handle graceful abort of analysis when user navigates away.
 * Provides an AbortSignal for fetch requests and cleanup on unmount.
 */
export function useAnalysisAbort() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const isAnalyzingRef = useRef(false);

  // Create a new abort controller for each analysis
  const startAnalysis = useCallback(() => {
    // Abort any existing analysis first
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    isAnalyzingRef.current = true;
    return abortControllerRef.current.signal;
  }, []);

  // Mark analysis as complete
  const completeAnalysis = useCallback(() => {
    isAnalyzingRef.current = false;
  }, []);

  // Abort current analysis
  const abortAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isAnalyzingRef.current = false;
  }, []);

  // Check if we're currently analyzing
  const isAnalyzing = useCallback(() => {
    return isAnalyzingRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    startAnalysis,
    completeAnalysis,
    abortAnalysis,
    isAnalyzing,
  };
}

/**
 * Hook to show a confirmation dialog when user tries to navigate away during analysis.
 */
export function useNavigationGuard(isAnalyzing: boolean, message?: string) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isAnalyzing) {
        e.preventDefault();
        e.returnValue = message || 'Analysis in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isAnalyzing, message]);
}
