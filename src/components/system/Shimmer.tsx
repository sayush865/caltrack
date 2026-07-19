import { cn } from "@/lib/utils";

export interface ShimmerProps {
  /** Pass the real component's rounded-* + size classes so the skeleton mirrors layout. */
  className?: string;
}

/**
 * Skeleton block: F1's `.shimmer` class (muted base + ::after gradient sweep).
 * NOTE: do NOT use Tailwind's `animate-shimmer` on the block itself — that
 * keyframe is translateX(100%) and would slide the whole element; the sweep
 * animation belongs on the ::after, which `.shimmer` handles.
 */
export function Shimmer({ className }: ShimmerProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("shimmer rounded-control", className)}
    />
  );
}
