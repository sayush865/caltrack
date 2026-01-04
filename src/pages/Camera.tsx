import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import CameraCapture from '@/components/CameraCapture';
import AnalysisProgress from '@/components/AnalysisProgress';
import MealTypeSelector from '@/components/MealTypeSelector';
import FoodItemsList, { FoodItem } from '@/components/FoodItemsList';
import { ArrowLeft } from 'lucide-react';

interface AnalysisData {
  visual_analysis: string;
  portion_estimation: string;
  nutritional_reasoning: string;
}

export default function Camera() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [mealType, setMealType] = useState<string>('');
  
  // Cache the image for reanalysis and parallel upload
  const cachedImageRef = useRef<string | null>(null);
  const uploadPromiseRef = useRef<Promise<string | null> | null>(null);

  // Start uploading image in parallel with analysis
  const startParallelUpload = async (imageData: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const fileName = `${user.id}/${Date.now()}.webp`;
      const base64Data = imageData.split(',')[1];
      const mimeType = imageData.split(';')[0].split(':')[1] || 'image/jpeg';
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('food-images')
        .upload(fileName, bytes, {
          contentType: mimeType,
          upsert: false
        });

      if (uploadError) {
        console.error('Parallel upload error:', uploadError);
        return null;
      }

      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from('food-images')
          .getPublicUrl(uploadData.path);
        return publicUrl;
      }
      return null;
    } catch (error) {
      console.error('Parallel upload failed:', error);
      return null;
    }
  };

  const analyzeImage = async (imageData: string) => {
    setAnalyzing(true);
    setShowConfirmation(false);

    // Start parallel upload immediately
    uploadPromiseRef.current = startParallelUpload(imageData);

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

      if (data?.items && Array.isArray(data.items)) {
        // Convert API items to FoodItem format with IDs and multipliers
        const items: FoodItem[] = data.items.map((item: any, index: number) => ({
          id: `item-${index}-${Date.now()}`,
          name: item.name,
          portion: item.portion,
          confidence: item.confidence || 80,
          portionMultiplier: 1,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber || 0,
          sugar: item.sugar || 0,
          sodium: item.sodium || 0,
          vitamin_a: item.vitamin_a || 0,
          vitamin_c: item.vitamin_c || 0,
          calcium: item.calcium || 0,
          iron: item.iron || 0,
        }));
        
        setFoodItems(items);
        setAnalysisData(data.analysis || null);
        setShowConfirmation(true);
      } else if (data?.nutritionData) {
        // Fallback for backward compatibility
        const item: FoodItem = {
          id: `item-0-${Date.now()}`,
          name: data.nutritionData.food_name,
          portion: 'As shown',
          confidence: 80,
          portionMultiplier: 1,
          calories: data.nutritionData.calories,
          protein: data.nutritionData.protein,
          carbs: data.nutritionData.carbs,
          fat: data.nutritionData.fat,
          fiber: data.nutritionData.fiber || 0,
          sugar: data.nutritionData.sugar || 0,
          sodium: data.nutritionData.sodium || 0,
          vitamin_a: data.nutritionData.vitamin_a || 0,
          vitamin_c: data.nutritionData.vitamin_c || 0,
          calcium: data.nutritionData.calcium || 0,
          iron: data.nutritionData.iron || 0,
        };
        
        setFoodItems([item]);
        setAnalysisData(data.analysis || null);
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

  const handleUpdateItem = (id: string, multiplier: number) => {
    setFoodItems(items => 
      items.map(item => 
        item.id === id ? { ...item, portionMultiplier: multiplier } : item
      )
    );
  };

  const handleRemoveItem = (id: string) => {
    setFoodItems(items => items.filter(item => item.id !== id));
  };

  const handleSaveToLog = async () => {
    if (foodItems.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Wait for parallel upload to complete (should already be done)
      let imageUrl = await uploadPromiseRef.current;

      // Calculate totals from all items with their multipliers
      const totals = foodItems.reduce((acc, item) => ({
        calories: acc.calories + Math.round(item.calories * item.portionMultiplier),
        protein: acc.protein + item.protein * item.portionMultiplier,
        carbs: acc.carbs + item.carbs * item.portionMultiplier,
        fat: acc.fat + item.fat * item.portionMultiplier,
        fiber: acc.fiber + item.fiber * item.portionMultiplier,
        sugar: acc.sugar + item.sugar * item.portionMultiplier,
        sodium: acc.sodium + item.sodium * item.portionMultiplier,
        vitamin_a: acc.vitamin_a + item.vitamin_a * item.portionMultiplier,
        vitamin_c: acc.vitamin_c + item.vitamin_c * item.portionMultiplier,
        calcium: acc.calcium + item.calcium * item.portionMultiplier,
        iron: acc.iron + item.iron * item.portionMultiplier,
      }), {
        calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0,
        sodium: 0, vitamin_a: 0, vitamin_c: 0, calcium: 0, iron: 0
      });

      // Generate combined food name
      const foodName = foodItems.length === 1 
        ? foodItems[0].name 
        : foodItems.slice(0, 3).map(i => i.name).join(', ') + 
          (foodItems.length > 3 ? ` +${foodItems.length - 3} more` : '');

      const { error: insertError } = await supabase
        .from('food_logs')
        .insert({
          user_id: user.id,
          food_name: foodName,
          calories: Math.round(totals.calories),
          protein: Math.round(totals.protein * 10) / 10,
          carbs: Math.round(totals.carbs * 10) / 10,
          fat: Math.round(totals.fat * 10) / 10,
          fiber: Math.round(totals.fiber * 10) / 10,
          sugar: Math.round(totals.sugar * 10) / 10,
          sodium: Math.round(totals.sodium),
          vitamin_a: Math.round(totals.vitamin_a),
          vitamin_c: Math.round(totals.vitamin_c),
          calcium: Math.round(totals.calcium),
          iron: Math.round(totals.iron * 10) / 10,
          image_url: imageUrl,
          meal_type: mealType || null,
          logged_at: new Date().toISOString(),
          status: 1
        });

      if (insertError) throw insertError;

      toast({
        title: "Success!",
        description: `${foodItems.length} item${foodItems.length !== 1 ? 's' : ''} logged successfully`,
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
    setFoodItems([]);
    setAnalysisData(null);
    cachedImageRef.current = null;
    uploadPromiseRef.current = null;
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

        {showConfirmation && foodItems.length > 0 && (
          <div className="space-y-6">
            {/* AI Analysis summary */}
            {analysisData && (
              <Card className="border border-border bg-muted/30 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide mb-2">AI Analysis</h3>
                <p className="text-sm text-muted-foreground">{analysisData.visual_analysis}</p>
                <p className="text-xs text-muted-foreground mt-2 italic">{analysisData.portion_estimation}</p>
              </Card>
            )}

            {/* Food items list with editing */}
            <FoodItemsList
              items={foodItems}
              onUpdateItem={handleUpdateItem}
              onRemoveItem={handleRemoveItem}
            />

            {/* Meal type selector */}
            <MealTypeSelector 
              value={mealType} 
              onChange={setMealType}
            />

            {/* Action buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleSaveToLog}
                className="flex-1"
                size="lg"
                disabled={foodItems.length === 0}
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
          </div>
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
