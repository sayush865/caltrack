import { useEffect, useRef, useState } from "react";

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Animated count-up (rAF, easeOutCubic). Counts from the previously displayed
 * value to `target` (from 0 on first mount). Respects prefers-reduced-motion
 * by jumping straight to the end. Returns a rounded number — render with
 * `tabular-nums` so digits don't jitter.
 */
export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(() =>
    prefersReducedMotion() ? target : 0,
  );
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    const from = valueRef.current;
    if (from === target) return;

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / Math.max(duration, 1), 1);
      setValue(from + (target - from) * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return Math.round(value);
}
