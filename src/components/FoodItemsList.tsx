import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FoodItem {
  id: string;
  name: string;
  portion: string;
  confidence: number;
  portionMultiplier: number;
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

interface FoodItemsListProps {
  items: FoodItem[];
  onUpdateItem: (id: string, multiplier: number) => void;
  onRemoveItem: (id: string) => void;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 85) {
    return (
      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
        High confidence
      </Badge>
    );
  } else if (confidence >= 60) {
    return (
      <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
        Review suggested
      </Badge>
    );
  } else {
    return (
      <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/30">
        Please verify
      </Badge>
    );
  }
}

function FoodItemCard({ 
  item, 
  onUpdateMultiplier, 
  onRemove 
}: { 
  item: FoodItem; 
  onUpdateMultiplier: (multiplier: number) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  
  const adjustedCalories = Math.round(item.calories * item.portionMultiplier);
  const adjustedProtein = Math.round(item.protein * item.portionMultiplier * 10) / 10;
  const adjustedCarbs = Math.round(item.carbs * item.portionMultiplier * 10) / 10;
  const adjustedFat = Math.round(item.fat * item.portionMultiplier * 10) / 10;

  const portionLabels = [
    { value: 0.5, label: '½' },
    { value: 0.75, label: '¾' },
    { value: 1, label: '1×' },
    { value: 1.5, label: '1½' },
    { value: 2, label: '2×' },
  ];

  return (
    <Card className="border border-border bg-card overflow-hidden">
      <div 
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold truncate">{item.name}</h4>
              <ConfidenceBadge confidence={item.confidence} />
            </div>
            <p className="text-sm text-muted-foreground">{item.portion}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold">{adjustedCalories}</div>
            <div className="text-xs text-muted-foreground">cal</div>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        
        {/* Quick macro summary */}
        <div className="flex gap-4 mt-3 text-sm">
          <span><span className="font-medium">{adjustedProtein}g</span> <span className="text-muted-foreground">protein</span></span>
          <span><span className="font-medium">{adjustedCarbs}g</span> <span className="text-muted-foreground">carbs</span></span>
          <span><span className="font-medium">{adjustedFat}g</span> <span className="text-muted-foreground">fat</span></span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          <Separator />
          
          {/* Portion adjuster */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Adjust Portion</span>
              <span className="text-sm text-muted-foreground">
                {item.portionMultiplier === 1 ? 'As shown' : `${item.portionMultiplier}× portion`}
              </span>
            </div>
            
            <div className="flex gap-2">
              {portionLabels.map((p) => (
                <Button
                  key={p.value}
                  variant={item.portionMultiplier === p.value ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateMultiplier(p.value);
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            
            <Slider
              value={[item.portionMultiplier]}
              onValueChange={([value]) => onUpdateMultiplier(value)}
              min={0.25}
              max={3}
              step={0.25}
              className="mt-2"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Detailed nutrition */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 rounded bg-muted/50">
              <span className="text-muted-foreground">Fiber:</span>{' '}
              <span className="font-medium">{Math.round(item.fiber * item.portionMultiplier * 10) / 10}g</span>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <span className="text-muted-foreground">Sugar:</span>{' '}
              <span className="font-medium">{Math.round(item.sugar * item.portionMultiplier * 10) / 10}g</span>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <span className="text-muted-foreground">Sodium:</span>{' '}
              <span className="font-medium">{Math.round(item.sodium * item.portionMultiplier)}mg</span>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <span className="text-muted-foreground">Iron:</span>{' '}
              <span className="font-medium">{Math.round(item.iron * item.portionMultiplier * 10) / 10}mg</span>
            </div>
          </div>

          {/* Remove button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove Item
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function FoodItemsList({ items, onUpdateItem, onRemoveItem }: FoodItemsListProps) {
  if (items.length === 0) {
    return (
      <Card className="border border-dashed border-border bg-muted/30 p-6">
        <div className="text-center text-muted-foreground">
          <p>No food items detected</p>
        </div>
      </Card>
    );
  }

  // Calculate totals
  const totals = items.reduce((acc, item) => ({
    calories: acc.calories + Math.round(item.calories * item.portionMultiplier),
    protein: acc.protein + item.protein * item.portionMultiplier,
    carbs: acc.carbs + item.carbs * item.portionMultiplier,
    fat: acc.fat + item.fat * item.portionMultiplier,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <div className="space-y-4">
      {/* Total summary */}
      <Card className="border border-border bg-primary/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Total</h3>
            <p className="text-sm text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{totals.calories}</div>
            <div className="text-sm text-muted-foreground">calories</div>
          </div>
        </div>
        <div className="flex gap-6 mt-3 text-sm">
          <span><span className="font-semibold">{Math.round(totals.protein)}g</span> protein</span>
          <span><span className="font-semibold">{Math.round(totals.carbs)}g</span> carbs</span>
          <span><span className="font-semibold">{Math.round(totals.fat)}g</span> fat</span>
        </div>
      </Card>

      {/* Individual items */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Detected Items
        </h3>
        {items.map((item) => (
          <FoodItemCard
            key={item.id}
            item={item}
            onUpdateMultiplier={(multiplier) => onUpdateItem(item.id, multiplier)}
            onRemove={() => onRemoveItem(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
