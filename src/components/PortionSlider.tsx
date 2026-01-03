import { Slider } from '@/components/ui/slider';

interface PortionSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export default function PortionSlider({ value, onChange }: PortionSliderProps) {
  const getPortionLabel = (val: number) => {
    if (val === 0.5) return 'Half portion';
    if (val === 0.75) return '¾ portion';
    if (val === 1) return 'Full portion';
    if (val === 1.25) return '1¼ portions';
    if (val === 1.5) return '1½ portions';
    if (val === 1.75) return '1¾ portions';
    if (val === 2) return 'Double portion';
    return `${val}x`;
  };

  return (
    <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Adjust Portion Size</label>
        <span className="text-sm font-semibold bg-primary/10 px-3 py-1 rounded-full">
          {getPortionLabel(value)}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(vals) => onChange(vals[0])}
        min={0.5}
        max={2}
        step={0.25}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0.5x</span>
        <span>1x</span>
        <span>1.5x</span>
        <span>2x</span>
      </div>
    </div>
  );
}
