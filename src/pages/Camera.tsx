import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import CameraCapture from '@/components/CameraCapture';
import NutritionDisplay from '@/components/NutritionDisplay';
import AnalysisProgress from '@/components/AnalysisProgress';
import MealTypeSelector from '@/components/MealTypeSelector';
import { ArrowLeft } from 'lucide-react';

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

export default function Camera() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [mealType, setMealType] = useState<string>('');
  
  // Cache the image for reanalysis
  const cachedImageRef = useRef<string | null>(null);

  const analyzeImage = async (imageData: string) => {
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
      
      const { data, error } = await supabase.functions.invoke('analyze-food', {
        body: { imageBase64: imageData }
      });

      if (error) throw error;

      if (data?.nutritionData && data?.analysis) {
        setNutritionData(data.nutritionData);
        setAnalysisData(data.analysis);
        setShowConfirmation(true);
      } else {
        throw new Error('Invalid response from analysis');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze food image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCapture = async (imageData: string) => {
    // Cache the image for potential reanalysis
    cachedImageRef.current = imageData;
    await analyzeImage(imageData);
  };

  const handleSaveToLog = async () => {
    if (!nutritionData) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Upload image to storage if available
      let imageUrl = null;
      if (cachedImageRef.current) {
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const base64Data = cachedImageRef.current.split(',')[1];
        const binaryData = atob(base64Data);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('food-images')
          .upload(fileName, bytes, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        if (uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('food-images')
            .getPublicUrl(uploadData.path);
          imageUrl = publicUrl;
        }
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
          image_url: imageUrl,
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
    // Use cached image instead of re-uploading
    if (cachedImageRef.current) {
      analyzeImage(cachedImageRef.current);
    }
  };

  const handleCancel = () => {
    setNutritionData(null);
    setAnalysisData(null);
    cachedImageRef.current = null;
    setShowConfirmation(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
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
            <h1 className="text-3xl font-bold">Log Meal</h1>
            <p className="text-sm text-muted-foreground">
              Snap a photo to analyze nutrition
            </p>
          </div>
        </div>

        <AnalysisProgress isAnalyzing={analyzing} />

        {showConfirmation && nutritionData && (
          <Card className="border border-border bg-card p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Review Analysis</h2>
              <NutritionDisplay data={nutritionData} analysis={analysisData || undefined} />
            </div>

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
                Re-analyze
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
        )}

        {!analyzing && !showConfirmation && (
          <Card className="border border-border bg-card">
            <CameraCapture onCapture={handleCapture} disabled={analyzing} />
          </Card>
        )}
      </div>
    </div>
  );
}
