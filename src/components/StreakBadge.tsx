import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Flame } from 'lucide-react';

interface StreakData {
  current_streak: number;
  longest_streak: number;
}

export default function StreakBadge() {
  const [streak, setStreak] = useState<StreakData | null>(null);

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
      }
    } catch (error) {
      console.error('Error fetching streak:', error);
    }
  };

  if (!streak || streak.current_streak === 0) return null;

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
        <Flame className="w-4 h-4 text-orange-500" />
        <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
          {streak.current_streak}
        </span>
      </div>
    </div>
  );
}
