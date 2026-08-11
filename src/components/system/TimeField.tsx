// Time picker for logging — a native time input (keyboard + OS wheel on mobile)
// framed by -15/+15 minute steppers so a one-handed correction is one tap.
// Value is a Date; only hours/minutes are meaningful (the day comes from dayKey).

import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimeFieldProps {
  value: Date;
  onChange: (next: Date) => void;
  /** Upper bound — the field clamps to this (used to block future times today). */
  max?: Date;
  label?: string;
  className?: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function TimeField({ value, onChange, max, label = "Time", className }: TimeFieldProps) {
  const commit = (next: Date) => {
    onChange(max && next.getTime() > max.getTime() ? max : next);
  };

  const shift = (minutes: number) => {
    const next = new Date(value);
    next.setMinutes(next.getMinutes() + minutes, 0, 0);
    commit(next);
  };

  return (
    <div
      className={cn(
        "flex h-12 w-full items-center gap-3 rounded-card border border-border bg-card px-4",
        className,
      )}
    >
      <Clock className="h-4 w-4 shrink-0 text-secondary-text" />
      <span className="text-label font-medium text-foreground">{label}</span>

      <div className="ml-auto flex items-center gap-1">
        <input
          type="time"
          aria-label={label}
          value={`${pad(value.getHours())}:${pad(value.getMinutes())}`}
          onChange={(e) => {
            const [h, m] = e.target.value.split(":").map(Number);
            if (Number.isNaN(h) || Number.isNaN(m)) return;
            const next = new Date(value);
            next.setHours(h, m, 0, 0);
            commit(next);
          }}
          className="w-[92px] bg-transparent text-right text-label tabular-nums text-foreground outline-none focus-visible:underline"
        />
        <div className="flex flex-col">
          <button
            type="button"
            aria-label="Later by 15 minutes"
            onClick={() => shift(15)}
            className="grid h-6 w-8 place-items-center rounded-t-control text-muted-foreground transition-transform duration-instant hover:text-foreground active:scale-90"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Earlier by 15 minutes"
            onClick={() => shift(-15)}
            className="grid h-6 w-8 place-items-center rounded-b-control text-muted-foreground transition-transform duration-instant hover:text-foreground active:scale-90"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
