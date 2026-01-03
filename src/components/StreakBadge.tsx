import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Flame } from 'lucide-react';

interface StreakData {
  current_streak: number;
  longest_streak: number;
}

export default function StreakBadge() {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    fetchStreak();
  }, []);

  const fetchStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_streaks')
        .select('current_streak, longest_streak')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setStreak(data);
        // Show celebration for milestone streaks
        const milestones = [7, 14, 30, 60, 100];
        if (milestones.includes(data.current_streak)) {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 3000);
        }
      }
    } catch (error) {
      console.error('Error fetching streak:', error);
    }
  };

  if (!streak || streak.current_streak === 0) return null;

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <div 
        className={`
          flex items-center gap-1 px-2.5 py-1 rounded-full 
          bg-gradient-to-r from-orange-500/10 to-red-500/10
          border border-orange-500/20
          ${showCelebration ? 'animate-bounce' : ''}
        `}
      >
        <Flame 
          className={`w-4 h-4 text-orange-500 ${streak.current_streak >= 7 ? 'animate-pulse' : ''}`} 
        />
        <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
          {streak.current_streak}
        </span>
      </div>
      
      {/* Celebration particles */}
      {showCelebration && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="flex gap-1">
            {['🔥', '⭐', '🎉'].map((emoji, i) => (
              <span 
                key={i}
                className="text-sm animate-float"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {emoji}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
