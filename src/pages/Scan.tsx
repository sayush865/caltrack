// /scan — full-screen photo log flow: camera → staged analysis → review sheet.
// Ports the legacy Camera.tsx patterns: parallel upload-during-analysis,
// cached image for re-analysis, abort + beforeunload guard.

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Camera, CameraOff, ImageUp, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/system";
import { AnalysisTheater } from "@/components/scan/AnalysisTheater";
import { ScanReviewSheet } from "@/components/scan/ScanReviewSheet";
import { classifyAnalysisError, BUSY_COPY, TIMEOUT_COPY } from "@/components/scan/analysisError";
import { uploadFoodImage } from "@/components/scan/uploadFoodImage";
import { useAnalysisAbort, useNavigationGuard } from "@/components/scan/useAnalysisAbort";
import { analyzePhoto, compressImage } from "@/lib/analyze";
import type { DraftItem } from "@/lib/types";

// The deployed analyze-food function runs Gemini 2.5 Pro and routinely takes 25-40s
// on multi-item plates; the v2 Flash function will bring this down, but until it is
// deployed the client must wait it out.
const ANALYSIS_TIMEOUT_MS = 75_000;

type Phase = "camera" | "analyzing" | "review" | "error";
type CamState = "starting" | "live" | "denied" | "unavailable";

interface ErrorState {
  headline: string;
  copy: string;
}

function timeoutAfter(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Analysis timed out")), ms),
  );
}

