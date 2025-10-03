interface CalorieProgressProps {
  consumed: number;
  goal: number;
}

export default function CalorieProgress({ consumed, goal }: CalorieProgressProps) {
  const remaining = Math.max(0, goal - consumed);
  const percentage = goal > 0 ? (consumed / goal) * 100 : 0;
  const isOverLimit = consumed > goal;

  return (
    <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1 sm:space-y-2 flex-1">
          <div className="text-4xl sm:text-5xl md:text-6xl font-bold">
            {Math.round(remaining)}
          </div>
          <div className="text-sm sm:text-base md:text-lg text-muted-foreground">
            Calories left
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground">
            {Math.round(consumed)} / {goal} kcal
          </div>
        </div>
        
        <div className="relative h-28 w-28 sm:h-32 sm:w-32 md:h-40 md:w-40 flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="calc(50% - 6px)"
              stroke="currentColor"
              strokeWidth="10"
              fill="none"
              className="text-muted opacity-10"
            />
            <circle
              cx="50%"
              cy="50%"
              r="calc(50% - 6px)"
              stroke="currentColor"
              strokeWidth="10"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - Math.min(percentage, 100) / 100)}`}
              className={isOverLimit ? "text-destructive" : "text-primary"}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl sm:text-4xl">🔥</span>
          </div>
        </div>
      </div>
    </div>
  );
}
