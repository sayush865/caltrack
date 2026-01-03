import { useEffect, useState } from 'react';

interface MacroCardProps {
  label: string;
  consumed: number;
  goal: number;
  icon: string;
  color: string;
}

export default function MacroCard({ label, consumed, goal, icon, color }: MacroCardProps) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  
  const remaining = Math.max(0, goal - consumed);
  const percentage = goal > 0 ? (consumed / goal) * 100 : 0;
  const isNearGoal = percentage >= 80 && percentage <= 110;
  const isComplete = percentage >= 95;

  // Animate on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(Math.min(percentage, 100));
    }, 200);
    return () => clearTimeout(timer);
  }, [percentage]);

  // Calculate circle properties
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * animatedPercentage) / 100;

  return (
    <div className={`group relative bg-gradient-to-br from-card to-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 space-y-3 transition-all duration-300 hover:shadow-[var(--shadow-medium)] hover:-translate-y-1 overflow-hidden ${isComplete ? 'ring-1 ring-green-500/30' : ''}`}>
      {/* Subtle shimmer effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/[0.02] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      
      {/* Completion glow */}
      {isComplete && (
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none" />
      )}
      
      <div className="relative flex flex-col items-center gap-2">
        <span className={`text-3xl transition-transform duration-300 group-hover:scale-110 ${isComplete ? 'animate-bounce' : ''}`}>
          {isComplete ? '✅' : icon}
        </span>
        <div className="text-center">
          <div className={`text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text transition-all duration-300 ${isNearGoal ? 'scale-105' : ''}`}>
            {Math.round(remaining)}g
          </div>
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {label} left
          </div>
        </div>
      </div>
      
      <div className="relative h-16 w-16 mx-auto">
        {/* Glow effect when near goal */}
        {isNearGoal && (
          <div className="absolute inset-0 bg-gradient-to-br from-foreground/10 to-transparent rounded-full blur-md animate-pulse-glow" />
        )}
        
        <svg className="relative w-full h-full transform -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="calc(50% - 4px)"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            className="text-muted/50"
          />
          <circle
            cx="50%"
            cy="50%"
            r="calc(50% - 4px)"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`drop-shadow-md transition-all duration-700 ease-out ${isComplete ? 'text-green-500' : 'text-foreground'}`}
            strokeLinecap="round"
            style={{
              filter: isComplete ? 'drop-shadow(0 0 4px hsl(142 76% 36% / 0.5))' : undefined
            }}
          />
        </svg>
      </div>
      
      <div className="relative text-center text-xs text-muted-foreground">
        <span className={`font-semibold ${isComplete ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
          {Math.round(consumed)}g
        </span> / {goal}g
      </div>
    </div>
  );
}
