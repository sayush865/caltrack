import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Lightbulb, ChevronLeft, ChevronRight, RefreshCw, Target, Zap, Trophy, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Insight {
  category: 'strength' | 'improve' | 'goal' | 'quick_win' | 'celebration';
  emoji: string;
  message: string;
}

const categoryConfig = {
  strength: { icon: Trophy, color: 'text-green-500', bg: 'bg-green-500/10' },
  improve: { icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  goal: { icon: Target, color: 'text-primary', bg: 'bg-primary/10' },
  quick_win: { icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  celebration: { icon: Trophy, color: 'text-purple-500', bg: 'bg-purple-500/10' },
};

export default function DailyInsightCard() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = useCallback(async (showRefreshToast = false) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (showRefreshToast) setRefreshing(true);

      const { data, error } = await supabase.functions.invoke('generate-insights', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error fetching insights:', error);
        throw error;
      }

      if (data?.insights && Array.isArray(data.insights)) {
        setInsights(data.insights);
        setCurrentIndex(0);
        if (showRefreshToast) {
          toast.success('Insights refreshed!');
        }
      }
    } catch (error: any) {
      console.error('Error generating insights:', error);
      // Fallback insights
      setInsights([
        { category: 'goal', emoji: '👋', message: 'Keep tracking to unlock personalized insights!' }
      ]);
      if (showRefreshToast) {
        toast.error('Could not refresh insights');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const nextInsight = () => {
    setCurrentIndex((prev) => (prev + 1) % insights.length);
  };

  const prevInsight = () => {
    setCurrentIndex((prev) => (prev - 1 + insights.length) % insights.length);
  };

  const handleRefresh = () => {
    fetchInsights(true);
  };

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </div>
      </Card>
    );
  }

  if (insights.length === 0) return null;

  const currentInsight = insights[currentIndex];
  const config = categoryConfig[currentInsight.category] || categoryConfig.goal;
  const IconComponent = config.icon;

  return (
    <Card className="overflow-hidden border border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
            <span className="text-base">{currentInsight.emoji}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-relaxed">
              {currentInsight.message}
            </p>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            
            {insights.length > 1 && (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
