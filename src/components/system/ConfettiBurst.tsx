import { useEffect, useState } from "react";

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  round: boolean;
}

/**
 * Brand confetti colors — protein/carbs/fat/water/streak identity hues.
 * Hardcoded HSL strings from DESIGN_SYSTEM.md §2: this is the ONE sanctioned
 * exception to token-class-only colors (confetti is painted, not themed).
 * Never gray again.
 */
const CONFETTI_COLORS = [
  "hsl(12 78% 52%)", // --protein (coral)
  "hsl(38 94% 46%)", // --carbs (amber)
  "hsl(258 68% 60%)", // --fat (violet)
  "hsl(199 89% 44%)", // --water (sky)
  "hsl(24 94% 50%)", // --streak (flame orange)
];

const PIECE_COUNT = 40;
const CONFETTI_EVENT = "caltrack:confetti";

/**
 * Imperative trigger — call from anywhere (first-ever log, streak milestones
 * 7/30/100, goal-weight milestone; never more than once per day — callers
 * enforce the frequency rules). Requires a mounted <ConfettiHost/>.
 */
export function fireConfetti(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CONFETTI_EVENT));
}

function makePieces(): ConfettiPiece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.3,
    duration: 1 + Math.random(),
    size: 4 + Math.random() * 8,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    round: Math.random() > 0.5,
  }));
}

export interface ConfettiBurstProps {
  pieces: ConfettiPiece[];
}

/** Presentational burst overlay — normally driven by <ConfettiHost/>. */
export function ConfettiBurst({ pieces }: ConfettiBurstProps) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden="true"
    >
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="animate-confetti-fall absolute"
          style={{
            left: `${piece.x}%`,
            top: -20,
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            borderRadius: piece.round ? "50%" : "2px",
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Mount ONCE near the app root. Listens for fireConfetti() events and renders
 * a 40-piece burst. prefers-reduced-motion suppresses the animation entirely
 * (callers show a static badge instead, per motion spec §6).
 */
export function ConfettiHost() {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const onFire = () => {
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      setPieces(makePieces());
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => setPieces([]), 2500);
    };
    window.addEventListener(CONFETTI_EVENT, onFire);
    return () => {
      window.removeEventListener(CONFETTI_EVENT, onFire);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  if (pieces.length === 0) return null; // overlay, not an empty state — rule 8 doesn't apply
  return <ConfettiBurst pieces={pieces} />;
}
