interface CalorieProgressProps {
  consumed: number;
  goal: number;
}

export default function CalorieProgress({ consumed, goal }: CalorieProgressProps) {
  const remaining = Math.max(0, goal - consumed);
  const percentage = goal > 0 ? (consumed / goal) * 100 : 0;
  const isOverLimit = consumed > goal;

  return (
    <div className="bg-card rounded-3xl p-8 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1),0_4px_16px_-4px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between gap-6">
        <div className="space-y-3 flex-1">
          <div className="text-6xl sm:text-7xl font-bold tracking-tight">
            {Math.round(remaining)}
          </div>
          <div className="text-lg font-semibold text-foreground">
            Calories left
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            {Math.round(consumed)} of {goal} kcal
          </div>
        </div>
        
        <div className="relative h-36 w-36 sm:h-44 sm:w-44 flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="calc(50% - 10px)"
              stroke="currentColor"
              strokeWidth="14"
              fill="none"
              className="text-secondary"
            />
            <circle
              cx="50%"
              cy="50%"
              r="calc(50% - 10px)"
              stroke="currentColor"
              strokeWidth="14"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - Math.min(percentage, 100) / 100)}`}
              className={isOverLimit ? "text-destructive" : "text-foreground"}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl">🔥</span>
          </div>
        </div>
      </div>
    </div>
  );
}
