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
  meal_type?: string;
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
      const userId = '00000000-0000-0000-0000-000000000000';
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-food`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            imageBase64: imageData,
            userId: userId
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error('No response stream');

      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'complete') {
                setNutritionData(parsed.data);
                setAnalysisData(parsed.analysis);
                setShowConfirmation(true);
                setAnalyzing(false);
                return;
              }
              
              if (parsed.type === 'error') {
                throw new Error(parsed.error);
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze food image. Please try again.",
        variant: "destructive",
      });
      setAnalyzing(false);
    }
  };

  const handleSaveToLog = async () => {
    if (!nutritionData) return;

    toast({
      title: "Success!",
      description: "Meal logged successfully",
    });

    navigate('/');
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
    <div className="min-h-screen bg-background">
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
