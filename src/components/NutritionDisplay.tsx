import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

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
  analysis?: {
    visual_analysis: string;
    portion_estimation: string;
    nutritional_reasoning: string;
  };
}

export default function NutritionDisplay({ data, analysis }: NutritionDisplayProps) {
  const totalMacros = data.protein + data.carbs + data.fat;
  
  const macros = [
    { 
      label: 'Protein', 
      value: data.protein, 
      unit: 'g', 
      color: 'hsl(var(--chart-1))',
      percentage: Math.round((data.protein / totalMacros) * 100)
    },
    { 
      label: 'Carbs', 
      value: data.carbs, 
      unit: 'g', 
      color: 'hsl(var(--chart-2))',
      percentage: Math.round((data.carbs / totalMacros) * 100)
    },
    { 
      label: 'Fat', 
      value: data.fat, 
      unit: 'g', 
      color: 'hsl(var(--chart-3))',
      percentage: Math.round((data.fat / totalMacros) * 100)
    },
  ];

  const micros = [
    { label: 'Fiber', value: data.fiber, unit: 'g', target: 25 },
    { label: 'Sugar', value: data.sugar, unit: 'g', target: 50 },
    { label: 'Sodium', value: data.sodium, unit: 'mg', target: 2300 },
    { label: 'Vitamin A', value: data.vitamin_a, unit: 'mcg', target: 900 },
    { label: 'Vitamin C', value: data.vitamin_c, unit: 'mg', target: 90 },
    { label: 'Calcium', value: data.calcium, unit: 'mg', target: 1000 },
    { label: 'Iron', value: data.iron, unit: 'mg', target: 18 },
  ];

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl mb-2">{data.food_name}</CardTitle>
            <Badge variant="secondary" className="capitalize font-medium">
              {data.meal_type}
            </Badge>
          </div>
        </div>
        <Separator className="bg-border" />
        <div className="flex items-baseline gap-2">
          <div className="text-5xl font-bold text-foreground">
            {data.calories}
          </div>
          <span className="text-lg font-medium text-muted-foreground">calories</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* AI Analysis Breakdown */}
        {analysis && (
          <>
            <div className="space-y-3 p-4 rounded-lg bg-muted border border-border">
              <h3 className="text-sm font-semibold uppercase tracking-wide">AI Analysis</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground mb-1">What I See:</p>
                  <p className="text-foreground leading-relaxed">{analysis.visual_analysis}</p>
                </div>
                
                <Separator className="bg-border" />
                
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Portion Estimation:</p>
                  <p className="text-foreground leading-relaxed">{analysis.portion_estimation}</p>
                </div>
                
                <Separator className="bg-border" />
                
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Nutritional Calculation:</p>
                  <p className="text-foreground leading-relaxed">{analysis.nutritional_reasoning}</p>
                </div>
              </div>
            </div>
            
            <Separator />
          </>
        )}

        {/* Macronutrients with Progress Bars */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Macronutrients</h3>
          <div className="space-y-4">
            {macros.map((macro) => (
              <div key={macro.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{macro.label}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-lg">{macro.value}</span>
                    <span className="text-muted-foreground">{macro.unit}</span>
                    <span className="text-xs text-muted-foreground ml-1">({macro.percentage}%)</span>
                  </div>
                </div>
                <Progress 
                  value={macro.percentage} 
                  className="h-2"
                  style={{ 
                    ['--progress-background' as any]: macro.color 
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Micronutrients Grid */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Micronutrients</h3>
          <div className="grid gap-3">
            {micros.map((micro) => {
              const percentage = Math.min((micro.value / micro.target) * 100, 100);
              return (
                <div key={micro.label} className="space-y-2 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{micro.label}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-semibold">{micro.value}</span>
                      <span className="text-xs text-muted-foreground">{micro.unit}</span>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}