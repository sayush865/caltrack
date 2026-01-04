import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import NutritionDisplay from '@/components/NutritionDisplay';
import AnalysisProgress from '@/components/AnalysisProgress';
import MealTypeSelector from '@/components/MealTypeSelector';
import NavigationConfirmDialog from '@/components/NavigationConfirmDialog';
import { useAnalysisAbort, useNavigationGuard } from '@/hooks/useAnalysisAbort';
import { ArrowLeft, Send, Sparkles } from 'lucide-react';

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
  const [showNavDialog, setShowNavDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Abort handling for graceful cancellation
  const { startAnalysis, completeAnalysis, abortAnalysis } = useAnalysisAbort();
  
  // Prevent accidental browser refresh/close during analysis
  useNavigationGuard(analyzing);

  // Handle navigation with confirmation during analysis
  const handleNavigate = useCallback((path: string) => {
    if (analyzing) {
      setPendingNavigation(path);
      setShowNavDialog(true);
    } else {
      navigate(path);
    }
  }, [analyzing, navigate]);

  const confirmNavigation = useCallback(() => {
    abortAnalysis();
    setAnalyzing(false);
    setShowNavDialog(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
  }, [abortAnalysis, navigate, pendingNavigation]);

  const cancelNavigation = useCallback(() => {
    setShowNavDialog(false);
    setPendingNavigation(null);
  }, []);

  const analyzeDescription = async () => {
    if (!description.trim()) {
      toast({
        title: "Enter a description",
        description: "Please describe what you ate",
        variant: "destructive",
      });
      return;
    }

    // Start analysis with abort signal
    const signal = startAnalysis();

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

      // Check if we were aborted
      if (signal.aborted) {
        console.log('Analysis was cancelled by user');
        return;
      }

      if (error) throw error;

      if (data?.nutritionData && data?.analysis) {
        setNutritionData(data.nutritionData);
        setAnalysisData(data.analysis);
        setShowConfirmation(true);
        
        toast({
          title: "Analysis complete!",
          description: `Identified: ${data.nutritionData.food_name}`,
        });
      } else {
        throw new Error('Invalid response from analysis');
      }
    } catch (error: any) {
      // Don't show error if we were intentionally aborted
      if (signal.aborted) {
        console.log('Analysis was cancelled');
        return;
      }
      
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze food description. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
      completeAnalysis();
    }
  };

  const isWaterEntry = (foodName: string): boolean => {
    const waterKeywords = ['water', 'h2o', 'hydration', 'glass of water', 'cup of water', 'bottle of water'];
    const lowerName = foodName.toLowerCase();
    return waterKeywords.some(keyword => lowerName.includes(keyword));
  };

  const extractWaterAmount = (foodName: string): number => {
    const lowerName = foodName.toLowerCase();
    
    // Check for specific amounts
    const mlMatch = lowerName.match(/(\d+)\s*ml/);
    if (mlMatch) return parseInt(mlMatch[1]);
    
    const literMatch = lowerName.match(/(\d+(?:\.\d+)?)\s*(?:l|liter|litre)/);
    if (literMatch) return parseFloat(literMatch[1]) * 1000;
    
    const ozMatch = lowerName.match(/(\d+)\s*(?:oz|ounce)/);
    if (ozMatch) return Math.round(parseInt(ozMatch[1]) * 29.5735);
    
    const cupMatch = lowerName.match(/(\d+)\s*cup/);
    if (cupMatch) return parseInt(cupMatch[1]) * 240;
    
    const glassMatch = lowerName.match(/(\d+)\s*glass/);
    if (glassMatch) return parseInt(glassMatch[1]) * 250;
    
    const bottleMatch = lowerName.match(/(\d+)\s*bottle/);
    if (bottleMatch) return parseInt(bottleMatch[1]) * 500;
    
    // Default amounts
    if (lowerName.includes('bottle')) return 500;
    if (lowerName.includes('glass') || lowerName.includes('cup')) return 250;
    
    return 250; // Default to 250ml
  };

  const handleSaveToLog = async () => {
    if (!nutritionData) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if this is a water entry
      if (isWaterEntry(nutritionData.food_name)) {
        const waterAmount = extractWaterAmount(nutritionData.food_name);
        
        const { error: waterError } = await supabase
          .from('water_logs')
          .insert({
            user_id: user.id,
            amount_ml: waterAmount,
            logged_at: new Date().toISOString(),
          });

        if (waterError) throw waterError;

        toast({
          title: "Water logged!",
          description: `${waterAmount}ml added to your hydration tracker`,
        });

        navigate('/');
        return;
      }

      const { error: insertError } = await supabase
        .from('food_logs')
        .insert({
          user_id: user.id,
          food_name: nutritionData.food_name,
          calories: nutritionData.calories,
          protein: nutritionData.protein,
          carbs: nutritionData.carbs,
          fat: nutritionData.fat,
          fiber: nutritionData.fiber,
          sugar: nutritionData.sugar,
          sodium: nutritionData.sodium,
          vitamin_a: nutritionData.vitamin_a,
          vitamin_c: nutritionData.vitamin_c,
          calcium: nutritionData.calcium,
          iron: nutritionData.iron,
          meal_type: mealType || null,
          logged_at: new Date().toISOString(),
          status: 1
        });

      if (insertError) throw insertError;

      toast({
        title: "Success!",
        description: `${nutritionData.food_name} logged successfully`,
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

  const exampleMeals = [
    { text: "Chicken salad with olive oil", icon: "🥗" },
    { text: "2 eggs, toast, coffee", icon: "🍳" },
    { text: "Large pepperoni pizza slice", icon: "🍕" },
    { text: "Grilled salmon with rice", icon: "🐟" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4 border-b border-border pb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleNavigate('/')}
            className="h-11 w-11"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Type Your Meal</h1>
            <p className="text-sm text-muted-foreground">
              {analyzing ? 'Analyzing your description...' : 'Describe what you ate for nutrition analysis'}
            </p>
          </div>
        </div>

        <AnalysisProgress 
          isAnalyzing={analyzing}
          analysisType="text"
        />

        {showConfirmation && nutritionData && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="border border-border bg-card p-6 space-y-6">
              <div className="flex items-center gap-2 text-sm text-primary">
                <Sparkles className="w-4 h-4" />
                <span className="font-medium">Analysis Complete</span>
              </div>
              
              <NutritionDisplay data={nutritionData} analysis={analysisData || undefined} />

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
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <span>What did you eat?</span>
              </label>
              <Textarea
                placeholder="e.g., 2 scrambled eggs with toast and butter, a glass of orange juice"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px] resize-none text-base"
                maxLength={1000}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Be specific about portions for better accuracy
                </p>
                <p className="text-xs text-muted-foreground">
                  {description.length}/1000
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Quick examples:</p>
              <div className="grid grid-cols-2 gap-2">
                {exampleMeals.map((example) => (
                  <Button
                    key={example.text}
                    variant="outline"
                    size="sm"
                    className="h-auto py-2 px-3 justify-start text-left"
                    onClick={() => setDescription(example.text)}
                  >
                    <span className="mr-2">{example.icon}</span>
                    <span className="text-xs truncate">{example.text}</span>
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
      
      {/* Navigation confirmation dialog */}
      <NavigationConfirmDialog
        open={showNavDialog}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />
    </div>
  );
}
