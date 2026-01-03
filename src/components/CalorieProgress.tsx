import { useEffect, useState } from 'react';

interface CalorieProgressProps {
  consumed: number;
  goal: number;
}

export default function CalorieProgress({ consumed, goal }: CalorieProgressProps) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  
  const remaining = Math.max(0, goal - consumed);
  const percentage = goal > 0 ? (consumed / goal) * 100 : 0;
  const isOverLimit = consumed > goal;
  const isNearGoal = percentage >= 90 && percentage <= 110;
  const isPerfect = percentage >= 95 && percentage <= 105;
  
  // Calculate circle properties for proper rendering
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * Math.min(animatedPercentage, 100)) / 100;

  // Animate on mount and when consumed changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 100);

    // Celebrate when hitting 100%
    if (isPerfect && !showCelebration) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    }

    return () => clearTimeout(timer);
  }, [consumed, goal, percentage, isPerfect]);

  return (
    <div className={`group relative bg-gradient-to-br from-card to-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-[var(--shadow-strong)] hover:-translate-y-1 overflow-hidden ${showCelebration ? 'animate-celebrate' : ''}`}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.02] to-transparent pointer-events-none" />
      
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/[0.03] to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
      
      <div className="relative flex items-center justify-between gap-6">
        <div className="space-y-2 flex-1">
          <div className={`text-5xl sm:text-6xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text transition-all duration-500 ${isNearGoal ? 'scale-105' : ''}`}>
            {Math.round(remaining)}
          </div>
          <div className="text-base font-medium text-muted-foreground">
            Calories left
          </div>
          <div className="text-sm text-muted-foreground">
            {Math.round(consumed)} / {goal} kcal
          </div>
          
          {/* Status indicator */}
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
          {/* Pulse glow effect when near goal */}
          {isNearGoal && !isOverLimit && (
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent rounded-full animate-pulse-glow" />
          )}
          
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
              className="drop-shadow-lg"
              style={{ 
                transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: isOverLimit 
                  ? 'drop-shadow(0 0 8px hsl(0 84.2% 60.2% / 0.5))' 
                  : isPerfect 
                    ? 'drop-shadow(0 0 12px hsl(142 76% 36% / 0.5))'
                    : 'drop-shadow(0 0 8px hsl(0 0% 0% / 0.2))'
              }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={isOverLimit ? "hsl(0 84.2% 60.2%)" : isPerfect ? "hsl(142 76% 36%)" : "hsl(0 0% 5%)"} />
                <stop offset="50%" stopColor={isOverLimit ? "hsl(0 84.2% 50.2%)" : isPerfect ? "hsl(142 71% 45%)" : "hsl(0 0% 15%)"} />
                <stop offset="100%" stopColor={isOverLimit ? "hsl(0 84.2% 60.2%)" : isPerfect ? "hsl(142 76% 36%)" : "hsl(0 0% 20%)"} />
              </linearGradient>
            </defs>
          </svg>
          <div className={`absolute inset-0 flex items-center justify-center ${showCelebration ? 'animate-bounce' : 'animate-float'}`}>
            <span className="text-4xl filter drop-shadow-md">{isPerfect ? '🎉' : '🔥'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
