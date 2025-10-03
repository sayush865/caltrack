interface CalorieProgressProps {
  consumed: number;
  goal: number;
}

export default function CalorieProgress({ consumed, goal }: CalorieProgressProps) {
  const remaining = Math.max(0, goal - consumed);
  const percentage = goal > 0 ? (consumed / goal) * 100 : 0;
  const isOverLimit = consumed > goal;

  return (
    <div className="relative bg-gradient-to-br from-card to-card/50 backdrop-blur-sm border border-border/50 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 shadow-lg overflow-hidden">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      
      <div className="relative flex items-center justify-between gap-4 sm:gap-6">
        <div className="space-y-1.5 sm:space-y-2 flex-1">
          <div className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {Math.round(remaining)}
          </div>
          <div className="text-sm sm:text-base md:text-lg font-semibold text-foreground">
            Calories left
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-accent" />
              <span className="font-medium">{Math.round(consumed)}</span>
            </div>
            <span>/</span>
            <span className="font-medium">{goal} kcal</span>
          </div>
        </div>
        
        <div className="relative h-28 w-28 sm:h-36 sm:w-36 md:h-44 md:w-44 flex-shrink-0">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-xl" />
          
          <svg className="w-full h-full transform -rotate-90 relative z-10">
            {/* Background track */}
            <circle
              cx="50%"
              cy="50%"
              r="calc(50% - 8px)"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-muted/20"
            />
            {/* Progress arc */}
            <circle
              cx="50%"
              cy="50%"
              r="calc(50% - 8px)"
              stroke="url(#gradient)"
              strokeWidth="12"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - Math.min(percentage, 100) / 100)}`}
              strokeLinecap="round"
              className="drop-shadow-lg transition-all duration-500"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className={isOverLimit ? "text-destructive" : "text-primary"} stopColor="currentColor" />
                <stop offset="100%" className={isOverLimit ? "text-destructive" : "text-accent"} stopColor="currentColor" />
              </linearGradient>
            </defs>
          </svg>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl sm:text-5xl drop-shadow-lg filter">🔥</span>
          </div>
        </div>
      </div>
    </div>
  );
}
