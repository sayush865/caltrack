// /describe — text + voice log. Textarea + example chips + mic (SpeechRecognition
// where supported, transcribing INTO the textarea), analyzeText → the same
// ScanReviewSheet as /scan. Deployed text API returns one blob → one item.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mic, MicOff, Sparkles, UtensilsCrossed, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, Surface } from "@/components/system";
import { ReviewSheetSkeleton, ScanReviewSheet } from "@/components/scan/ScanReviewSheet";
import { classifyAnalysisError, BUSY_COPY } from "@/components/scan/analysisError";
import { useAnalysisAbort, useNavigationGuard } from "@/components/scan/useAnalysisAbort";
import { analyzeText } from "@/lib/analyze";
import type { DraftItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "2 rotis with dal and a glass of lassi",
  "chicken salad, olive oil dressing",
  "2 eggs, toast, coffee",
];

/* ── minimal SpeechRecognition typings (not in lib.dom) ──────── */

interface SpeechAlternativeLike {
  transcript: string;
}
interface SpeechResultLike {
  0: SpeechAlternativeLike;
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/* ── page ────────────────────────────────────────────────────── */

type Phase = "input" | "loading" | "review" | "error";

interface ErrorState {
  headline: string;
  copy: string;
  manualOffered: boolean;
}

export default function Describe() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const presetDayKey = params.get("date");

  const [phase, setPhase] = useState<Phase>("input");
  const [text, setText] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [analysisId, setAnalysisId] = useState(0);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [manualFallback, setManualFallback] = useState(false);
  const [listening, setListening] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const dictationBaseRef = useRef("");
  const submittedTextRef = useRef(""); // original description — hint re-runs build on this
  const runIdRef = useRef(0);

  const { startAnalysis, abortAnalysis } = useAnalysisAbort();
  useNavigationGuard(phase === "loading");

