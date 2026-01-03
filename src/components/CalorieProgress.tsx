interface CalorieProgressProps {
  consumed: number;
  goal: number;
}

export default function CalorieProgress({ consumed, goal }: CalorieProgressProps) {
  const remaining = Math.max(0, goal - consumed);
  const percentage = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0;
  const isOverLimit = consumed > goal;
  const isPerfect = percentage >= 95 && percentage <= 105;
  
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * percentage) / 100;

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6">
      <div className="flex items-center justify-between gap-6">
        <div className="space-y-2 flex-1">
          <div className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground">
            {Math.round(remaining)}
          </div>
          <div className="text-base font-medium text-muted-foreground">
            Calories left
          </div>
          <div className="text-sm text-muted-foreground">
            {Math.round(consumed)} / {goal} kcal
          </div>
          
          {isPerfect && (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="text-xs font-medium text-green-600 dark:text-green-400">Perfect!</span>
              <span>✨</span>
            </div>
          )}
          {isOverLimit && (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20">
              <span className="text-xs font-medium text-red-600 dark:text-red-400">Over limit</span>
            </div>
          )}
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
              className="text-muted/50"
            />
            <circle
              cx="50%"
              cy="50%"
              r="calc(50% - 8px)"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={isOverLimit ? 'text-destructive' : isPerfect ? 'text-green-500' : 'text-foreground'}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">{isPerfect ? '🎉' : '🔥'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}