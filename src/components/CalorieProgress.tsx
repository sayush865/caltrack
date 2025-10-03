interface CalorieProgressProps {
  consumed: number;
  goal: number;
}

export default function CalorieProgress({ consumed, goal }: CalorieProgressProps) {
  const remaining = Math.max(0, goal - consumed);
  const percentage = goal > 0 ? (consumed / goal) * 100 : 0;
  const isOverLimit = consumed > goal;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between gap-6">
        <div className="space-y-2 flex-1">
          <div className="text-5xl sm:text-6xl font-bold tracking-tight">
            {Math.round(remaining)}
          </div>
          <div className="text-base font-medium text-muted-foreground">
            Calories left
          </div>
          <div className="text-sm text-muted-foreground">
            {Math.round(consumed)} / {goal} kcal
          </div>
        </div>
        
        <div className="relative h-32 w-32 sm:h-40 sm:w-40 flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="calc(50% - 8px)"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-muted"
            />
            <circle
              cx="50%"
              cy="50%"
              r="calc(50% - 8px)"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - Math.min(percentage, 100) / 100)}`}
              className={isOverLimit ? "text-destructive" : "text-foreground"}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">🔥</span>
          </div>
        </div>
      </div>
    </div>
  );
}