  const speechCtor = useMemo(() => getSpeechRecognition(), []);

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  /* ── mic ──────────────────────────────────────────────────── */

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const toggleMic = useCallback(() => {
    if (listening) {
      stopListening();
      return;
    }
    if (!speechCtor) return;
    const rec = new speechCtor();
    rec.lang = navigator.language || "en-IN";
    rec.continuous = true;
    rec.interimResults = true;
    dictationBaseRef.current = text.trim().length > 0 ? `${text.trimEnd()} ` : "";
    rec.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setText(dictationBaseRef.current + transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [listening, speechCtor, stopListening, text]);

  /* ── analysis ─────────────────────────────────────────────── */

  const runAnalysis = useCallback(
    async (description: string, opts?: { reanalyze?: boolean }) => {
      const runId = ++runIdRef.current;
      const signal = startAnalysis();
      if (opts?.reanalyze) setReanalyzing(true);
      else setPhase("loading");

      try {
        const result = await analyzeText(description, signal);
        if (runId !== runIdRef.current) return;
        setItems(result);
        setAnalysisId((n) => n + 1);
        setReanalyzing(false);
        setPhase("review");
      } catch (err) {
        if (runId !== runIdRef.current) return;
        const kind = classifyAnalysisError(err);
        if (kind === "aborted") {
          setReanalyzing(false);
          return;
        }
        if (opts?.reanalyze) {
          setReanalyzing(false);
          toast.error("Couldn't refine that — kept your current values.");
          return;
        }
        setReanalyzing(false);
        // Draft text is preserved in state — nothing is lost on failure.
        setErrorState(
          kind === "busy"
            ? { headline: "The kitchen's busy", copy: BUSY_COPY, manualOffered: false }
            : {
                headline: "Couldn't work that out",
                copy: "That didn't parse as a meal. Describe it differently, or enter it by hand — your text is saved.",
                manualOffered: true,
              },
        );
        setPhase("error");
      }
    },
    [startAnalysis],
  );

  const submit = () => {
    const description = text.trim();
    if (description.length === 0) return;
    stopListening();
    submittedTextRef.current = description;
    setManualFallback(false);
    void runAnalysis(description);
  };

  const cancelAnalysis = () => {
    abortAnalysis();
    runIdRef.current++;
    setPhase("input");
  };

  const handleReanalyze = (hint: string) => {
    const base = submittedTextRef.current || text.trim();
    const refined = hint.trim().length > 0 ? `${base} (${hint.trim()})` : base;
    void runAnalysis(refined, { reanalyze: true });
  };

  /* ── header (shared) ──────────────────────────────────────── */

  const header = (title: string) => (
    <header className="sticky top-0 z-10 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <button
          type="button"
          aria-label="Close"
          onClick={() => navigate(-1)}
          className="-ml-3 grid h-11 w-11 place-items-center rounded-full text-foreground transition-transform duration-instant active:scale-[0.92]"
        >
          <X className="h-6 w-6" />
        </button>
        <h1 className="text-title text-foreground">{title}</h1>
        <span className="h-11 w-11" aria-hidden="true" />
      </div>
    </header>
  );

  /* ── render ───────────────────────────────────────────────── */

  if (phase === "loading") {
    return <AnalysisTheater kind="text" caption={submittedTextRef.current} onCancel={cancelAnalysis} />;
  }


  if (phase === "review" || manualFallback) {
    return (
      <div className="min-h-screen bg-background">
        {header("Review meal")}
        <main className="mx-auto w-full max-w-md px-4 pt-2">
          <ScanReviewSheet
            initialItems={items}
            analysisId={analysisId}
            source="text"
            presetDayKey={presetDayKey}
            onReanalyze={handleReanalyze}
            reanalyzing={reanalyzing}
            hintEnabled
            initialManualName={manualFallback ? submittedTextRef.current.slice(0, 60) : undefined}
          />
        </main>
      </div>
    );
  }

  if (phase === "error" && errorState) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        {header("Describe it")}
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-16">
          <EmptyState
            icon={UtensilsCrossed}
            headline={errorState.headline}
            copy={errorState.copy}
            action={{ label: "Describe it differently", onClick: () => setPhase("input") }}
          />
          <div className="space-y-2 px-6">
            <button
              type="button"
              onClick={submit}
              className="h-11 w-full rounded-control border border-border bg-card text-label font-medium text-secondary-text shadow-card transition-transform duration-instant active:scale-[0.92]"
            >
              Try again
            </button>
            {errorState.manualOffered && (
              <button
                type="button"
                onClick={() => {
                  setItems([]);
                  setAnalysisId((n) => n + 1);
                  setManualFallback(true);
                  setPhase("review");
                }}
                className="h-11 w-full rounded-control border border-border bg-card text-label font-medium text-secondary-text shadow-card transition-transform duration-instant active:scale-[0.92]"
              >
                Enter it manually
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }

  /* input phase */

  return (
    <div className="min-h-screen bg-background">
      {header("Describe it")}
      <main className="mx-auto w-full max-w-md px-4 pt-2 pb-8">
        <Surface className="p-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              autoFocus
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What did you eat? e.g. '2 roti, dal, salad'"
              className="w-full resize-none rounded-control border border-input bg-card p-3 pr-12 text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {speechCtor && (
              <button
                type="button"
                aria-label={listening ? "Stop dictation" : "Dictate your meal"}
                aria-pressed={listening}
                onClick={toggleMic}
                className={cn(
                  "absolute bottom-3 right-2 grid h-11 w-11 place-items-center rounded-full transition-transform duration-instant active:scale-[0.92]",
                  listening ? "bg-destructive text-primary-foreground" : "bg-primary-soft text-primary",
                )}
              >
                {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            )}
          </div>
          {listening && (
            <p className="mt-2 flex items-center gap-1.5 text-caption text-primary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
              Listening — speak your meal
            </p>
          )}
        </Surface>

        <div className="mt-4">
          <p className="text-micro uppercase text-muted-foreground">Try one of these</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setText(example);
                  textareaRef.current?.focus();
                }}
                className="min-h-11 rounded-full border border-border bg-card px-4 py-2 text-left text-label text-secondary-text shadow-card transition-transform duration-instant active:scale-[0.97]"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={text.trim().length === 0}
          onClick={submit}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-control bg-primary text-body font-semibold text-primary-foreground shadow-raised transition-transform duration-instant active:scale-[0.92] disabled:opacity-40"
        >
          <Sparkles className="h-5 w-5" />
          Analyze my meal
        </button>
      </main>
    </div>
  );
}