export default function Scan() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const presetDayKey = params.get("date");

  const [phase, setPhase] = useState<Phase>("camera");
  const [camState, setCamState] = useState<CamState>("starting");
  const [preview, setPreview] = useState<string | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [analysisId, setAnalysisId] = useState(0);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [manualFallback, setManualFallback] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cachedImageRef = useRef<string | null>(null); // compressed dataURL — reused for re-analysis
  const uploadPromiseRef = useRef<Promise<string | null> | null>(null);
  const runIdRef = useRef(0); // ignore late results from cancelled runs

  const { startAnalysis, abortAnalysis } = useAnalysisAbort();
  useNavigationGuard(phase === "analyzing");

  /* ── camera lifecycle ─────────────────────────────────────── */

  useEffect(() => {
    if (phase !== "camera") return;
    let cancelled = false;
    setCamState("starting");

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamState("unavailable");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        if (!cancelled) setCamState("live");
      } catch (err) {
        if (cancelled) return;
        const denied =
          err instanceof DOMException &&
          (err.name === "NotAllowedError" || err.name === "SecurityError");
        setCamState(denied ? "denied" : "unavailable");
      }
    }
    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [phase]);

  /* ── analysis ─────────────────────────────────────────────── */

  const runAnalysis = useCallback(
    async (imageDataUrl: string, opts?: { reanalyze?: boolean }) => {
      const runId = ++runIdRef.current;
      const signal = startAnalysis();

      if (opts?.reanalyze) {
        setReanalyzing(true);
      } else {
        setPhase("analyzing");
        // Parallel upload starts immediately — save awaits this promise later.
        uploadPromiseRef.current = uploadFoodImage(imageDataUrl);
      }

      try {
        const result = await Promise.race([
          analyzePhoto(imageDataUrl, signal),
          timeoutAfter(ANALYSIS_TIMEOUT_MS),
        ]);
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
          return; // user cancelled — stay wherever they navigated to
        }
        if (opts?.reanalyze) {
          // keep prior values, just tell them
          setReanalyzing(false);
          toast.error("Couldn't re-read the photo — kept your current values.");
          return;
        }
        setReanalyzing(false);
        setManualFallback(false);
        if (kind === "busy") {
          setErrorState({ headline: "The kitchen's busy", copy: BUSY_COPY });
        } else if (kind === "timeout") {
          setErrorState({ headline: "Still chewing on that one", copy: TIMEOUT_COPY });
        } else {
          setErrorState({
            headline: "Couldn't read that plate",
            copy: "The photo didn't parse as food. Retake the shot, try again, or enter it by hand.",
          });
        }
        setPhase("error");
      }
    },
    [startAnalysis],
  );

  const beginFromBlob = useCallback(
    async (blob: Blob) => {
      try {
        const dataUrl = await compressImage(blob);
        cachedImageRef.current = dataUrl;
        setPreview(dataUrl);
        await runAnalysis(dataUrl);
      } catch {
        toast.error("Couldn't process that image. Try another photo.");
      }
    },
    [runAnalysis],
  );

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) void beginFromBlob(blob);
      },
      "image/jpeg",
      0.92,
    );
  }, [beginFromBlob]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file && file.type.startsWith("image/")) void beginFromBlob(file);
  };

  const cancelAnalysis = () => {
    abortAnalysis();
    runIdRef.current++;
    setPhase("camera");
  };

  const retake = () => {
    abortAnalysis();
    runIdRef.current++;
    cachedImageRef.current = null;
    uploadPromiseRef.current = null;
    setPreview(null);
    setItems([]);
    setManualFallback(false);
    setPhase("camera");
  };

  const handleReanalyze = () => {
    if (cachedImageRef.current) void runAnalysis(cachedImageRef.current, { reanalyze: true });
  };

  /* ── render ───────────────────────────────────────────────── */

  if (phase === "analyzing") {
    return <AnalysisTheater photoPreview={preview} kind="photo" onCancel={cancelAnalysis} />;
  }

  if (phase === "review" || manualFallback) {
    return (
      <div className="min-h-screen bg-background">
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
            <h1 className="text-title text-foreground">Review meal</h1>
            <button
              type="button"
              onClick={retake}
              className="-mr-2 flex h-11 items-center gap-1.5 rounded-full px-3 text-label font-medium text-secondary-text transition-transform duration-instant active:scale-[0.92]"
            >
              <RotateCcw className="h-4 w-4" />
              Retake
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-md px-4 pt-2">
          <ScanReviewSheet
            initialItems={items}
            analysisId={analysisId}
            source="photo"
            photoPreview={preview}
            resolveImageUrl={() => uploadPromiseRef.current ?? Promise.resolve(null)}
            presetDayKey={presetDayKey}
            onReanalyze={handleReanalyze}
            reanalyzing={reanalyzing}
            hintEnabled={false}
          />
        </main>
      </div>
    );
  }

  if (phase === "error" && errorState) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-10 bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-md items-center px-4">
            <button
              type="button"
              aria-label="Close"
              onClick={() => navigate(-1)}
              className="-ml-3 grid h-11 w-11 place-items-center rounded-full text-foreground transition-transform duration-instant active:scale-[0.92]"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-16">
          <EmptyState
            icon={CameraOff}
            headline={errorState.headline}
            copy={errorState.copy}
            action={{ label: "Retake photo", onClick: retake }}
          />
          <div className="space-y-2 px-6">
            {cachedImageRef.current && (
              <button
                type="button"
                onClick={() => {
                  if (cachedImageRef.current) void runAnalysis(cachedImageRef.current);
                }}
                className="h-11 w-full rounded-control border border-border bg-card text-label font-medium text-secondary-text shadow-card transition-transform duration-instant active:scale-[0.92]"
              >
                Try again
              </button>
            )}
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
          </div>
        </main>
      </div>
    );
  }

  /* camera phase */

  if (camState === "denied" || camState === "unavailable") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-10 bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-md items-center px-4">
            <button
              type="button"
              aria-label="Close"
              onClick={() => navigate(-1)}
              className="-ml-3 grid h-11 w-11 place-items-center rounded-full text-foreground transition-transform duration-instant active:scale-[0.92]"
            >
              <X className="h-6 w-6" />
            </button>
            <h1 className="text-title text-foreground">Scan a meal</h1>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-16">
          <EmptyState
            icon={CameraOff}
            headline={camState === "denied" ? "Camera access is off" : "Camera isn't available"}
            copy={
              camState === "denied"
                ? "Re-enable the camera for this site in your browser settings, or upload a photo instead."
                : "This device doesn't expose a camera here. Upload a photo of your plate instead."
            }
            action={{ label: "Upload a photo", onClick: () => fileInputRef.current?.click() }}
          />
        </main>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-foreground">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />

      {camState === "starting" && (
        <div className="absolute inset-0 grid place-items-center">
          <Camera className="h-10 w-10 animate-pulse text-background/70" />
        </div>
      )}

      {/* top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <button
          type="button"
          aria-label="Close scanner"
          onClick={() => navigate(-1)}
          className="grid h-11 w-11 place-items-center rounded-full bg-foreground/50 text-background backdrop-blur transition-transform duration-instant active:scale-[0.92]"
        >
          <X className="h-6 w-6" />
        </button>
        <span className="rounded-full bg-foreground/50 px-4 py-2 text-label font-medium text-background backdrop-blur">
          Center your plate
        </span>
        <span className="h-11 w-11" aria-hidden="true" />
      </div>

      {/* bottom controls */}
      <div className="absolute inset-x-0 bottom-0 pb-safe">
        <div className="mx-auto flex max-w-md items-center justify-between px-8 pb-10">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-12 min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-control px-2 text-background transition-transform duration-instant active:scale-[0.92]"
          >
            <ImageUp className="h-6 w-6" />
            <span className="text-micro uppercase">Upload</span>
          </button>

          <button
            type="button"
            aria-label="Take photo"
            disabled={camState !== "live"}
            onClick={capture}
            className="grid h-[72px] w-[72px] place-items-center rounded-full border-4 border-background bg-background/25 backdrop-blur transition-transform duration-instant active:scale-[0.92] disabled:opacity-50"
          >
            <span className="h-14 w-14 rounded-full bg-background" />
          </button>

          <span className="h-12 w-[60px]" aria-hidden="true" />
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
    </div>
  );
}
