import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Droplets, Plus, Minus, Undo2 } from 'lucide-react';
import { startOfDay, endOfDay } from 'date-fns';

interface WaterTrackerProps {
  selectedDate: Date;
  goal?: number;
}

export default function WaterTracker({ selectedDate, goal = 2000 }: WaterTrackerProps) {
  const { toast } = useToast();
  const [totalMl, setTotalMl] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  useEffect(() => {
    fetchWaterLogs();
    
    const channel = supabase
      .channel('water_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'water_logs',
        },
        () => {
          fetchWaterLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  const fetchWaterLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dayStart = startOfDay(selectedDate);
      const dayEnd = endOfDay(selectedDate);

      const { data, error } = await supabase
        .from('water_logs')
        .select('amount_ml')
        .eq('user_id', user.id)
        .gte('logged_at', dayStart.toISOString())
        .lte('logged_at', dayEnd.toISOString());

      if (error) throw error;

      const total = (data || []).reduce((sum, log) => sum + (log.amount_ml || 0), 0);
      setTotalMl(total);
    } catch (error) {
      console.error('Error fetching water logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const addWater = async (amount: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('water_logs')
        .insert({
          user_id: user.id,
          amount_ml: amount,
          logged_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

      setLastAddedId(data.id);
      
      toast({
        title: `+${amount}ml`,
        description: "Water logged",
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleUndo(data.id)}
            className="h-8 gap-1"
          >
            <Undo2 className="w-3 h-3" />
            Undo
          </Button>
        ),
      });
    } catch (error: any) {
      console.error('Error adding water:', error);
      toast({
        title: "Failed to log water",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUndo = async (id: string) => {
    try {
      await supabase
        .from('water_logs')
        .delete()
        .eq('id', id);

      toast({
        title: "Undone",
        description: "Water entry removed",
      });
      
      setLastAddedId(null);
    } catch (error) {
      console.error('Undo error:', error);
    }
  };

  const percentage = Math.min((totalMl / goal) * 100, 100);
  const glasses = Math.floor(totalMl / 250);

  const quickAddOptions = [
    { label: 'Glass', amount: 250, emoji: '🥛' },
    { label: 'Bottle', amount: 500, emoji: '🍶' },
    { label: 'Large', amount: 750, emoji: '🫗' },
  ];

  if (loading) {
    return (
      <Card className="border border-border bg-card p-4 animate-pulse">
        <div className="h-20 bg-muted rounded" />
      </Card>
    );
  }

  return (
    <Card className="border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Hydration</h3>
            <p className="text-xs text-muted-foreground">
              {glasses} glasses • {totalMl}ml / {goal}ml
            </p>
          </div>
        </div>
        <div className="text-2xl font-bold">
          {Math.round(percentage)}%
        </div>
      </div>

      <Progress value={percentage} className="h-2" />

      <div className="flex gap-2">
        {quickAddOptions.map((option) => (
          <Button
            key={option.amount}
            variant="outline"
            size="sm"
            className="flex-1 h-10 gap-1.5"
            onClick={() => addWater(option.amount)}
          >
            <span>{option.emoji}</span>
            <span className="text-xs">{option.amount}ml</span>
          </Button>
        ))}
      </div>
    </Card>
  );
}
