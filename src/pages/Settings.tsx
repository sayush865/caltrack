import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    username: '',
    email: '',
  });
  const [goals, setGoals] = useState({
    daily_calories: 2000,
    daily_protein: 150,
    daily_carbs: 250,
    daily_fat: 65,
    current_weight: 0,
    goal_weight: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, email')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile({
          username: profileData.username || '',
          email: profileData.email || user.email || '',
        });
      }

      // Fetch goals
      const { data: goalsData } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (goalsData) {
        setGoals({
          daily_calories: goalsData.daily_calories,
          daily_protein: goalsData.daily_protein,
          daily_carbs: goalsData.daily_carbs,
          daily_fat: goalsData.daily_fat,
          current_weight: Number(goalsData.current_weight) || 0,
          goal_weight: Number(goalsData.goal_weight) || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSaveGoals = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_goals')
        .update({
          daily_calories: goals.daily_calories,
          daily_protein: goals.daily_protein,
          daily_carbs: goals.daily_carbs,
          daily_fat: goals.daily_fat,
          current_weight: goals.current_weight || null,
          goal_weight: goals.goal_weight || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your nutrition goals have been updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update goals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
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
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your profile and nutrition goals
            </p>
          </div>
        </div>

        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={profile.username}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile.email}
                disabled
                className="bg-muted"
              />
            </div>
          </CardContent>
        </Card>

        {/* Weight Goals */}
        <Card>
          <CardHeader>
            <CardTitle>Weight Goals</CardTitle>
            <CardDescription>Track your weight progress (optional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_weight">Current Weight (lbs)</Label>
                <Input
                  id="current_weight"
                  type="number"
                  value={goals.current_weight || ''}
                  onChange={(e) => setGoals({ ...goals, current_weight: Number(e.target.value) || 0 })}
                  placeholder="150"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal_weight">Goal Weight (lbs)</Label>
                <Input
                  id="goal_weight"
                  type="number"
                  value={goals.goal_weight || ''}
                  onChange={(e) => setGoals({ ...goals, goal_weight: Number(e.target.value) || 0 })}
                  placeholder="140"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nutrition Goals */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Nutrition Goals</CardTitle>
            <CardDescription>Set your daily macro targets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="calories">Calories</Label>
                <Input
                  id="calories"
                  type="number"
                  value={goals.daily_calories}
                  onChange={(e) => setGoals({ ...goals, daily_calories: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protein">Protein (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  value={goals.daily_protein}
                  onChange={(e) => setGoals({ ...goals, daily_protein: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbs">Carbs (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  value={goals.daily_carbs}
                  onChange={(e) => setGoals({ ...goals, daily_carbs: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fat">Fat (g)</Label>
                <Input
                  id="fat"
                  type="number"
                  value={goals.daily_fat}
                  onChange={(e) => setGoals({ ...goals, daily_fat: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <Button
              onClick={handleSaveGoals}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Goals'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
