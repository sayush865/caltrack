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
  const [streamingText, setStreamingText] = useState('');

  const handleCapture = async (imageData: string) => {
    setCapturedImage(imageData);
    setAnalyzing(true);
    setShowConfirmation(false);
    setStreamingText('');

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

      console.log('Starting analysis with streaming...');
      
      // Use direct fetch for streaming
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-food`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ imageBase64: imageData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      if (!response.body) throw new Error('No response stream');

      console.log('Stream started, processing chunks...');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let receivedData = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('Stream complete');
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (!trimmedLine || trimmedLine.startsWith(':')) {
              continue;
            }
            
            if (!trimmedLine.startsWith('data: ')) {
              continue;
            }

            const data = trimmedLine.slice(6).trim();
            if (!data) continue;

            console.log('Received SSE data:', data.substring(0, 100));

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                console.error('Stream error:', parsed.error);
                throw new Error(parsed.error);
              }

              if (parsed.chunk) {
                receivedData = true;
                console.log('Adding chunk to stream:', parsed.chunk);
                setStreamingText(prev => {
                  const newText = prev + parsed.chunk;
                  console.log('Current streaming text length:', newText.length);
                  return newText;
                });
              }

              if (parsed.done && parsed.nutritionData && parsed.analysis) {
                console.log('Received final data');
                setNutritionData(parsed.nutritionData);
                setAnalysisData(parsed.analysis);
                setShowConfirmation(true);
                setStreamingText('');
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e, 'Data:', data.substring(0, 100));
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim() && buffer.startsWith('data: ')) {
          const data = buffer.slice(6).trim();
          try {
            const parsed = JSON.parse(data);
            if (parsed.done && parsed.nutritionData && parsed.analysis) {
              console.log('Received final data from buffer');
              setNutritionData(parsed.nutritionData);
              setAnalysisData(parsed.analysis);
              setShowConfirmation(true);
              setStreamingText('');
            }
          } catch (e) {
            console.error('Failed to parse final SSE data:', e);
          }
        }

        if (!receivedData) {
          console.warn('No streaming data received');
        }

      } catch (streamError) {
        console.error('Stream reading error:', streamError);
        throw streamError;
      }

    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze food image. Please try again.",
        variant: "destructive",
      });
      setStreamingText('');
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
          <Card className="border border-border bg-card p-8 space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-lg font-medium">Analyzing your food...</p>
            </div>
            
            {streamingText && (
              <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                  {streamingText}
                  <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                </p>
              </div>
            )}
            
            {!streamingText && (
              <p className="text-sm text-muted-foreground">
                Initializing AI analysis...
              </p>
            )}
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
