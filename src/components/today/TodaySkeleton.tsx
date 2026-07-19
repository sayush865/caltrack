// Layout-mirroring skeleton for the Today tab body (hard rule 7 — no "Loading...").

import { Shimmer, Surface } from "@/components/system";

export function TodaySkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {/* Hero card: ring + 3 macro bars + dots */}
      <Surface className="p-5">
        <div className="flex justify-center">
          <Shimmer className="h-44 w-44 rounded-full" />
        </div>
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between">
                <Shimmer className="h-3 w-14 rounded-full" />
                <Shimmer className="h-3 w-16 rounded-full" />
              </div>
              <Shimmer className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center gap-1.5">
          <Shimmer className="h-1.5 w-1.5 rounded-full" />
          <Shimmer className="h-1.5 w-1.5 rounded-full" />
        </div>
      </Surface>

      {/* Quick log chips */}
      <div>
        <Shimmer className="h-3 w-20 rounded-full" />
        <div className="mt-2 flex gap-2 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <Shimmer key={i} className="h-11 w-32 shrink-0 rounded-full" />
          ))}
        </div>
      </div>

      {/* Meal list rows */}
      <div>
        <Shimmer className="h-3 w-16 rounded-full" />
        <div className="mt-2 space-y-2">
          <Shimmer className="h-[76px] w-full rounded-card" />
          <Shimmer className="h-[76px] w-full rounded-card" />
        </div>
      </div>
    </div>
  );
}
