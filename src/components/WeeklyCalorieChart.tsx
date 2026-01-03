import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { format } from "date-fns";

interface DailyData {
  date: string;
  calories: number;
}

interface WeeklyCalorieChartProps {
  data: DailyData[];
  goal: number;
}

const WeeklyCalorieChart = ({ data, goal }: WeeklyCalorieChartProps) => {
  const chartData = data.map(d => ({
    day: format(new Date(d.date), "EEE"),
    calories: d.calories,
    isOverGoal: d.calories > goal,
    isNearGoal: d.calories >= goal * 0.9 && d.calories <= goal * 1.1,
  }));

  const getBarColor = (entry: typeof chartData[0]) => {
    if (entry.calories === 0) return "hsl(var(--muted))";
    if (entry.isNearGoal) return "hsl(142, 76%, 36%)"; // Green
    if (entry.isOverGoal) return "hsl(0, 84%, 60%)"; // Red
    return "hsl(var(--primary))";
  };

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Daily Calories</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                width={40}
              />
              <ReferenceLine 
                y={goal} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="3 3"
                label={{ 
                  value: 'Goal', 
                  position: 'right', 
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 10 
                }}
              />
              <Bar 
                dataKey="calories" 
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-green-600" />
            <span>On target</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-primary" />
            <span>Under</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            <span>Over</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyCalorieChart;
