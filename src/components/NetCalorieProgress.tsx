import { Flame, Utensils, Dumbbell } from 'lucide-react';

interface NetCalorieProgressProps {
  consumed: number;
  burned: number;
  goal: number;
}

export default function NetCalorieProgress({ consumed, burned, goal }: NetCalorieProgressProps) {
  const netCalories = consumed - burned;
  const remaining = Math.max(0, goal - netCalories);
  const percentage = goal > 0 ? Math.min((netCalories / goal) * 100, 100) : 0;
  const isOverLimit = netCalories > goal;
  const isPerfect = percentage >= 95 && percentage <= 105;
  
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * Math.max(0, percentage)) / 100;

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6">
      <div className="flex items-center justify-between gap-6">
        <div className="space-y-3 flex-1">
          <div className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground">
            {Math.round(remaining)}
          </div>
          <div className="text-base font-medium text-muted-foreground">
            Calories left
          </div>
          
          {/* Breakdown */}
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Utensils className="w-3.5 h-3.5" />
                Food
              </span>
              <span className="font-medium">+{Math.round(consumed)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Dumbbell className="w-3.5 h-3.5" />
                Exercise
              </span>
              <span className="font-medium text-green-600 dark:text-green-400">-{Math.round(burned)}</span>
            </div>
            <div className="flex items-center justify-between text-sm pt-1 border-t border-border/30">
              <span className="text-muted-foreground">Net</span>
              <span className="font-semibold">{Math.round(netCalories)} / {goal}</span>
            </div>
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
            <span className="text-4xl">🔥</span>
          </div>
        </div>
      </div>
    </div>
  );
}
