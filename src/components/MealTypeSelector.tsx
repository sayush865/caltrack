import { Button } from '@/components/ui/button';
import { Sun, Coffee, Utensils, Moon, Cookie } from 'lucide-react';

interface MealTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const mealTypes = [
  { value: 'breakfast', label: 'Breakfast', icon: Coffee, emoji: '🌅' },
  { value: 'lunch', label: 'Lunch', icon: Sun, emoji: '☀️' },
  { value: 'dinner', label: 'Dinner', icon: Moon, emoji: '🌙' },
  { value: 'snack', label: 'Snack', icon: Cookie, emoji: '🍪' },
];

export default function MealTypeSelector({ value, onChange }: MealTypeSelectorProps) {
  // Auto-suggest based on time of day
  const getAutoSuggestion = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 15) return 'lunch';
    if (hour >= 15 && hour < 18) return 'snack';
    if (hour >= 18 && hour < 22) return 'dinner';
    return 'snack';
  };

  const suggestedType = getAutoSuggestion();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Meal Type</label>
        {!value && (
          <span className="text-xs text-muted-foreground">
            Suggested: {mealTypes.find(m => m.value === suggestedType)?.label}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {mealTypes.map((meal) => (
          <Button
            key={meal.value}
            variant={value === meal.value ? 'default' : 'outline'}
            size="sm"
            className={`h-10 px-4 gap-2 ${
              !value && meal.value === suggestedType 
                ? 'ring-2 ring-primary/30' 
                : ''
            }`}
            onClick={() => onChange(value === meal.value ? '' : meal.value)}
          >
            <span>{meal.emoji}</span>
            <span>{meal.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
