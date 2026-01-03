import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, Undo2 } from 'lucide-react';

interface RecentFood {
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
}

export default function QuickAddWidget() {
  const { toast } = useToast();
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentFoods();
  }, []);

  const fetchRecentFoods = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get unique recent foods (last 5 unique by food_name)
      const { data: logs } = await supabase
        .from('food_logs')
        .select('food_name, calories, protein, carbs, fat, fiber, sugar, sodium, vitamin_a, vitamin_c, calcium, iron')
        .eq('user_id', user.id)
        .eq('status', 1)
        .order('logged_at', { ascending: false })
        .limit(50);

      if (logs) {
        // Deduplicate by food_name, keeping the most recent
        const seen = new Set<string>();
        const unique: RecentFood[] = [];
        
        for (const log of logs) {
          if (log.food_name && !seen.has(log.food_name.toLowerCase())) {
            seen.add(log.food_name.toLowerCase());
            unique.push({
              food_name: log.food_name,
              calories: Number(log.calories) || 0,
              protein: Number(log.protein) || 0,
              carbs: Number(log.carbs) || 0,
              fat: Number(log.fat) || 0,
              fiber: Number(log.fiber) || 0,
              sugar: Number(log.sugar) || 0,
              sodium: Number(log.sodium) || 0,
              vitamin_a: Number(log.vitamin_a) || 0,
              vitamin_c: Number(log.vitamin_c) || 0,
              calcium: Number(log.calcium) || 0,
              iron: Number(log.iron) || 0,
            });
            if (unique.length >= 5) break;
          }
        }
        
        setRecentFoods(unique);
      }
    } catch (error) {
      console.error('Error fetching recent foods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = async (food: RecentFood) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('food_logs')
        .insert({
          user_id: user.id,
          food_name: food.food_name,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          fiber: food.fiber,
          sugar: food.sugar,
          sodium: food.sodium,
          vitamin_a: food.vitamin_a,
          vitamin_c: food.vitamin_c,
          calcium: food.calcium,
          iron: food.iron,
          logged_at: new Date().toISOString(),
          status: 1
        })
        .select('id')
        .single();

      if (error) throw error;

      setLastAddedId(data.id);

      toast({
        title: "Added!",
        description: `${food.food_name} (${food.calories} cal)`,
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
      console.error('Quick add error:', error);
      toast({
        title: "Failed to add",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUndo = async (id: string) => {
    try {
      await supabase
        .from('food_logs')
        .update({ status: 0, deleted_at: new Date().toISOString() })
        .eq('id', id);

      toast({
        title: "Undone",
        description: "Food entry removed",
      });
      
      setLastAddedId(null);
    } catch (error) {
      console.error('Undo error:', error);
    }
  };

  if (loading || recentFoods.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">Quick Add</h3>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {recentFoods.map((food, index) => (
          <Button
            key={`${food.food_name}-${index}`}
            variant="outline"
            size="sm"
            className="h-9 px-3 whitespace-nowrap shrink-0 gap-1.5"
            onClick={() => handleQuickAdd(food)}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="max-w-[120px] truncate">{food.food_name}</span>
            <span className="text-xs text-muted-foreground">
              {food.calories}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
