// Small shared pieces for the onboarding flow: option cards, affirmation
// banner, step shell, number field, buttons.

import { forwardRef, useEffect, useRef, type ReactNode } from "react";
import { Check, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── StepShell ────────────────────────────────────────────────── */

export function StepShell({
  question,
  info,
  children,
}: {
  question: string;
  info?: string;
  children: ReactNode;
}) {
  return (
    <div className="animate-fade-rise space-y-6">
      <div className="space-y-2">
        <h1 className="text-title text-foreground">{question}</h1>
        {info && (
          <p className="flex items-start gap-1.5 text-caption text-muted-foreground">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>{info}</span>
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

/* ── OptionCard ───────────────────────────────────────────────── */

export function OptionCard({
  label,
  sub,
  selected = false,
  disabled = false,
  badge,
  note,
  onClick,
}: {
  label: string;
  sub?: string;
  selected?: boolean;
  disabled?: boolean;
  badge?: string;
  note?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-h-[52px] w-full rounded-control border bg-card px-4 py-3 text-left shadow-card transition-transform duration-instant active:scale-[0.97]",
        selected ? "border-primary bg-primary-soft" : "border-border",
        disabled && "opacity-50 active:scale-100",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-body font-medium text-foreground">{label}</span>
        {badge ? (
          <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-micro uppercase text-primary-foreground">
            {badge}
          </span>
        ) : (
          selected && <Check className="h-4 w-4 shrink-0 text-primary" />
        )}
      </div>
      {sub && <p className="mt-0.5 text-caption text-muted-foreground">{sub}</p>}
      {note && <p className="mt-1 text-caption text-warning">{note}</p>}
    </button>
  );
}

/* ── AffirmationBanner ────────────────────────────────────────── */

export function AffirmationBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex animate-fade-rise items-start gap-2 rounded-control bg-success-soft px-4 py-3">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      <p className="text-label text-success">{children}</p>
    </div>
  );
}

/* ── Auto-advance helper (250ms plain / longer with affirmation) ── */

export function useAdvanceTimer(onNext: () => void): (delayMs: number) => void {
  const timer = useRef<number>();
  const nextRef = useRef(onNext);
  nextRef.current = onNext;
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (delayMs: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => nextRef.current(), delayMs);
  };
}

/* ── NumberField ──────────────────────────────────────────────── */

export const NumberField = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (value: string) => void;
    unit?: string;
    placeholder?: string;
    autoFocus?: boolean;
    ariaLabel: string;
    className?: string;
  }
>(({ value, onChange, unit, placeholder, autoFocus, ariaLabel, className }, ref) => (
  <div className={cn("flex items-baseline gap-2", className)}>
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      autoFocus={autoFocus}
      aria-label={ariaLabel}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
      className="h-14 w-full min-w-0 rounded-control border border-input bg-card px-4 text-center font-display text-[28px] font-bold tabular-nums text-foreground placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-ring"
    />
    {unit && <span className="shrink-0 text-body text-muted-foreground">{unit}</span>}
  </div>
));
NumberField.displayName = "NumberField";

/* ── Buttons ──────────────────────────────────────────────────── */

export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  type = "button",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2 rounded-control bg-primary text-[15px] font-semibold text-primary-foreground transition-transform duration-instant active:scale-[0.92] disabled:opacity-50 disabled:active:scale-100",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-12 w-full items-center justify-center rounded-control text-[15px] font-semibold text-primary transition-transform duration-instant active:scale-[0.92]",
        className,
      )}
    >
      {children}
    </button>
  );
}
