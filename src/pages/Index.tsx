import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { History, Loader2, Apple } from 'lucide-react';
import CameraCapture from '@/components/CameraCapture';
import NutritionDisplay from '@/components/NutritionDisplay';

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [nutritionData, setNutritionData] = useState<any>(null);

  const handleCapture = async (imageData: string) => {

    setAnalyzing(true);
    setNutritionData(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-food', {
        body: {
          imageBase64: imageData,
          userId: '00000000-0000-0000-0000-000000000000'
        }
      });

      if (error) throw error;

      if (data?.data) {
        setNutritionData(data.data);
        toast({
          title: 'Food analyzed!',
          description: 'Nutrition data has been saved to your log.',
        });
      }
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
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/daily-log')}
            className="h-10 w-10 rounded-xl"
          >
            <History className="w-5 h-5" />
          </Button>
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
                  <p className="text-sm text-muted-foreground mt-1">Using GPT-5 for accurate results</p>
                </div>
              </div>
            )}

            {nutritionData && !analyzing && (
              <NutritionDisplay data={nutritionData} />
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