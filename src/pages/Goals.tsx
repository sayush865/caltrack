import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Goals = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState({
    daily_calories: 2000,
    daily_protein: 150,
    daily_carbs: 200,
    daily_fat: 65,
    daily_water: 2000,
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_goals")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setGoals({
          daily_calories: data.daily_calories || 2000,
          daily_protein: data.daily_protein || 150,
          daily_carbs: data.daily_carbs || 200,
          daily_fat: data.daily_fat || 65,
          daily_water: data.daily_water || 2000,
        });
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_goals")
        .upsert({
          user_id: user.id,
          ...goals,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Goals updated!",
        description: "Your nutrition goals have been saved.",
      });
    } catch (error) {
      console.error("Error saving goals:", error);
      toast({
        title: "Error",
        description: "Failed to save goals. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setGoals((prev) => ({
      ...prev,
      [field]: parseInt(value) || 0,
    }));
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Nutrition Goals</h1>

        <Card>
          <CardHeader>
            <CardTitle>Daily Targets</CardTitle>
            <CardDescription>
              Set your daily nutrition goals to track your progress
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="calories">Daily Calories (kcal)</Label>
              <Input
                id="calories"
                type="number"
                value={goals.daily_calories}
                onChange={(e) => handleInputChange("daily_calories", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="protein">Daily Protein (g)</Label>
              <Input
                id="protein"
                type="number"
                value={goals.daily_protein}
                onChange={(e) => handleInputChange("daily_protein", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="carbs">Daily Carbs (g)</Label>
              <Input
                id="carbs"
                type="number"
                value={goals.daily_carbs}
                onChange={(e) => handleInputChange("daily_carbs", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fat">Daily Fat (g)</Label>
              <Input
                id="fat"
                type="number"
                value={goals.daily_fat}
                onChange={(e) => handleInputChange("daily_fat", e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="water">Daily Water (ml)</Label>
              <div className="flex gap-2">
                {[
                  { label: '2L', value: 2000 },
                  { label: '2.5L', value: 2500 },
                  { label: '3L', value: 3000 },
                ].map((preset) => (
                  <Button
                    key={preset.value}
                    type="button"
                    variant={goals.daily_water === preset.value ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => handleInputChange("daily_water", preset.value.toString())}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <Input
                id="water"
                type="number"
                value={goals.daily_water}
                onChange={(e) => handleInputChange("daily_water", e.target.value)}
                placeholder="Custom amount"
              />
              <p className="text-xs text-muted-foreground">Or enter a custom amount above</p>
            </div>

            <Button
              onClick={handleSave}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Saving..." : "Save Goals"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Goals;
