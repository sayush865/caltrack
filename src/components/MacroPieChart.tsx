import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

interface MacroPieChartProps {
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

const MacroPieChart = ({ protein, carbs, fat, fiber = 0 }: MacroPieChartProps) => {
  // Calculate calories from macros (protein: 4 cal/g, carbs: 4 cal/g, fat: 9 cal/g, fiber: 2 cal/g)
  const proteinCals = protein * 4;
  const carbsCals = carbs * 4;
  const fatCals = fat * 9;
  const fiberCals = fiber * 2;
  const totalCals = proteinCals + carbsCals + fatCals + fiberCals;

  const data = [
    { name: "Protein", value: proteinCals, percentage: totalCals > 0 ? Math.round((proteinCals / totalCals) * 100) : 0 },
    { name: "Carbs", value: carbsCals, percentage: totalCals > 0 ? Math.round((carbsCals / totalCals) * 100) : 0 },
    { name: "Fat", value: fatCals, percentage: totalCals > 0 ? Math.round((fatCals / totalCals) * 100) : 0 },
    { name: "Fiber", value: fiberCals, percentage: totalCals > 0 ? Math.round((fiberCals / totalCals) * 100) : 0 },
  ];

  const COLORS = ["hsl(217, 91%, 60%)", "hsl(45, 93%, 47%)", "hsl(350, 89%, 60%)", "hsl(142, 71%, 45%)"];

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    if (percentage < 5) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${percentage}%`}
      </text>
    );
  };

  if (totalCals === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Macro Distribution</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            No data for this week
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Macro Distribution</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                labelLine={false}
                label={renderCustomLabel}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry: any) => (
                  <span className="text-xs text-muted-foreground">
                    {value} ({data[entry.payload.index || 0]?.percentage}%)
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center mt-2">
          <div>
            <p className="text-sm font-medium text-blue-500">{protein}g</p>
            <p className="text-xs text-muted-foreground">Protein</p>
          </div>
          <div>
            <p className="text-sm font-medium text-amber-500">{carbs}g</p>
            <p className="text-xs text-muted-foreground">Carbs</p>
          </div>
          <div>
            <p className="text-sm font-medium text-rose-500">{fat}g</p>
            <p className="text-xs text-muted-foreground">Fat</p>
          </div>
          <div>
            <p className="text-sm font-medium text-green-500">{fiber}g</p>
            <p className="text-xs text-muted-foreground">Fiber</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MacroPieChart;
