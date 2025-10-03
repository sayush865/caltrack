import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { History } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import CalorieProgress from '@/components/CalorieProgress';
import MacroCard from '@/components/MacroCard';
import WeekCalendar from '@/components/WeekCalendar';
import ProfileMenu from '@/components/ProfileMenu';
import FoodLogItem from '@/components/FoodLogItem';

interface UserGoals {
  daily_calories: number;
  daily_protein: number;
  daily_carbs: number;
  daily_fat: number;
}

export default function Index() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [goals, setGoals] = useState<UserGoals>({
    daily_calories: 2000,
    daily_protein: 150,
    daily_carbs: 250,
    daily_fat: 65,
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
        });
      }

      // Fetch food logs for the selected day only (not all future days)
      const startOfSelectedDay = startOfDay(selectedDate);
      const endOfSelectedDay = endOfDay(selectedDate);
      const { data: logs } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', userId)
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
        <div className="container max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Food Tracker</h1>
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, 'EEEE, MMMM d')}
              </p>
            </div>
            <ProfileMenu />
          </div>
          
          <WeekCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Calorie Progress */}
        <CalorieProgress consumed={consumed.calories} goal={goals.daily_calories} />

        {/* Macro Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MacroCard
            label="Protein"
            consumed={consumed.protein}
            goal={goals.daily_protein}
            icon="🍗"
            color="text-red-500"
          />
          <MacroCard
            label="Carbs"
            consumed={consumed.carbs}
            goal={goals.daily_carbs}
            icon="🌾"
            color="text-yellow-500"
          />
          <MacroCard
            label="Fat"
            consumed={consumed.fat}
            goal={goals.daily_fat}
            icon="🥑"
            color="text-blue-500"
          />
        </div>

        {/* Recent Meals */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Today's Meals</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/daily-log')}>
              View All <History className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {recentMeals.length === 0 ? (
            <Card className="border border-border bg-card p-12 text-center">
              <div className="text-6xl mb-4">🍽️</div>
              <p className="text-lg font-medium mb-2">No meals logged yet</p>
              <p className="text-sm text-muted-foreground mb-6">
                Tap the Add button below to log your first meal
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
