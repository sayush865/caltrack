import { Progress } from '@/components/ui/progress';

interface MacroCardProps {
  label: string;
  consumed: number;
  goal: number;
  icon: string;
  color: string;
}

export default function MacroCard({ label, consumed, goal, icon, color }: MacroCardProps) {
  const remaining = Math.max(0, goal - consumed);
  const percentage = goal > 0 ? (consumed / goal) * 100 : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col items-center gap-2">
        <span className="text-3xl">{icon}</span>
        <div className="text-center">
          <div className="text-2xl font-bold">
            {Math.round(remaining)}g
          </div>
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {label} left
          </div>
        </div>
      </div>
      
      <div className="relative h-16 w-16 mx-auto">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="calc(50% - 4px)"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            className="text-muted"
          />
          <circle
            cx="50%"
            cy="50%"
            r="calc(50% - 4px)"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 20}`}
            strokeDashoffset={`${2 * Math.PI * 20 * (1 - Math.min(percentage, 100) / 100)}`}
            className="text-foreground"
            strokeLinecap="round"
          />
        </svg>
      </div>
      
      <div className="text-center text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{Math.round(consumed)}g</span> / {goal}g
      </div>
    </div>
  );
}
