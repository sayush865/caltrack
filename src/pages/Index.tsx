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
    setAnalysisBreakdown(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      console.log('Starting analysis...');
      
      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-food`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          imageBase64: imageData,
          userId: '00000000-0000-0000-0000-000000000000'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start analysis');
      }

      console.log('Response received, starting to read stream...');

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let streamedContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream complete');
          break;
        }

        console.log('Received chunk, size:', value.length);

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '' || !line.startsWith('data: ')) {
            continue;
          }
          
          const data = line.slice(6);
          
          try {
            const parsed = JSON.parse(data);
            console.log('Parsed event:', parsed.type);
            
            if (parsed.type === 'content') {
              streamedContent += parsed.content;
              console.log('Content chunk received, total length:', streamedContent.length);
              // Update the display with partial content
              setAnalysisBreakdown({ streaming: streamedContent });
            } else if (parsed.type === 'complete') {
              console.log('Analysis complete');
              setNutritionData(parsed.data);
              setAnalysisBreakdown(parsed.analysis);
              setAnalyzing(false);
              toast({
                title: 'Food analyzed!',
                description: 'Nutrition data has been saved to your log.',
              });
            } else if (parsed.type === 'error') {
              throw new Error(parsed.error);
            }
          } catch (e) {
            console.error('Error parsing stream chunk:', e, 'Data:', data);
          }
        }
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis failed',
        description: error.message || 'Failed to analyze food. Please try again.',
        variant: 'destructive',
      });
      setAnalyzing(false);
    }
  };

  const handleReanalyze = () => {
    if (lastImageData) {
      handleCapture(lastImageData);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
              <Apple className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">NutraVision</h1>
              <p className="text-sm text-muted-foreground">AI-Powered Food Analysis</p>
            </div>
          </div>
          <div className="flex gap-3">
            {lastImageData && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleReanalyze}
                disabled={analyzing}
                className="h-11 w-11 border-border hover:bg-muted"
                title="Reanalyze last image"
              >
                <RefreshCw className={`w-5 h-5 ${analyzing ? 'animate-spin' : ''}`} />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/daily-log')}
              className="h-11 w-11 border-border hover:bg-muted"
            >
              <History className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Camera Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Capture Meal</h2>
              <p className="text-muted-foreground">Take or upload a photo for instant analysis</p>
            </div>
            <CameraCapture onCapture={handleCapture} disabled={analyzing} />
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Analysis Results</h2>
              <p className="text-muted-foreground">Comprehensive nutritional breakdown</p>
            </div>

            {analyzing && (
              <div className="flex flex-col gap-6 bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-foreground" />
                  <div>
                    <p className="text-lg font-semibold">Analyzing Food</p>
                    <p className="text-sm text-muted-foreground">AI is analyzing your meal...</p>
                  </div>
                </div>
                
                {analysisBreakdown?.streaming && (
                  <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap font-mono">{analysisBreakdown.streaming}</p>
                  </div>
                )}
              </div>
            )}

            {nutritionData && !analyzing && (
              <NutritionDisplay data={nutritionData} analysis={analysisBreakdown} />
            )}

            {!nutritionData && !analyzing && (
              <div className="flex flex-col items-center justify-center py-24 gap-6 bg-card rounded-xl border border-border">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                  <Apple className="w-10 h-10 text-muted-foreground" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold">No Analysis Yet</p>
                  <p className="text-sm text-muted-foreground">Capture or upload an image to begin</p>
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