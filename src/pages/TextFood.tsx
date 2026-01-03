import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import NutritionDisplay from '@/components/NutritionDisplay';
import AnalysisProgress from '@/components/AnalysisProgress';
import MealTypeSelector from '@/components/MealTypeSelector';
import PortionSlider from '@/components/PortionSlider';
import { ArrowLeft, Send } from 'lucide-react';

interface NutritionData {
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

interface AnalysisData {
  visual_analysis: string;
  portion_estimation: string;
  nutritional_reasoning: string;
}

export default function TextFood() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [description, setDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [mealType, setMealType] = useState<string>('');
  const [portionMultiplier, setPortionMultiplier] = useState(1);

  const analyzeDescription = async () => {
    if (!description.trim()) {
      toast({
        title: "Enter a description",
        description: "Please describe what you ate",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);
    setShowConfirmation(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to log meals",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('analyze-food-text', {
        body: { description: description.trim() }
      });

      if (error) throw error;

      if (data?.nutritionData && data?.analysis) {
        setNutritionData(data.nutritionData);
        setAnalysisData(data.analysis);
        setShowConfirmation(true);
        setPortionMultiplier(1);
      } else {
        throw new Error('Invalid response from analysis');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze food description. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getAdjustedNutrition = (): NutritionData | null => {
    if (!nutritionData) return null;
    return {
      ...nutritionData,
      calories: Math.round(nutritionData.calories * portionMultiplier),
      protein: Math.round(nutritionData.protein * portionMultiplier),
      carbs: Math.round(nutritionData.carbs * portionMultiplier),
      fat: Math.round(nutritionData.fat * portionMultiplier),
      fiber: Math.round(nutritionData.fiber * portionMultiplier),
      sugar: Math.round(nutritionData.sugar * portionMultiplier),
      sodium: Math.round(nutritionData.sodium * portionMultiplier),
      vitamin_a: Math.round(nutritionData.vitamin_a * portionMultiplier),
      vitamin_c: Math.round(nutritionData.vitamin_c * portionMultiplier),
      calcium: Math.round(nutritionData.calcium * portionMultiplier),
      iron: Math.round(nutritionData.iron * portionMultiplier),
    };
  };

  const handleSaveToLog = async () => {
    const adjustedData = getAdjustedNutrition();
    if (!adjustedData) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error: insertError } = await supabase
        .from('food_logs')
        .insert({
          user_id: user.id,
          food_name: adjustedData.food_name,
          calories: adjustedData.calories,
          protein: adjustedData.protein,
          carbs: adjustedData.carbs,
          fat: adjustedData.fat,
          fiber: adjustedData.fiber,
          sugar: adjustedData.sugar,
          sodium: adjustedData.sodium,
          vitamin_a: adjustedData.vitamin_a,
          vitamin_c: adjustedData.vitamin_c,
          calcium: adjustedData.calcium,
          iron: adjustedData.iron,
          meal_type: mealType || null,
          logged_at: new Date().toISOString(),
          status: 1
        });

      if (insertError) throw insertError;

      toast({
        title: "Success!",
        description: `${adjustedData.food_name} logged successfully`,
      });

      navigate('/');
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReanalyze = () => {
    setShowConfirmation(false);
    setNutritionData(null);
    setAnalysisData(null);
  };

  const handleCancel = () => {
    setNutritionData(null);
    setAnalysisData(null);
    setShowConfirmation(false);
    setDescription('');
  };

  const adjustedNutrition = getAdjustedNutrition();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4 border-b border-border pb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="h-11 w-11"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Type Your Meal</h1>
            <p className="text-sm text-muted-foreground">
              Describe what you ate for nutrition analysis
            </p>
          </div>
        </div>

        <AnalysisProgress isAnalyzing={analyzing} />

        {showConfirmation && adjustedNutrition && (
          <div className="space-y-4">
            <Card className="border border-border bg-card p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-4">Review Analysis</h2>
                <NutritionDisplay data={adjustedNutrition} analysis={analysisData || undefined} />
              </div>

              <PortionSlider 
                value={portionMultiplier} 
                onChange={setPortionMultiplier}
              />

              <MealTypeSelector 
                value={mealType} 
                onChange={setMealType}
              />

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={handleSaveToLog}
                  className="flex-1"
                  size="lg"
                >
                  Save to Log
                </Button>
                <Button
                  onClick={handleReanalyze}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  Edit & Re-analyze
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="ghost"
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        )}

        {!analyzing && !showConfirmation && (
          <Card className="border border-border bg-card p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">What did you eat?</label>
              <Textarea
                placeholder="e.g., 2 scrambled eggs with toast and butter, a glass of orange juice"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px] resize-none text-base"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length}/1000 characters
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Examples:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Chicken salad with olive oil",
                  "2 eggs, toast, coffee",
                  "Large pepperoni pizza slice",
                  "Grilled salmon with rice"
                ].map((example) => (
                  <Button
                    key={example}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => setDescription(example)}
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>

            <Button 
              onClick={analyzeDescription} 
              className="w-full" 
              size="lg"
              disabled={!description.trim()}
            >
              <Send className="w-4 h-4 mr-2" />
              Analyze Nutrition
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
