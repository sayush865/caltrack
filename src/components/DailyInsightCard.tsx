import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Lightbulb, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startOfDay, subDays, format } from 'date-fns';

interface InsightData {
  avgCalories: number;
  avgProtein: number;
  goalCalories: number;
  goalProtein: number;
  daysLogged: number;
  proteinHitDays: number;
  calorieHitDays: number;
  todayCalories: number;
  todayProtein: number;
}

export default function DailyInsightCard() {
  const [insights, setInsights] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateInsights();
  }, []);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch last 7 days of data
      const sevenDaysAgo = startOfDay(subDays(new Date(), 7));
      const today = startOfDay(new Date());

      const [logsRes, goalsRes] = await Promise.all([
        supabase
          .from('food_logs')
          .select('calories, protein, logged_at')
          .eq('user_id', user.id)
          .eq('status', 1)
          .gte('logged_at', sevenDaysAgo.toISOString()),
        supabase
          .from('user_goals')
          .select('daily_calories, daily_protein')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (!logsRes.data || !goalsRes.data) {
        setInsights(['Start logging meals to get personalized insights! 🍽️']);
        setLoading(false);
        return;
      }

      // Group by day
      const dayTotals: Record<string, { calories: number; protein: number }> = {};
      logsRes.data.forEach(log => {
        const day = format(new Date(log.logged_at), 'yyyy-MM-dd');
        if (!dayTotals[day]) dayTotals[day] = { calories: 0, protein: 0 };
        dayTotals[day].calories += Number(log.calories) || 0;
        dayTotals[day].protein += Number(log.protein) || 0;
      });

      const days = Object.values(dayTotals);
      const todayKey = format(today, 'yyyy-MM-dd');
      const todayData = dayTotals[todayKey] || { calories: 0, protein: 0 };

      const data: InsightData = {
        avgCalories: days.length > 0 ? days.reduce((sum, d) => sum + d.calories, 0) / days.length : 0,
        avgProtein: days.length > 0 ? days.reduce((sum, d) => sum + d.protein, 0) / days.length : 0,
        goalCalories: goalsRes.data.daily_calories,
        goalProtein: goalsRes.data.daily_protein,
        daysLogged: days.length,
        proteinHitDays: days.filter(d => d.protein >= goalsRes.data.daily_protein).length,
        calorieHitDays: days.filter(d => d.calories >= goalsRes.data.daily_calories * 0.9 && d.calories <= goalsRes.data.daily_calories * 1.1).length,
        todayCalories: todayData.calories,
        todayProtein: todayData.protein,
      };

      setInsights(generateInsightMessages(data));
    } catch (error) {
      console.error('Error generating insights:', error);
      setInsights(['Keep up the great work with your nutrition journey! 💪']);
    } finally {
      setLoading(false);
    }
  };

  const generateInsightMessages = (data: InsightData): string[] => {
    const messages: string[] = [];

    // Protein consistency
    if (data.proteinHitDays >= 5) {
      messages.push(`🎯 Amazing! You hit your protein goal ${data.proteinHitDays} out of 7 days!`);
    } else if (data.proteinHitDays >= 3) {
      messages.push(`💪 Good progress! You hit your protein goal ${data.proteinHitDays} days this week.`);
    }

    // Calorie tracking
    if (data.calorieHitDays >= 5) {
      messages.push(`✨ Excellent calorie control! ${data.calorieHitDays} days on target this week.`);
    }

    // Under-eating alert
    if (data.avgCalories > 0 && data.avgCalories < data.goalCalories * 0.8) {
      const deficit = Math.round(data.goalCalories - data.avgCalories);
      messages.push(`⚠️ You're averaging ${deficit} cal under budget. Consider adding a healthy snack!`);
    }

    // Over-eating alert
    if (data.avgCalories > data.goalCalories * 1.15) {
      messages.push(`📊 You're averaging ${Math.round(data.avgCalories - data.goalCalories)} cal over budget. Try smaller portions.`);
    }

    // Protein tip
    if (data.avgProtein < data.goalProtein * 0.8) {
      messages.push(`🥩 Boost your protein! Try adding eggs, chicken, or Greek yogurt.`);
    }

    // Today specific
    const remaining = data.goalCalories - data.todayCalories;
    if (remaining > 0 && remaining < 500 && data.todayCalories > 0) {
      messages.push(`🔥 ${Math.round(remaining)} calories left today. You're almost there!`);
    }

    // Logging consistency
    if (data.daysLogged >= 6) {
      messages.push(`📈 Great consistency! You've logged ${data.daysLogged} days this week.`);
    } else if (data.daysLogged <= 2) {
      messages.push(`📝 Log more meals to unlock personalized insights!`);
    }

    // Default if no specific insights
    if (messages.length === 0) {
      messages.push(`👋 Keep tracking to get personalized nutrition insights!`);
    }

    return messages.slice(0, 5); // Max 5 insights
  };

  const nextInsight = () => {
    setCurrentIndex((prev) => (prev + 1) % insights.length);
  };

  const prevInsight = () => {
    setCurrentIndex((prev) => (prev - 1 + insights.length) % insights.length);
  };

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-12 bg-muted rounded" />
      </Card>
    );
  }

  if (insights.length === 0) return null;

  return (
    <Card className="overflow-hidden border border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-relaxed">
              {insights[currentIndex]}
            </p>
          </div>

          {insights.length > 1 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={prevInsight}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[2rem] text-center">
                {currentIndex + 1}/{insights.length}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={nextInsight}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
