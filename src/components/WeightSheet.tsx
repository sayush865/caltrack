import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useProfile } from "@/hooks/useProfile";
import { useWeights } from "@/hooks/useWeights";
import { useLogWeight } from "@/hooks/useMutations";
import { displayWeight, formatWeight, toKg, weightUnit, type Units } from "@/lib/units";

export interface WeightSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export default function WeightSheet({ open, onOpenChange }: WeightSheetProps) {
  const profileQuery = useProfile();
  const units: Units = profileQuery.data?.units_preference === "imperial" ? "imperial" : "metric";
  const unit = weightUnit(units);

  const weightsQuery = useWeights();
  const last = useMemo(() => {
    const rows = weightsQuery.data;
    return rows && rows.length > 0 ? rows[rows.length - 1] : null;
  }, [weightsQuery.data]);

  const [value, setValue] = useState("");

  // Prefill with the last known weight (in display units) each time the sheet opens.
  useEffect(() => {
    if (open) {
      setValue(last ? String(round1(displayWeight(last.weight, units))) : "");
    }
  }, [open, last, units]);

  const logWeight = useLogWeight();

  const num = parseFloat(value);
  const valid = Number.isFinite(num) && num > 0 && num < 1000;

  const step = (delta: number) => {
    const base = valid ? num : last ? displayWeight(last.weight, units) : 0;
    const next = round1(Math.max(0, base + delta));
    setValue(next > 0 ? String(next) : "");
  };

  const save = () => {
    if (!valid) return;
    logWeight.mutate({ kg: toKg(num, units) });
    toast.success(`Weight logged — ${round1(num)} ${unit}`);
    onOpenChange(false);
  };

  const caption = (() => {
    if (!last) return "First weigh-in — this anchors your trend line.";
    const lastDisplay = displayWeight(last.weight, units);
    const base = `Last: ${formatWeight(last.weight, units)}`;
    if (!valid) return base;
    const delta = round1(num - lastDisplay);
    if (delta === 0) return `${base} · no change`;
    return `${base} · ${delta > 0 ? "+" : ""}${delta} ${unit}`;
  })();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[24px] border-border bg-card">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-title text-foreground">Log weight</DrawerTitle>
          <DrawerDescription className="text-caption text-muted-foreground">{caption}</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-safe">
          <div className="flex items-center justify-center gap-4 py-2">
            <button
              type="button"
              aria-label={`Decrease by 0.1 ${unit}`}
              onClick={() => step(-0.1)}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground transition-transform duration-instant active:scale-[0.92]"
            >
              <Minus className="h-5 w-5" />
            </button>

            <div className="flex items-baseline gap-1.5">
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.0"
                aria-label={`Weight in ${unit}`}
                className="w-32 border-none bg-transparent text-center text-display-md tabular-nums text-foreground outline-none placeholder:text-text-disabled"
              />
              <span className="text-caption text-muted-foreground">{unit}</span>
            </div>

            <button
              type="button"
              aria-label={`Increase by 0.1 ${unit}`}
              onClick={() => step(0.1)}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground transition-transform duration-instant active:scale-[0.92]"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={!valid}
            className="mb-4 mt-2 flex h-12 w-full items-center justify-center rounded-control bg-primary text-body font-medium text-primary-foreground transition-transform duration-instant active:scale-[0.92] disabled:opacity-50 disabled:active:scale-100"
          >
            Save weight
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
