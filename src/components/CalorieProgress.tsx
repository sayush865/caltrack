interface CalorieProgressProps {
  consumed: number;
  goal: number;
}

export default function CalorieProgress({ consumed, goal }: CalorieProgressProps) {
  const remaining = Math.max(0, goal - consumed);
  const percentage = goal > 0 ? (consumed / goal) * 100 : 0;
  const isOverLimit = consumed > goal;

  return (
    <div className="bg-card border border-border rounded-3xl p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="text-6xl font-bold">
            {Math.round(remaining)}
          </div>
          <div className="text-lg text-muted-foreground">
            Calories left
          </div>
          <div className="text-sm text-muted-foreground">
            {Math.round(consumed)} / {goal} kcal
          </div>
        </div>
        
        <div className="relative h-40 w-40">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="68"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-muted opacity-10"
            />
            <circle
              cx="80"
              cy="80"
              r="68"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 68}`}
              strokeDashoffset={`${2 * Math.PI * 68 * (1 - Math.min(percentage, 100) / 100)}`}
              className={isOverLimit ? "text-destructive" : "text-primary"}
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
