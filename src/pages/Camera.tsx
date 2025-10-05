import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import CameraCapture from '@/components/CameraCapture';
import NutritionDisplay from '@/components/NutritionDisplay';
import { Loader2, ArrowLeft } from 'lucide-react';

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
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleCapture = async (imageData: string) => {
    setCapturedImage(imageData);
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

  const handleSaveToLog = async () => {
    if (!nutritionData) return;

    // Food is already saved by the edge function, just navigate back
    toast({
      title: "Success!",
      description: `${nutritionData.food_name} logged successfully`,
    });

    navigate('/daily-log');
  };

  const handleReanalyze = () => {
    if (capturedImage) {
      handleCapture(capturedImage);
    }
  };

  const handleCancel = () => {
    setNutritionData(null);
    setAnalysisData(null);
    setCapturedImage(null);
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

        {analyzing && (
          <Card className="border border-border bg-card p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium">Analyzing your food...</p>
            <p className="text-sm text-muted-foreground mt-2">
              This may take a few seconds
            </p>
          </Card>
        )}

        {showConfirmation && nutritionData && (
          <Card className="border border-border bg-card p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Review Analysis</h2>
              <NutritionDisplay data={nutritionData} analysis={analysisData} />
            </div>

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
