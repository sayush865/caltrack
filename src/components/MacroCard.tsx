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
    <div className="bg-card rounded-2xl p-5 space-y-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1),0_4px_16px_-4px_rgba(0,0,0,0.08)] transition-all hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.12),0_8px_24px_-4px_rgba(0,0,0,0.1)]">
      <div className="flex flex-col items-center gap-3">
        <span className="text-4xl">{icon}</span>
        <div className="text-center space-y-1">
          <div className="text-3xl font-bold tracking-tight">
            {Math.round(remaining)}g
          </div>
          <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            {label} left
          </div>
        </div>
      </div>
      
      <div className="relative h-20 w-20 mx-auto">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="calc(50% - 5px)"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-secondary"
          />
          <circle
            cx="50%"
            cy="50%"
            r="calc(50% - 5px)"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 32}`}
            strokeDashoffset={`${2 * Math.PI * 32 * (1 - Math.min(percentage, 100) / 100)}`}
            className="text-foreground"
            strokeLinecap="round"
          />
        </svg>
      </div>
      
      <div className="text-center text-sm text-muted-foreground font-medium">
        <span className="font-bold text-foreground">{Math.round(consumed)}g</span> of {goal}g
      </div>
    </div>
  );
}
