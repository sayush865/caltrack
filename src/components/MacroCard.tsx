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
    <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 space-y-2 sm:space-y-3 md:space-y-4">
      <div className="flex flex-col items-center gap-1 sm:gap-2">
        <span className={`text-2xl sm:text-3xl md:text-4xl ${color}`}>{icon}</span>
        <div className="text-center">
          <div className="text-lg sm:text-2xl md:text-3xl font-bold">{Math.round(remaining)}g</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">{label} left</div>
        </div>
      </div>
      
      <div className="relative h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 mx-auto">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="calc(50% - 4px)"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            className="text-muted opacity-20"
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
            className={color}
            strokeLinecap="round"
          />
        </svg>
      </div>
      
      <div className="text-center text-[10px] sm:text-xs text-muted-foreground">
        {Math.round(consumed)}g / {goal}g
      </div>
    </div>
  );
}
