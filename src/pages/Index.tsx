import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LogOut, History, Loader2, Apple } from 'lucide-react';
import CameraCapture from '@/components/CameraCapture';
import NutritionDisplay from '@/components/NutritionDisplay';

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [nutritionData, setNutritionData] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleCapture = async (imageData: string) => {
    if (!user) return;

    setAnalyzing(true);
    setNutritionData(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-food', {
        body: {
          imageBase64: imageData,
          userId: user.id
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
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background">
      <div className="container max-w-2xl mx-auto p-4 space-y-4">
        <header className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <Apple className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">NutraVision</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/daily-log')}
              className="rounded-full"
            >
              <History className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="rounded-full"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Capture Your Meal</h2>
            <CameraCapture onCapture={handleCapture} disabled={analyzing} />
          </div>

          {analyzing && (
            <div className="flex items-center justify-center py-12 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-muted-foreground">Analyzing your food with AI...</p>
            </div>
          )}

          {nutritionData && !analyzing && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Nutrition Information</h2>
              <NutritionDisplay data={nutritionData} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;