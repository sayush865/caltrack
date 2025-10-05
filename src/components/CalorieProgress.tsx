interface CalorieProgressProps {
  consumed: number;
  goal: number;
}

export default function CalorieProgress({ consumed, goal }: CalorieProgressProps) {
  const remaining = Math.max(0, goal - consumed);
  const percentage = goal > 0 ? (consumed / goal) * 100 : 0;
  const isOverLimit = consumed > goal;
  
  // Calculate circle properties for proper rendering
  const radius = 50; // percentage-based radius
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * Math.min(percentage, 100)) / 100;

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
              stroke="url(#gradient)"
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={isOverLimit ? "hsl(0 84.2% 60.2%)" : "hsl(0 0% 5%)"} />
                <stop offset="100%" stopColor={isOverLimit ? "hsl(0 84.2% 60.2%)" : "hsl(0 0% 20%)"} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">🔥</span>
          </div>
        </div>
      </div>
    </div>
  );
}
