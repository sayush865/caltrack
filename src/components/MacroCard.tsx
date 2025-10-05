import { Progress } from '@/components/ui/progress';

interface MacroCardProps {
  label: string;
  consumed: number;
  goal: number;
  icon: string;
  color: string;
}

export default function MacroCard({ label, consumed, goal, icon, color }: MacroCardProps) {
  const remaining = Math.max(0, goal - consumed);
  const percentage = goal > 0 ? (consumed / goal) * 100 : 0;

  return (
    <div className="group relative bg-gradient-to-br from-card to-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 space-y-3 transition-all duration-300 hover:shadow-[var(--shadow-medium)] hover:-translate-y-1 overflow-hidden">
      {/* Subtle shimmer effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/[0.02] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      
      <div className="relative flex flex-col items-center gap-2">
        <span className="text-3xl transition-transform duration-300 group-hover:scale-110">{icon}</span>
        <div className="text-center">
          <div className="text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
            {Math.round(remaining)}g
          </div>
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {label} left
          </div>
        </div>
      </div>
      
      <div className="relative h-16 w-16 mx-auto">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/10 to-transparent rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
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
            strokeDasharray={`${2 * Math.PI * 20}`}
            strokeDashoffset={`${2 * Math.PI * 20 * (1 - Math.min(percentage, 100) / 100)}`}
            className="text-foreground drop-shadow-md transition-all duration-500 ease-out"
            strokeLinecap="round"
          />
        </svg>
      </div>
      
      <div className="relative text-center text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{Math.round(consumed)}g</span> / {goal}g
      </div>
    </div>
  );
}
