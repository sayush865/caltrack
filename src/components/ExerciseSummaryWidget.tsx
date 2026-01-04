import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Dumbbell, Flame, Clock, Plus } from 'lucide-react';
import { startOfDay, endOfDay } from 'date-fns';

interface ExerciseSummaryWidgetProps {
  selectedDate: Date;
  onCaloriesBurnedChange?: (calories: number) => void;
}

export default function ExerciseSummaryWidget({ selectedDate, onCaloriesBurnedChange }: ExerciseSummaryWidgetProps) {
  const navigate = useNavigate();
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [totalCaloriesBurned, setTotalCaloriesBurned] = useState(0);
  const [exerciseCount, setExerciseCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExerciseData();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('exercise_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exercise_logs',
        },
        () => {
          fetchExerciseData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  const fetchExerciseData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dayStart = startOfDay(selectedDate);
      const dayEnd = endOfDay(selectedDate);

      const { data, error } = await supabase
        .from('exercise_logs')
        .select('duration_minutes, calories_burned')
        .eq('user_id', user.id)
        .eq('status', 1)
        .gte('logged_at', dayStart.toISOString())
        .lte('logged_at', dayEnd.toISOString());

      if (error) throw error;

      const minutes = data?.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) || 0;
      const calories = data?.reduce((sum, log) => sum + (Number(log.calories_burned) || 0), 0) || 0;
      
      setTotalMinutes(minutes);
      setTotalCaloriesBurned(calories);
      setExerciseCount(data?.length || 0);
      onCaloriesBurnedChange?.(calories);
    } catch (error) {
      console.error('Error fetching exercise data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-20 bg-muted rounded" />
      </Card>
    );
  }

  return (
    <Card className="p-4 border-border/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Exercise</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/exercise-database')}
          className="h-8 text-xs"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {exerciseCount === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-2">No exercises logged yet</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/exercise-database')}
          >
            Log Exercise
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{exerciseCount}</div>
            <div className="text-xs text-muted-foreground">
              {exerciseCount === 1 ? 'Workout' : 'Workouts'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold flex items-center justify-center gap-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              {totalMinutes}
            </div>
            <div className="text-xs text-muted-foreground">Minutes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold flex items-center justify-center gap-1 text-orange-500">
              <Flame className="w-4 h-4" />
              {Math.round(totalCaloriesBurned)}
            </div>
            <div className="text-xs text-muted-foreground">Burned</div>
          </div>
        </div>
      )}
    </Card>
  );
}
