import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Droplets } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';

interface WaterLog {
  id: string;
  amount_ml: number;
  logged_at: string;
}

interface WaterHistoryProps {
  selectedDate: Date;
}

export default function WaterHistory({ selectedDate }: WaterHistoryProps) {
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWaterLogs();

    const channel = supabase
      .channel('water_history_changes')
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
        .select('id, amount_ml, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', dayStart.toISOString())
        .lte('logged_at', dayEnd.toISOString())
        .order('logged_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching water logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalMl = logs.reduce((sum, log) => sum + (log.amount_ml || 0), 0);

  if (loading) {
    return (
      <Card className="border border-border bg-card p-4 animate-pulse">
        <div className="h-20 bg-muted rounded" />
      </Card>
    );
  }

  if (logs.length === 0) {
    return null;
  }

  return (
    <Card className="border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Water Intake History</h3>
        </div>
        <span className="text-sm font-medium text-primary">{totalMl}ml total</span>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${log.amount_ml >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {log.amount_ml >= 0 ? '+' : ''}{log.amount_ml}ml
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {format(new Date(log.logged_at), 'h:mm a')}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
