import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { History, Loader2, Apple, RefreshCw } from 'lucide-react';
import CameraCapture from '@/components/CameraCapture';
import NutritionDisplay from '@/components/NutritionDisplay';

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [nutritionData, setNutritionData] = useState<any>(null);
  const [analysisBreakdown, setAnalysisBreakdown] = useState<any>(null);
  const [lastImageData, setLastImageData] = useState<string | null>(null);

  const handleCapture = async (imageData: string) => {
    setLastImageData(imageData);
    setAnalyzing(true);
    setNutritionData(null);
    setAnalysisBreakdown({ visual_analysis: '', portion_estimation: '', nutritional_reasoning: '' });

    try {
      const response = await fetch(
        `https://misnkzxiahkxmrfinknn.supabase.co/functions/v1/analyze-food`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({
            imageBase64: imageData,
            userId: '00000000-0000-0000-0000-000000000000'
          })
        }
      );

      if (!response.ok) throw new Error('Analysis failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  fullContent += data.content;
                  // Update UI with partial content for immediate feedback
                  setAnalysisBreakdown({ 
                    visual_analysis: fullContent,
                    portion_estimation: '',
                    nutritional_reasoning: ''
                  });
                }
              } catch (e) {
                console.error('Parse error:', e);
              }
            }
          }
        }
      }

      // Parse the complete JSON response
      const cleanContent = fullContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const nutritionData = JSON.parse(cleanContent);

      // Save to database
      const { data: saveData, error: saveError } = await supabase.functions.invoke('save-food-log', {
        body: {
          imageBase64: imageData,
          userId: '00000000-0000-0000-0000-000000000000',
          nutritionData
        }
      });

      if (saveError) throw saveError;

      setNutritionData(saveData.data);
      setAnalysisBreakdown({
        visual_analysis: nutritionData.visual_analysis,
        portion_estimation: nutritionData.portion_estimation,
        nutritional_reasoning: nutritionData.nutritional_reasoning
      });

      toast({
        title: 'Food analyzed!',
        description: 'Nutrition data has been saved to your log.',
      });
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis failed',
        description: error.message || 'Failed to analyze food. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReanalyze = () => {
    if (lastImageData) {
      handleCapture(lastImageData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <Apple className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">NutraVision</h1>
              <p className="text-sm text-muted-foreground">AI-Powered Nutrition Analysis</p>
            </div>
          </div>
          <div className="flex gap-2">
            {lastImageData && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleReanalyze}
                disabled={analyzing}
                className="h-10 w-10 rounded-xl"
                title="Reanalyze last image"
              >
                <RefreshCw className={`w-5 h-5 ${analyzing ? 'animate-spin' : ''}`} />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/daily-log')}
              className="h-10 w-10 rounded-xl"
            >
              <History className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Camera Section */}
          <div className="space-y-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Capture Your Meal</h2>
              <p className="text-sm text-muted-foreground">Take a photo for instant nutrition analysis</p>
            </div>
            <CameraCapture onCapture={handleCapture} disabled={analyzing} />
          </div>

          {/* Results Section */}
          <div className="space-y-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Nutrition Analysis</h2>
              <p className="text-sm text-muted-foreground">Detailed breakdown powered by AI</p>
            </div>

            {analyzing && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 bg-card rounded-xl border shadow-sm">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium">Analyzing your food...</p>
                </div>
              </div>
            )}

            {nutritionData && !analyzing && (
              <NutritionDisplay data={nutritionData} analysis={analysisBreakdown} />
            )}

            {!nutritionData && !analyzing && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 bg-card rounded-xl border shadow-sm">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Apple className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium">No analysis yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Capture a meal to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;