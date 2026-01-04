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
  const [selectedAmount, setSelectedAmount] = useState(250);

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

      // Use selectedDate but set to current time of day for that date
      const logTime = new Date(selectedDate);
      const now = new Date();
      logTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

      const { data, error } = await supabase
        .from('water_logs')
        .insert({
          user_id: user.id,
          amount_ml: amount,
          logged_at: logTime.toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

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

  const removeWater = async (amount: number) => {
    if (totalMl <= 0) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use selectedDate but set to current time of day for that date
      const logTime = new Date(selectedDate);
      const now = new Date();
      logTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

      const { error } = await supabase
        .from('water_logs')
        .insert({
          user_id: user.id,
          amount_ml: -Math.min(amount, totalMl),
          logged_at: logTime.toISOString(),
        });

      if (error) throw error;

      toast({
        title: `-${Math.min(amount, totalMl)}ml`,
        description: "Water removed",
      });
    } catch (error: any) {
      console.error('Error removing water:', error);
      toast({
        title: "Failed to remove water",
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
    } catch (error) {
      console.error('Undo error:', error);
    }
  };

  const percentage = Math.min((totalMl / goal) * 100, 100);

  const amountOptions = [
    { label: '250ml', value: 250 },
    { label: '500ml', value: 500 },
    { label: '1L', value: 1000 },
  ];

  if (loading) {
    return (
      <Card className="border border-border bg-card p-4 animate-pulse">
        <div className="h-24 bg-muted rounded" />
      </Card>
    );
  }

  return (
    <Card className="border border-border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Hydration</h3>
            <p className="text-xs text-muted-foreground">
              {totalMl}ml / {goal}ml
            </p>
          </div>
        </div>
        <div className="text-2xl font-bold text-primary">
          {Math.round(percentage)}%
        </div>
      </div>

      {/* Progress */}
      <Progress value={percentage} className="h-2.5" />

      {/* Quantity Selection */}
      <div className="flex gap-2">
        {amountOptions.map((option) => (
          <Button
            key={option.value}
            variant={selectedAmount === option.value ? "default" : "outline"}
            size="sm"
            className="flex-1 h-9"
            onClick={() => setSelectedAmount(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Add/Remove Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full shrink-0"
          onClick={() => removeWater(selectedAmount)}
          disabled={totalMl <= 0}
        >
          <Minus className="w-5 h-5" />
        </Button>
        
        <div className="flex-1 text-center">
          <div className="text-2xl font-bold">{selectedAmount}ml</div>
          <p className="text-xs text-muted-foreground">selected</p>
        </div>
        
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shrink-0"
          onClick={() => addWater(selectedAmount)}
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>
    </Card>
  );
}
