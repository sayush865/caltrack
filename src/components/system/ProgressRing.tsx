import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ProgressRingProps {
  /** 0..1 fills the ring; >1 switches the fill color to `overClass` (ring stays visually full). */
  value: number;
  /** Outer diameter in px. */
  size?: number;
  /** Stroke width in px. */
  stroke?: number;
  /** Tailwind text-* class for the empty track (drawn via currentColor). */
  trackClass?: string;
  /** Tailwind text-* class for the progress fill (drawn via currentColor). */
  fillClass?: string;
  /** Fill class used when value > 1 (never red — informational amber). */
  overClass?: string;
  /** Animate stroke-dashoffset from empty on mount (700ms ease-out). */
  animate?: boolean;
  className?: string;
  /** Center content (hero numeral etc.). */
  children?: ReactNode;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export function ProgressRing({
  value,
  size = 176,
  stroke = 14,
  trackClass = "text-calories-track",
  fillClass = "text-foreground",
  overClass = "text-warning",
  animate = true,
  className,
  children,
}: ProgressRingProps) {
  const clamped = Math.min(Math.max(value, 0), 1);
  const skipAnimation = !animate || prefersReducedMotion();
  const [progress, setProgress] = useState(skipAnimation ? clamped : 0);

  useEffect(() => {
    if (skipAnimation) {
      setProgress(clamped);
      return;
    }
    // Two rAFs so the initial 0 state paints before the transition kicks in.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setProgress(clamped));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [clamped, skipAnimation]);

  // Circumference computed from the ACTUAL radius (2πr) — the old hardcoded
  // dashoffset bug is not repeated here.
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className={cn("relative", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.min(value, 1) * 100)}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className={trackClass}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className={value > 1 ? overClass : fillClass}
          style={
            skipAnimation
              ? undefined
              : {
                  transition:
                    "stroke-dashoffset 700ms cubic-bezier(0.16, 1, 0.3, 1)",
                }
          }
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
