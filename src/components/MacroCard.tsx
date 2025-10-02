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
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <span className={`text-4xl ${color}`}>{icon}</span>
        <div className="text-right">
          <div className="text-3xl font-bold">{Math.round(remaining)}g</div>
          <div className="text-sm text-muted-foreground">{label} left</div>
        </div>
      </div>
      
      <div className="relative h-20 w-20 mx-auto">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="40"
            cy="40"
            r="32"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted opacity-20"
          />
          <circle
            cx="40"
            cy="40"
            r="32"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 32}`}
            strokeDashoffset={`${2 * Math.PI * 32 * (1 - Math.min(percentage, 100) / 100)}`}
            className={color}
            strokeLinecap="round"
          />
        </svg>
      </div>
      
      <div className="text-center text-xs text-muted-foreground">
        {Math.round(consumed)}g / {goal}g
      </div>
    </div>
  );
}
