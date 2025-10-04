import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Flame, Beef, Wheat, Droplet, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getFoodImage } from '@/lib/foodImages';

type MeasurementUnit = 'serving' | 'g' | 'tbsp';

export default function EditFoodLog() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<MeasurementUnit>('serving');
  const [servings, setServings] = useState(1);
  const [showOtherNutrition, setShowOtherNutrition] = useState(false);
  
  const [originalData, setOriginalData] = useState<any>(null);
  const [currentData, setCurrentData] = useState({
    food_name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    vitamin_a: 0,
    vitamin_c: 0,
    calcium: 0,
    iron: 0,
    image_url: '',
  });

  useEffect(() => {
    fetchFoodLog();
  }, [id]);

  useEffect(() => {
    if (originalData) {
      updateNutritionalValues();
    }
  }, [servings, originalData]);

  const fetchFoodLog = async () => {
    try {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setOriginalData(data);
      setCurrentData(data);
    } catch (error: any) {
      toast({
        title: 'Error loading food',
        description: error.message,
        variant: 'destructive',
      });
      navigate('/daily-log');
    } finally {
      setLoading(false);
    }
  };

  const updateNutritionalValues = () => {
    const multiplier = servings;
    setCurrentData({
      ...originalData,
      calories: Math.round(originalData.calories * multiplier),
      protein: Math.round(originalData.protein * multiplier),
      carbs: Math.round(originalData.carbs * multiplier),
      fat: Math.round(originalData.fat * multiplier),
      fiber: Math.round((originalData.fiber || 0) * multiplier),
      sugar: Math.round((originalData.sugar || 0) * multiplier),
      sodium: Math.round((originalData.sodium || 0) * multiplier),
      vitamin_a: Math.round((originalData.vitamin_a || 0) * multiplier),
      vitamin_c: Math.round((originalData.vitamin_c || 0) * multiplier),
      calcium: Math.round((originalData.calcium || 0) * multiplier),
      iron: Math.round((originalData.iron || 0) * multiplier),
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('food_logs')
        .update(currentData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Food updated',
        description: 'Your food log has been updated successfully.',
      });
      navigate('/daily-log');
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const foodImage = currentData.image_url && currentData.image_url.startsWith('http')
    ? currentData.image_url
    : getFoodImage(currentData.food_name);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/daily-log')}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Edit Food</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Food Header */}
        <div className="flex items-center gap-4">
          <img
            src={foodImage}
            alt={currentData.food_name}
            className="w-20 h-20 rounded-xl object-cover border border-border"
          />
          <h2 className="text-2xl font-bold flex-1">{currentData.food_name}</h2>
        </div>

        {/* Measurement Units */}
        <div>
          <h3 className="font-semibold mb-3">Measurement</h3>
          <div className="flex gap-2">
            {(['tbsp', 'g', 'serving'] as MeasurementUnit[]).map((unit) => (
              <Button
                key={unit}
                variant={selectedUnit === unit ? 'default' : 'outline'}
                className="flex-1 capitalize rounded-full"
                onClick={() => setSelectedUnit(unit)}
              >
                {unit === 'tbsp' ? 'Tbsp' : unit === 'g' ? 'G' : 'Serving'}
              </Button>
            ))}
          </div>
        </div>

        {/* Number of Servings */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Number of Servings</h3>
          <div className="flex items-center gap-2 px-4 py-2 border-2 border-foreground rounded-full">
            <Input
              type="number"
              min="0.1"
              step="0.1"
              value={servings}
              onChange={(e) => setServings(Math.max(0.1, parseFloat(e.target.value) || 1))}
              className="w-20 text-center border-0 p-0 h-auto text-lg font-semibold focus-visible:ring-0"
            />
          </div>
        </div>

        {/* Calories Card */}
        <Card className="p-6 bg-muted/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-background rounded-full">
              <Flame className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Calories</p>
              <p className="text-3xl font-bold">{currentData.calories}</p>
            </div>
          </div>
        </Card>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <Beef className="w-5 h-5 mx-auto mb-2 text-red-500" />
            <p className="text-xs text-muted-foreground mb-1">Protein</p>
            <p className="text-xl font-bold">{currentData.protein}g</p>
          </Card>
          <Card className="p-4 text-center">
            <Wheat className="w-5 h-5 mx-auto mb-2 text-amber-500" />
            <p className="text-xs text-muted-foreground mb-1">Carbs</p>
            <p className="text-xl font-bold">{currentData.carbs}g</p>
          </Card>
          <Card className="p-4 text-center">
            <Droplet className="w-5 h-5 mx-auto mb-2 text-blue-500" />
            <p className="text-xs text-muted-foreground mb-1">Fats</p>
            <p className="text-xl font-bold">{currentData.fat}g</p>
          </Card>
        </div>

        {/* Other Nutrition Facts */}
        <Collapsible open={showOtherNutrition} onOpenChange={setShowOtherNutrition}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between text-lg font-semibold p-0 h-auto hover:bg-transparent"
            >
              Other nutrition facts
              <ChevronDown
                className={`w-5 h-5 transition-transform ${
                  showOtherNutrition ? 'rotate-180' : ''
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-4">
            {currentData.fiber > 0 && (
              <Card className="p-4 flex justify-between items-center">
                <span className="text-muted-foreground">Fiber</span>
                <span className="font-semibold">{currentData.fiber}g</span>
              </Card>
            )}
            {currentData.sugar > 0 && (
              <Card className="p-4 flex justify-between items-center">
                <span className="text-muted-foreground">Sugar</span>
                <span className="font-semibold">{currentData.sugar}g</span>
              </Card>
            )}
            {currentData.sodium > 0 && (
              <Card className="p-4 flex justify-between items-center">
                <span className="text-muted-foreground">Sodium</span>
                <span className="font-semibold">{currentData.sodium}mg</span>
              </Card>
            )}
            {currentData.vitamin_a > 0 && (
              <Card className="p-4 flex justify-between items-center">
                <span className="text-muted-foreground">Vitamin A</span>
                <span className="font-semibold">{currentData.vitamin_a}%</span>
              </Card>
            )}
            {currentData.vitamin_c > 0 && (
              <Card className="p-4 flex justify-between items-center">
                <span className="text-muted-foreground">Vitamin C</span>
                <span className="font-semibold">{currentData.vitamin_c}%</span>
              </Card>
            )}
            {currentData.calcium > 0 && (
              <Card className="p-4 flex justify-between items-center">
                <span className="text-muted-foreground">Calcium</span>
                <span className="font-semibold">{currentData.calcium}%</span>
              </Card>
            )}
            {currentData.iron > 0 && (
              <Card className="p-4 flex justify-between items-center">
                <span className="text-muted-foreground">Iron</span>
                <span className="font-semibold">{currentData.iron}%</span>
              </Card>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-full py-6 text-lg font-semibold"
          size="lg"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
