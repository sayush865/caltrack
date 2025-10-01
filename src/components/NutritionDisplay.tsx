import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NutritionDisplayProps {
  data: {
    food_name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    vitamin_a: number;
    vitamin_c: number;
    calcium: number;
    iron: number;
    meal_type: string;
  };
}

export default function NutritionDisplay({ data }: NutritionDisplayProps) {
  const macros = [
    { label: 'Protein', value: data.protein, unit: 'g', color: 'bg-chart-1' },
    { label: 'Carbs', value: data.carbs, unit: 'g', color: 'bg-chart-2' },
    { label: 'Fat', value: data.fat, unit: 'g', color: 'bg-chart-3' },
  ];

  const micros = [
    { label: 'Fiber', value: data.fiber, unit: 'g' },
    { label: 'Sugar', value: data.sugar, unit: 'g' },
    { label: 'Sodium', value: data.sodium, unit: 'mg' },
    { label: 'Vitamin A', value: data.vitamin_a, unit: 'IU' },
    { label: 'Vitamin C', value: data.vitamin_c, unit: 'mg' },
    { label: 'Calcium', value: data.calcium, unit: 'mg' },
    { label: 'Iron', value: data.iron, unit: 'mg' },
  ];

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{data.food_name}</CardTitle>
          <Badge variant="secondary" className="capitalize">
            {data.meal_type}
          </Badge>
        </div>
        <div className="text-3xl font-bold text-primary mt-2">
          {data.calories} <span className="text-lg font-normal text-muted-foreground">cal</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Macronutrients</h3>
          <div className="grid grid-cols-3 gap-3">
            {macros.map((macro) => (
              <div key={macro.label} className="text-center">
                <div className={`${macro.color} text-white rounded-lg p-3 mb-2`}>
                  <div className="text-xl font-bold">{macro.value}</div>
                  <div className="text-xs opacity-90">{macro.unit}</div>
                </div>
                <div className="text-xs font-medium text-muted-foreground">{macro.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Micronutrients</h3>
          <div className="grid grid-cols-2 gap-2">
            {micros.map((micro) => (
              <div key={micro.label} className="flex justify-between items-center bg-muted/50 rounded-lg px-3 py-2">
                <span className="text-sm font-medium">{micro.label}</span>
                <span className="text-sm text-muted-foreground">
                  {micro.value}{micro.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}