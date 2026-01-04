import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
  variant?: "default" | "compact" | "large";
}

export function SkeletonCard({ className, variant = "default" }: SkeletonCardProps) {
  const heights = {
    default: "h-32",
    compact: "h-20",
    large: "h-48",
  };

  return (
    <div
      className={cn(
        "bg-card border border-border/50 rounded-xl p-4 animate-pulse",
        heights[variant],
        className
      )}
    >
      <div className="space-y-3 h-full flex flex-col justify-center">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        {variant === "large" && (
          <>
            <div className="h-3 bg-muted rounded w-2/3 mt-2" />
            <div className="h-8 bg-muted rounded w-full mt-4" />
          </>
        )}
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded w-40 animate-pulse" />
            <div className="h-4 bg-muted rounded w-28 animate-pulse" />
          </div>
          <div className="h-10 w-16 bg-muted rounded-full animate-pulse" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-14 w-10 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Content skeletons */}
      <div className="px-4 space-y-6">
        {/* Calorie ring */}
        <div className="h-48 bg-card border border-border/50 rounded-xl flex items-center justify-center animate-pulse">
          <div className="h-32 w-32 bg-muted rounded-full" />
        </div>

        {/* Macro cards */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>

        {/* Water tracker */}
        <SkeletonCard variant="compact" />

        {/* Recent meals */}
        <div className="space-y-3">
          <div className="h-5 bg-muted rounded w-28 animate-pulse" />
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} variant="compact" />
          ))}
        </div>
      </div>
    </div>
  );
}
