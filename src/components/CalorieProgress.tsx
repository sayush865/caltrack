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
    <div className="group relative bg-gradient-to-br from-card to-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-[var(--shadow-strong)] hover:-translate-y-1 overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.02] to-transparent pointer-events-none" />
      
      <div className="relative flex items-center justify-between gap-6">
        <div className="space-y-2 flex-1">
          <div className="text-5xl sm:text-6xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
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
          {/* Glow effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-foreground/10 to-transparent rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <svg className="relative w-full h-full transform -rotate-90">
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
              stroke="url(#gradient)"
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="drop-shadow-lg transition-all duration-500 ease-out"
              style={{ 
                transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: isOverLimit ? 'drop-shadow(0 0 8px hsl(0 84.2% 60.2% / 0.5))' : 'drop-shadow(0 0 8px hsl(0 0% 0% / 0.2))'
              }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={isOverLimit ? "hsl(0 84.2% 60.2%)" : "hsl(0 0% 5%)"} />
                <stop offset="50%" stopColor={isOverLimit ? "hsl(0 84.2% 50.2%)" : "hsl(0 0% 15%)"} />
                <stop offset="100%" stopColor={isOverLimit ? "hsl(0 84.2% 60.2%)" : "hsl(0 0% 20%)"} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center animate-float">
            <span className="text-4xl filter drop-shadow-md">🔥</span>
          </div>
        </div>
      </div>
    </div>
  );
}
