// Press-and-hold (1.2s) "I'm in" commitment gesture with a radial fill ring.

import { useEffect, useRef, useState } from "react";
import { Users } from "lucide-react";

const HOLD_MS = 1200;
const SIZE = 184;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

export function CommitHold({ onCommit }: { onCommit: () => void }) {
  const [progress, setProgress] = useState(0);
  const raf = useRef(0);
  const committed = useRef(false);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const begin = () => {
    if (committed.current) return;
    cancelAnimationFrame(raf.current);
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / HOLD_MS, 1);
      setProgress(p);
      if (p >= 1) {
        committed.current = true;
        navigator.vibrate?.(10);
        onCommit();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  const cancel = () => {
    if (committed.current) return;
    cancelAnimationFrame(raf.current);
    setProgress(0);
  };

  return (
    <div className="flex flex-1 animate-fade-rise flex-col items-center justify-center py-10 text-center">
      <h1 className="text-title text-foreground">One last thing.</h1>
      <p className="mt-2 max-w-xs text-body text-secondary-text">
        Plans work when you commit to the first week. Press and hold to start yours.
      </p>

      <div className="relative mt-10 select-none" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="absolute inset-0 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            className="text-calories-track"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            className="text-primary"
          />
        </svg>
        <button
          type="button"
          aria-label="Press and hold to commit"
          onPointerDown={begin}
          onPointerUp={cancel}
          onPointerLeave={cancel}
          onPointerCancel={cancel}
          onContextMenu={(e) => e.preventDefault()}
          className="absolute inset-4 grid touch-none place-items-center rounded-full bg-primary text-title text-primary-foreground shadow-raised transition-transform duration-instant active:scale-[0.92]"
        >
          I'm in
        </button>
      </div>

      <p className="mt-8 flex items-center gap-1.5 text-caption text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        12,400 plans started this week.
      </p>
    </div>
  );
}
