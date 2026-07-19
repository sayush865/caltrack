// Friendly classification of analyze-food / analyze-food-text failures.
// Raw error.message never reaches the UI — we map to copy here.

export type AnalysisErrorKind = "aborted" | "busy" | "failed";

export function classifyAnalysisError(err: unknown): AnalysisErrorKind {
  if (err instanceof DOMException && err.name === "AbortError") return "aborted";
  const e = err as { name?: string; message?: string; context?: { status?: number } };
  const status = e?.context?.status;
  if (status === 429 || status === 402) return "busy";
  if (typeof e?.message === "string" && /429|402|rate.?limit|too many|busy/i.test(e.message)) {
    return "busy";
  }
  return "failed";
}

export const BUSY_COPY = "The kitchen's busy — try again in a minute.";
