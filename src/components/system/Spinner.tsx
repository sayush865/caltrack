import { cn } from "@/lib/utils";

export interface SpinnerProps {
  /** Diameter in px (stroke scales with it). */
  size?: number;
  className?: string;
  label?: string;
}

/**
 * Hairline ink arc spinner — matches the Paper & Ink system (no gradients,
 * no glow). Use for inline/indeterminate waits; use Shimmer for layout-shaped
 * loading states.
 */
export function Spinner({ size = 20, className, label }: SpinnerProps) {
  const stroke = Math.max(1.25, size / 12);
  return (
    <span
      role="status"
      aria-label={label ?? "Loading"}
      className={cn("inline-flex items-center justify-center", className)}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin [animation-duration:0.9s]"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.16" strokeWidth={stroke} />
        <path
          d="M22 12a10 10 0 0 0-10-10"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
