import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Droplets } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks, eachDayOfInterval, isSameWeek } from "date-fns";
import WeeklyCalorieChart from "@/components/WeeklyCalorieChart";
import MacroPieChart from "@/components/MacroPieChart";

interface DailyData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number;
}

const WeeklySummary = () => {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weeklyData, setWeeklyData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState({ calories: 2000, protein: 150, carbs: 250, fat: 65, fiber: 25, water: 2000 });

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const isCurrentWeek = isSameWeek(new Date(), weekStart, { weekStartsOn: 1 });

  useEffect(() => {
    fetchWeeklyData();
  }, [weekStart]);

  const fetchWeeklyData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch goals
    const { data: goalsData } = await supabase
      .from("user_goals")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (goalsData) {
      setGoals({
        calories: goalsData.daily_calories,
        protein: goalsData.daily_protein,
        carbs: goalsData.daily_carbs,
        fat: goalsData.daily_fat,
        fiber: goalsData.daily_fiber || 25,
        water: goalsData.daily_water,
      });
    }

    // Fetch food logs for the week
    const { data: foodLogs } = await supabase
      .from("food_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", 1)
      .gte("logged_at", weekStart.toISOString())
      .lte("logged_at", weekEnd.toISOString());

    // Fetch water logs for the week
    const { data: waterLogs } = await supabase
      .from("water_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("logged_at", weekStart.toISOString())
      .lte("logged_at", weekEnd.toISOString());

    // Process data by day
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const dailyData: DailyData[] = days.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayFoodLogs = foodLogs?.filter(log => 
        format(new Date(log.logged_at!), "yyyy-MM-dd") === dayStr
      ) || [];
      const dayWaterLogs = waterLogs?.filter(log => 
        format(new Date(log.logged_at), "yyyy-MM-dd") === dayStr
      ) || [];

      return {
        date: dayStr,
        calories: dayFoodLogs.reduce((sum, log) => sum + (Number(log.calories) || 0), 0),
        protein: dayFoodLogs.reduce((sum, log) => sum + (Number(log.protein) || 0), 0),
        carbs: dayFoodLogs.reduce((sum, log) => sum + (Number(log.carbs) || 0), 0),
        fat: dayFoodLogs.reduce((sum, log) => sum + (Number(log.fat) || 0), 0),
        fiber: dayFoodLogs.reduce((sum, log) => sum + (Number(log.fiber) || 0), 0),
        water: dayWaterLogs.reduce((sum, log) => sum + log.amount_ml, 0),
      };
    });

    setWeeklyData(dailyData);
    setLoading(false);
  };

  const goToPreviousWeek = () => setWeekStart(subWeeks(weekStart, 1));
  const goToNextWeek = () => !isCurrentWeek && setWeekStart(addWeeks(weekStart, 1));

  // Calculate averages
  const daysWithData = weeklyData.filter(d => d.calories > 0).length;
  const avgCalories = daysWithData > 0 
    ? Math.round(weeklyData.reduce((sum, d) => sum + d.calories, 0) / daysWithData) 
    : 0;
  const avgProtein = daysWithData > 0 
    ? Math.round(weeklyData.reduce((sum, d) => sum + d.protein, 0) / daysWithData) 
    : 0;
  const avgCarbs = daysWithData > 0 
    ? Math.round(weeklyData.reduce((sum, d) => sum + d.carbs, 0) / daysWithData) 
    : 0;
  const avgFat = daysWithData > 0 
    ? Math.round(weeklyData.reduce((sum, d) => sum + d.fat, 0) / daysWithData) 
    : 0;
  const avgFiber = daysWithData > 0 
    ? Math.round(weeklyData.reduce((sum, d) => sum + d.fiber, 0) / daysWithData) 
    : 0;

  const totalWater = weeklyData.reduce((sum, d) => sum + d.water, 0);
  const caloriesTrend = avgCalories - goals.calories;

  const getTrendIcon = (diff: number) => {
    if (diff > 50) return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (diff < -50) return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  // Find best day
  const bestDay = weeklyData.reduce((best, day) => {
    const score = Math.abs(day.calories - goals.calories);
    const bestScore = Math.abs(best.calories - goals.calories);
    return day.calories > 0 && score < bestScore ? day : best;
  }, weeklyData[0]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-4">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <h1 className="text-lg font-semibold">Weekly Summary</h1>
            <p className="text-sm text-muted-foreground">
              {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={goToNextWeek}
            disabled={isCurrentWeek}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-card/50 backdrop-blur">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg Calories</span>
                    {getTrendIcon(caloriesTrend)}
                  </div>
                  <p className="text-2xl font-bold">{avgCalories}</p>
                  <p className="text-xs text-muted-foreground">Goal: {goals.calories}</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">Total Water</span>
                  </div>
                  <p className="text-2xl font-bold">{(totalWater / 1000).toFixed(1)}L</p>
                  <p className="text-xs text-muted-foreground">
                    {daysWithData} days tracked
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Macro Averages */}
            <Card className="bg-card/50 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Daily Averages</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-lg font-semibold text-blue-500">{avgProtein}g</p>
                    <p className="text-xs text-muted-foreground">Protein</p>
                    <p className="text-xs text-muted-foreground/70">Goal: {goals.protein}g</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-amber-500">{avgCarbs}g</p>
                    <p className="text-xs text-muted-foreground">Carbs</p>
                    <p className="text-xs text-muted-foreground/70">Goal: {goals.carbs}g</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-rose-500">{avgFat}g</p>
                    <p className="text-xs text-muted-foreground">Fat</p>
                    <p className="text-xs text-muted-foreground/70">Goal: {goals.fat}g</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-green-500">{avgFiber}g</p>
                    <p className="text-xs text-muted-foreground">Fiber</p>
                    <p className="text-xs text-muted-foreground/70">Goal: {goals.fiber}g</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calorie Chart */}
            <WeeklyCalorieChart data={weeklyData} goal={goals.calories} />

            {/* Macro Distribution */}
            <MacroPieChart protein={avgProtein} carbs={avgCarbs} fat={avgFat} fiber={avgFiber} />

            {/* Best Day */}
            {bestDay && bestDay.calories > 0 && (
              <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🏆</span>
                    <span className="text-sm font-medium">Best Day</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(bestDay.date), "EEEE, MMM d")} - {bestDay.calories} cal
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WeeklySummary;
