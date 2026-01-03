interface MacroCardProps {
  label: string;
  consumed: number;
  goal: number;
  icon: string;
  color: string;
}

export default function MacroCard({ label, consumed, goal, icon }: MacroCardProps) {
  const remaining = Math.max(0, goal - consumed);
  const percentage = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0;
  const isComplete = percentage >= 95;

  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * percentage) / 100;

  return (
    <div className={`bg-card border border-border/50 rounded-xl p-4 space-y-3 ${isComplete ? 'ring-1 ring-green-500/30' : ''}`}>
      <div className="flex flex-col items-center gap-2">
        <span className="text-3xl">
          {isComplete ? '✅' : icon}
        </span>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">
            {Math.round(remaining)}g
          </div>
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {label} left
          </div>
        </div>
      </div>
      
      <div className="h-16 w-16 mx-auto">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            className="text-muted/50"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={isComplete ? 'text-green-500' : 'text-foreground'}
            strokeLinecap="round"
          />
        </svg>
      </div>
      
      <div className="text-center text-xs text-muted-foreground">
        <span className={`font-semibold ${isComplete ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
          {Math.round(consumed)}g
        </span> / {goal}g
      </div>
    </div>
  );
}