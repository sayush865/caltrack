import { cn } from "@/lib/utils";

export type MacroBarKind = "protein" | "carbs" | "fat" | "fiber" | "water";

export interface MacroBarProps {
  kind: MacroBarKind;
  value: number;
  target: number;
  /** Hides the uppercase label — bar + value only. */
  compact?: boolean;
  /** Render as a target line ("148g", full bar) — for plan reveals, not progress. */
  targetOnly?: boolean;
  className?: string;
}

// Static class maps so Tailwind's JIT sees every token class.
const KIND_CLASSES: Record<
  MacroBarKind,
  { label: string; text: string; fill: string; track: string }
> = {
  protein: { label: "Protein", text: "text-protein", fill: "bg-protein", track: "bg-protein-soft" },
  carbs: { label: "Carbs", text: "text-carbs", fill: "bg-carbs", track: "bg-carbs-soft" },
  fat: { label: "Fat", text: "text-fat", fill: "bg-fat", track: "bg-fat-soft" },
  fiber: { label: "Fiber", text: "text-fiber", fill: "bg-fiber", track: "bg-fiber-soft" },
  water: { label: "Water", text: "text-water", fill: "bg-water", track: "bg-water-soft" },
};

export function MacroBar({ kind, value, target, compact = false, targetOnly = false, className }: MacroBarProps) {
  const k = KIND_CLASSES[kind];
  const pct = targetOnly ? 100 : target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const unit = kind === "water" ? "ml" : "g";
  const valueText = (
    <span className="font-display text-[13px] font-medium tabular-nums text-foreground">
      {targetOnly ? `${Math.round(target)}${unit}` : `${Math.round(value)}/${Math.round(target)}${unit}`}
    </span>
  );
  const track = (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full", k.track)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-fast", k.fill)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex-1">{track}</div>
        {valueText}
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline justify-between">
        <span className={cn("text-micro uppercase", k.text)}>{k.label}</span>
        {valueText}
      </div>
      {track}
    </div>
  );
}
