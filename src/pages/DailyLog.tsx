import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar } from 'lucide-react';
import FoodLogItem from '@/components/FoodLogItem';
import { format } from 'date-fns';

export default function DailyLog() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyTotals, setDailyTotals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('food_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_logs'
        },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', '00000000-0000-0000-0000-000000000000')
        .gte('logged_at', startOfDay.toISOString())
        .order('logged_at', { ascending: false });

      if (error) throw error;

      setLogs(data || []);

      const totals = (data || []).reduce((acc, log) => ({
        calories: acc.calories + (Number(log.calories) || 0),
        protein: acc.protein + (Number(log.protein) || 0),
        carbs: acc.carbs + (Number(log.carbs) || 0),
        fat: acc.fat + (Number(log.fat) || 0)
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      setDailyTotals(totals);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background">
      <div className="container max-w-2xl mx-auto p-4 pb-20 space-y-4">
        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Daily Log</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(), 'EEEE, MMMM d')}
            </p>
          </div>
        </div>

        <Card className="shadow-md border-border/50 bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardHeader>
            <CardTitle className="text-lg">Today's Totals</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{Math.round(dailyTotals.calories)}</div>
              <div className="text-xs text-muted-foreground">Calories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-chart-1">{Math.round(dailyTotals.protein)}</div>
              <div className="text-xs text-muted-foreground">Protein</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-chart-2">{Math.round(dailyTotals.carbs)}</div>
              <div className="text-xs text-muted-foreground">Carbs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-chart-3">{Math.round(dailyTotals.fat)}</div>
              <div className="text-xs text-muted-foreground">Fat</div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading your meals...
            </div>
          ) : logs.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No meals logged today</p>
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="mt-4"
              >
                Log Your First Meal
              </Button>
            </Card>
          ) : (
            logs.map((log) => (
              <FoodLogItem key={log.id} log={log} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}