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
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4 border-b border-border pb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="h-11 w-11 hover:bg-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Daily Log</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
        </div>

        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Today's Nutrition</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <div className="text-3xl font-bold">{Math.round(dailyTotals.calories)}</div>
              <div className="text-sm text-muted-foreground">Calories</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold">{Math.round(dailyTotals.protein)}g</div>
              <div className="text-sm text-muted-foreground">Protein</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold">{Math.round(dailyTotals.carbs)}g</div>
              <div className="text-sm text-muted-foreground">Carbs</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold">{Math.round(dailyTotals.fat)}g</div>
              <div className="text-sm text-muted-foreground">Fat</div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Meal History</h2>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading meals...</p>
            </div>
          ) : logs.length === 0 ? (
            <Card className="border border-border bg-card p-12 text-center">
              <p className="text-lg text-muted-foreground mb-4">No meals logged today</p>
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="border-border"
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