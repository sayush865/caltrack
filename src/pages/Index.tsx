import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { History } from 'lucide-react';
import { format, startOfDay, endOfDay, isToday } from 'date-fns';
import CalorieProgress from '@/components/CalorieProgress';
import MacroCard from '@/components/MacroCard';
import WeekCalendar from '@/components/WeekCalendar';
import FoodLogItem from '@/components/FoodLogItem';
import QuickAddWidget from '@/components/QuickAddWidget';
import WaterTracker from '@/components/WaterTracker';
import StreakBadge from '@/components/StreakBadge';
import HealthMetricsWidget from '@/components/HealthMetricsWidget';
import DailyInsightCard from '@/components/DailyInsightCard';

interface UserGoals {
  daily_calories: number;
  daily_protein: number;
  daily_carbs: number;
  daily_fat: number;
  daily_water: number;
}

export default function Index() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [goals, setGoals] = useState<UserGoals>({
    daily_calories: 2000,
    daily_protein: 150,
    daily_carbs: 250,
    daily_fat: 65,
    daily_water: 2000,
  });
  const [consumed, setConsumed] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [recentMeals, setRecentMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoalsAndData();
  }, [selectedDate]);

  useEffect(() => {
    // Subscribe to realtime changes
    const channel = supabase
      .channel('food_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_logs',
        },
        () => {
          fetchGoalsAndData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  const fetchGoalsAndData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const userId = user.id;

      // Fetch user goals
      const { data: goalsData } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (goalsData) {
        setGoals({
          daily_calories: goalsData.daily_calories,
          daily_protein: goalsData.daily_protein,
          daily_carbs: goalsData.daily_carbs,
          daily_fat: goalsData.daily_fat,
          daily_water: goalsData.daily_water || 2000,
        });
      }

      // Fetch food logs for the selected day only (not all future days)
      const startOfSelectedDay = startOfDay(selectedDate);
      const endOfSelectedDay = endOfDay(selectedDate);
      const { data: logs } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 1)
        .gte('logged_at', startOfSelectedDay.toISOString())
        .lte('logged_at', endOfSelectedDay.toISOString())
        .order('logged_at', { ascending: false });

      if (logs) {
        setRecentMeals(logs);
        
        // Calculate totals
        const totals = logs.reduce((acc, log) => ({
          calories: acc.calories + (Number(log.calories) || 0),
          protein: acc.protein + (Number(log.protein) || 0),
          carbs: acc.carbs + (Number(log.carbs) || 0),
          fat: acc.fat + (Number(log.fat) || 0),
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

        setConsumed(totals);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🍽️</div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="px-4 py-4 max-w-4xl mx-auto">
          <div className="mb-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                CalTrack AI
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {format(selectedDate, 'EEEE, MMM d')}
              </p>
            </div>
            <StreakBadge />
          </div>
          
          <WeekCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {/* Daily Insight Card */}
        {isToday(selectedDate) && <DailyInsightCard />}
        
        {/* Calorie Progress */}
        <CalorieProgress consumed={consumed.calories} goal={goals.daily_calories} />

        {/* Macro Cards */}
        <div className="grid grid-cols-3 gap-3">
          <MacroCard
            label="Protein"
            consumed={consumed.protein}
            goal={goals.daily_protein}
            icon="🍗"
            color="text-foreground"
          />
          <MacroCard
            label="Carbs"
            consumed={consumed.carbs}
            goal={goals.daily_carbs}
            icon="🌾"
            color="text-foreground"
          />
          <MacroCard
            label="Fat"
            consumed={consumed.fat}
            goal={goals.daily_fat}
            icon="🥑"
            color="text-foreground"
          />
        </div>

        {/* Health Metrics Widget */}
        <HealthMetricsWidget />

        {/* Water Tracker */}
        <WaterTracker selectedDate={selectedDate} goal={goals.daily_water} />

        {/* Quick Add - only show for today */}
        {isToday(selectedDate) && <QuickAddWidget />}

        {/* Recent Meals */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Today's Meals</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/daily-log')} className="h-8 text-xs">
              View All <History className="w-4 h-4 ml-1.5" />
            </Button>
          </div>

          {recentMeals.length === 0 ? (
            <Card className="border border-border bg-card p-12 text-center shadow-sm">
              <div className="text-5xl mb-4">🍽️</div>
              <p className="text-base font-semibold mb-2">
                No meals logged yet
              </p>
              <p className="text-sm text-muted-foreground">
                Tap the <span className="font-semibold">Add</span> button below to log your first meal
              </p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {recentMeals.slice(0, 3).map((meal) => (
                <FoodLogItem key={meal.id} log={meal} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
