import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import FoodLogItem from '@/components/FoodLogItem';
import { format, startOfDay, endOfDay, addDays, subDays } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import WaterHistory from '@/components/WaterHistory';

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { value: 'lunch', label: 'Lunch', emoji: '☀️' },
  { value: 'dinner', label: 'Dinner', emoji: '🌙' },
  { value: 'snack', label: 'Snacks', emoji: '🍪' },
  { value: 'other', label: 'Other', emoji: '🍽️' },
];

export default function DailyLog() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyTotals, setDailyTotals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    breakfast: true,
    lunch: true,
    dinner: true,
    snack: true,
    other: true,
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
  }, [selectedDate]);

  const fetchLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      const dayStart = startOfDay(selectedDate);
      const dayEnd = endOfDay(selectedDate);

      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 1)
        .gte('logged_at', dayStart.toISOString())
        .lte('logged_at', dayEnd.toISOString())
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

  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  // Group logs by meal type
  const groupedLogs = MEAL_TYPES.reduce((acc, mealType) => {
    const mealsOfType = logs.filter(log => {
      const logMealType = log.meal_type?.toLowerCase() || 'other';
      if (mealType.value === 'other') {
        return !['breakfast', 'lunch', 'dinner', 'snack'].includes(logMealType);
      }
      return logMealType === mealType.value;
    });
    acc[mealType.value] = mealsOfType;
    return acc;
  }, {} as Record<string, any[]>);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getMealTypeCalories = (mealType: string) => {
    return groupedLogs[mealType]?.reduce((sum, log) => sum + (Number(log.calories) || 0), 0) || 0;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
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
            <div className="flex items-center gap-3 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousDay}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2 text-muted-foreground min-w-[200px] justify-center">
                <CalendarIcon className="w-4 h-4" />
                <span>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextDay}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              {!isToday && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="ml-2"
                >
                  Today
                </Button>
              )}
            </div>
          </div>
        </div>

        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl">{isToday ? "Today's" : format(selectedDate, 'MMM d')} Nutrition</CardTitle>
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
          <h2 className="text-xl font-semibold">Meals by Category</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading meals...</p>
            </div>
          ) : logs.length === 0 ? (
            <Card className="border border-border bg-card p-12 text-center">
              <p className="text-lg text-muted-foreground mb-4">
                No meals logged for {isToday ? 'today' : format(selectedDate, 'MMMM d, yyyy')}
              </p>
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="border-border"
              >
                Log Your First Meal
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {MEAL_TYPES.map((mealType) => {
                const meals = groupedLogs[mealType.value];
                if (!meals || meals.length === 0) return null;
                
                const calories = getMealTypeCalories(mealType.value);
                
                return (
                  <Collapsible
                    key={mealType.value}
                    open={expandedSections[mealType.value]}
                    onOpenChange={() => toggleSection(mealType.value)}
                  >
                    <Card className="border border-border bg-card overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{mealType.emoji}</span>
                            <div className="text-left">
                              <h3 className="font-semibold">{mealType.label}</h3>
                              <p className="text-xs text-muted-foreground">
                                {meals.length} item{meals.length !== 1 ? 's' : ''} • {Math.round(calories)} cal
                              </p>
                            </div>
                          </div>
                          {expandedSections[mealType.value] ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 space-y-2">
                          {meals.map((log) => (
                            <FoodLogItem key={log.id} log={log} />
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </div>

        {/* Water Intake History */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Hydration</h2>
          <WaterHistory selectedDate={selectedDate} />
        </div>
      </div>
    </div>
  );
}
