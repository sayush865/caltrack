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
  
  const getGradient = () => {
    switch(label) {
      case 'Protein': return 'from-red-500 to-pink-500';
      case 'Carbs': return 'from-yellow-400 to-orange-500';
      case 'Fat': return 'from-blue-500 to-cyan-500';
      default: return 'from-primary to-accent';
    }
  };

  return (
    <div className="group relative bg-gradient-to-br from-card to-card/50 backdrop-blur-sm border border-border/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 space-y-2 sm:space-y-3 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Decorative gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getGradient()} opacity-5 group-hover:opacity-10 transition-opacity`} />
      
      <div className="relative flex flex-col items-center gap-1.5 sm:gap-2">
        <div className={`relative text-3xl sm:text-4xl md:text-5xl drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
          {icon}
          <div className={`absolute inset-0 blur-xl bg-gradient-to-br ${getGradient()} opacity-30`} />
        </div>
        <div className="text-center">
          <div className={`text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r ${getGradient()} bg-clip-text text-transparent`}>
            {Math.round(remaining)}g
          </div>
          <div className="text-[10px] sm:text-xs font-medium text-muted-foreground whitespace-nowrap uppercase tracking-wide">
            {label} left
          </div>
        </div>
      </div>
      
      
      <div className="relative h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 mx-auto">
        {/* Glow effect */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${getGradient()} opacity-20 blur-md`} />
        
        <svg className="w-full h-full transform -rotate-90 relative z-10">
          <circle
            cx="50%"
            cy="50%"
            r="calc(50% - 5px)"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted/20"
          />
          <circle
            cx="50%"
            cy="50%"
            r="calc(50% - 5px)"
            stroke="url(#macro-gradient)"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 20}`}
            strokeDashoffset={`${2 * Math.PI * 20 * (1 - Math.min(percentage, 100) / 100)}`}
            strokeLinecap="round"
            className="drop-shadow-md transition-all duration-500"
          />
          <defs>
            <linearGradient id="macro-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className={color} stopColor="currentColor" />
              <stop offset="100%" className={color} stopColor="currentColor" stopOpacity="0.7" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      <div className="relative text-center text-[10px] sm:text-xs text-muted-foreground font-medium">
        <span className="font-semibold text-foreground">{Math.round(consumed)}g</span> / {goal}g
      </div>
    </div>
  );
}
