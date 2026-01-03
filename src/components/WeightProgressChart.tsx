import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format, addDays, differenceInDays } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WeightLog {
  weight: number;
  logged_at: string;
}

interface WeightProgressChartProps {
  unitsPreference: 'imperial' | 'metric';
  goalWeight: number | null;
  currentWeight: number | null;
}

export const WeightProgressChart = ({ unitsPreference, goalWeight, currentWeight }: WeightProgressChartProps) => {
  const [weightData, setWeightData] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWeight, setNewWeight] = useState("");
  const [isLogging, setIsLogging] = useState(false);

  useEffect(() => {
    fetchWeightHistory();
  }, []);

  const handleLogWeight = async () => {
    const weightValue = parseFloat(newWeight);
    if (isNaN(weightValue) || weightValue <= 0) {
      toast({ title: "Invalid weight", description: "Please enter a valid weight", variant: "destructive" });
      return;
    }

    setIsLogging(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('weight_logs')
        .insert({ user_id: user.id, weight: weightValue });

      if (error) throw error;

      toast({ title: "Weight logged!", description: `${weightValue} ${unitsPreference === 'imperial' ? 'lbs' : 'kg'} recorded` });
      setNewWeight("");
      fetchWeightHistory();
    } catch (error) {
      console.error('Error logging weight:', error);
      toast({ title: "Error", description: "Failed to log weight", variant: "destructive" });
    } finally {
      setIsLogging(false);
    }
  };

  const fetchWeightHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('weight_logs')
        .select('weight, logged_at')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: true })
        .limit(60);

      if (error) throw error;
      setWeightData(data || []);
    } catch (error) {
      console.error('Error fetching weight history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate projected goal date based on weight trend
  const calculateProjection = () => {
    if (!goalWeight || weightData.length < 2) return null;

    const recentData = weightData.slice(-14); // Last 14 entries for trend
    if (recentData.length < 2) return null;

    const firstEntry = recentData[0];
    const lastEntry = recentData[recentData.length - 1];
    
    const weightChange = Number(lastEntry.weight) - Number(firstEntry.weight);
    const daysDiff = differenceInDays(new Date(lastEntry.logged_at), new Date(firstEntry.logged_at));
    
    if (daysDiff === 0) return null;
    
    const dailyChange = weightChange / daysDiff;
    const currentW = Number(lastEntry.weight);
    const goalW = Number(goalWeight);
    
    // If no progress or wrong direction
    if (dailyChange === 0) return null;
    if (currentW > goalW && dailyChange > 0) return null; // Trying to lose but gaining
    if (currentW < goalW && dailyChange < 0) return null; // Trying to gain but losing
    
    const weightToGo = Math.abs(goalW - currentW);
    const daysToGoal = Math.ceil(weightToGo / Math.abs(dailyChange));
    
    // Cap at 365 days
    if (daysToGoal > 365) return { date: null, tooFar: true };
    
    const projectedDate = addDays(new Date(), daysToGoal);
    return { date: projectedDate, tooFar: false };
  };

  const projection = calculateProjection();

  const chartData = weightData.map(log => ({
    date: format(new Date(log.logged_at), 'MMM d'),
    weight: Number(log.weight),
  }));

  const unit = unitsPreference === 'imperial' ? 'lbs' : 'kg';

  const WeightLogForm = () => (
    <div className="flex gap-2 mb-4">
      <Input
        type="number"
        placeholder={`Weight (${unit})`}
        value={newWeight}
        onChange={(e) => setNewWeight(e.target.value)}
        className="flex-1"
        step="0.1"
        min="0"
      />
      <Button onClick={handleLogWeight} disabled={isLogging} size="sm">
        <Plus className="h-4 w-4 mr-1" />
        Log
      </Button>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Weight Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <WeightLogForm />
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (weightData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Weight Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <WeightLogForm />
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground text-center px-4">
            <p>No weight data logged yet</p>
            <p className="text-xs mt-1">Log your first weight above to start tracking</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate Y axis domain
  const weights = chartData.map(d => d.weight);
  const minWeight = Math.min(...weights, goalWeight || Infinity);
  const maxWeight = Math.max(...weights, goalWeight || -Infinity);
  const padding = (maxWeight - minWeight) * 0.1 || 5;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Weight Progress</CardTitle>
          {projection && (
            <div className="text-right">
              {projection.tooFar ? (
                <span className="text-xs text-muted-foreground">Goal date: 1yr+</span>
              ) : projection.date ? (
                <div className="text-xs">
                  <span className="text-muted-foreground">Est. goal: </span>
                  <span className="font-medium">{format(projection.date, 'MMM d, yyyy')}</span>
                </div>
              ) : null}
            </div>
          )}
        </div>
        {goalWeight && currentWeight && (
          <p className="text-xs text-muted-foreground">
            {Math.abs(currentWeight - goalWeight).toFixed(1)} {unit} to goal
          </p>
        )}
      </CardHeader>
      <CardContent>
        <WeightLogForm />
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
            <YAxis 
              className="text-xs" 
              domain={[Math.floor(minWeight - padding), Math.ceil(maxWeight + padding)]}
              tick={{ fontSize: 10 }}
              width={40}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px'
              }}
              formatter={(value: number) => [`${value} ${unit}`, 'Weight']}
            />
            {goalWeight && (
              <ReferenceLine 
                y={goalWeight} 
                stroke="hsl(142 76% 36%)" 
                strokeDasharray="5 5"
                label={{ 
                  value: `Goal: ${goalWeight}${unit}`, 
                  position: 'right',
                  fontSize: 10,
                  fill: 'hsl(142 76% 36%)'
                }}
              />
            )}
            <Line 
              type="monotone" 
              dataKey="weight" 
              stroke="hsl(var(--foreground))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--foreground))', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};