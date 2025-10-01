import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FoodLogItemProps {
  log: {
    id: string;
    food_name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    image_url: string;
    meal_type: string;
    logged_at: string;
  };
}

export default function FoodLogItem({ log }: FoodLogItemProps) {
  return (
    <Card className="overflow-hidden hover:border-foreground/20 transition-all border border-border bg-card">
      <div className="flex gap-4 p-4">
        <img 
          src={log.image_url} 
          alt={log.food_name}
          className="w-28 h-28 rounded-lg object-cover flex-shrink-0 border border-border"
        />
        <CardContent className="flex-1 p-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-base line-clamp-1">{log.food_name}</h3>
              <p className="text-xs text-muted-foreground">
                {format(new Date(log.logged_at), 'MMM d, h:mm a')}
              </p>
            </div>
            <Badge variant="secondary" className="capitalize text-xs">
              {log.meal_type}
            </Badge>
          </div>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="font-bold text-primary">{log.calories}</span>
              <span className="text-muted-foreground text-xs ml-1">cal</span>
            </div>
            <div>
              <span className="font-semibold">{log.protein}g</span>
              <span className="text-muted-foreground text-xs ml-1">protein</span>
            </div>
            <div>
              <span className="font-semibold">{log.carbs}g</span>
              <span className="text-muted-foreground text-xs ml-1">carbs</span>
            </div>
            <div>
              <span className="font-semibold">{log.fat}g</span>
              <span className="text-muted-foreground text-xs ml-1">fat</span>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}