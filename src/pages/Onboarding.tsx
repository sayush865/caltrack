import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Activity, Target, User, Weight } from "lucide-react";

type GoalType = 'lose' | 'maintain' | 'gain';
type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form data
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>('prefer_not_to_say');
  const [age, setAge] = useState<number>(25);
  const [height, setHeight] = useState<number>(170);
  const [weight, setWeight] = useState<number>(70);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderately_active');
  const [goalType, setGoalType] = useState<GoalType>('maintain');
  const [unitsPreference, setUnitsPreference] = useState<'imperial' | 'metric'>('metric');

  const calculateGoals = () => {
    // Convert to metric if needed
    const weightKg = unitsPreference === 'imperial' ? weight * 0.453592 : weight;
    const heightCm = unitsPreference === 'imperial' ? height * 2.54 : height;

    // Calculate BMR using Mifflin-St Jeor equation
    let bmr: number;
    if (gender === 'male') {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    } else if (gender === 'female') {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    } else {
      // Use average for other genders
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 78;
    }

    // Activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extra_active: 1.9,
    };

    const tdee = bmr * activityMultipliers[activityLevel];

    // Adjust for goal
    let targetCalories: number;
    if (goalType === 'lose') {
      targetCalories = tdee * 0.85; // 15% deficit
    } else if (goalType === 'gain') {
      targetCalories = tdee * 1.15; // 15% surplus
    } else {
      targetCalories = tdee;
    }

    // Calculate macros (40% carbs, 30% protein, 30% fat)
    const protein = Math.round((targetCalories * 0.30) / 4); // 4 cal per gram
    const carbs = Math.round((targetCalories * 0.40) / 4); // 4 cal per gram
    const fat = Math.round((targetCalories * 0.30) / 9); // 9 cal per gram

    return {
      daily_calories: Math.round(targetCalories),
      daily_protein: protein,
      daily_carbs: carbs,
      daily_fat: fat,
    };
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const goals = calculateGoals();

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: name || undefined,
          age,
          gender,
          height,
          activity_level: activityLevel,
          units_preference: unitsPreference,
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update goals
      const { error: goalsError } = await supabase
        .from('user_goals')
        .update({
          ...goals,
          current_weight: weight,
          goal_type: goalType,
        })
        .eq('user_id', user.id);

      if (goalsError) throw goalsError;

      toast({
        title: "Welcome!",
        description: "Your personalized goals have been set up.",
      });

      navigate('/');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save onboarding data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      navigate('/');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const activityLevels = [
    { value: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
    { value: 'lightly_active', label: 'Lightly Active', desc: 'Exercise 1-3 days/week' },
    { value: 'moderately_active', label: 'Moderately Active', desc: 'Exercise 3-5 days/week' },
    { value: 'very_active', label: 'Very Active', desc: 'Exercise 6-7 days/week' },
    { value: 'extra_active', label: 'Extra Active', desc: 'Physical job + exercise' },
  ];

  const goals = [
    { value: 'lose', label: 'Lose Weight', icon: '📉', desc: '15% calorie deficit' },
    { value: 'maintain', label: 'Maintain Weight', icon: '⚖️', desc: 'Maintain current weight' },
    { value: 'gain', label: 'Gain Weight', icon: '📈', desc: '15% calorie surplus' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress Bar */}
      <div className="w-full bg-muted h-1">
        <div 
          className="bg-primary h-1 transition-all duration-300"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center space-y-2">
                <User className="w-12 h-12 mx-auto text-primary" />
                <h1 className="text-2xl font-bold">Let's get to know you</h1>
                <p className="text-muted-foreground">Tell us a bit about yourself</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name (Optional)</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Gender</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'other', label: 'Other' },
                      { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                    ].map((option) => (
                      <Button
                        key={option.value}
                        variant={gender === option.value ? 'default' : 'outline'}
                        onClick={() => setGender(option.value as Gender)}
                        className="h-12"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value) || 25)}
                    min={13}
                    max={120}
                  />
                </div>
              </div>

              <Button onClick={() => setStep(2)} className="w-full h-12">
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: Body Stats */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center space-y-2">
                <Weight className="w-12 h-12 mx-auto text-primary" />
                <h1 className="text-2xl font-bold">Your body stats</h1>
                <p className="text-muted-foreground">Help us personalize your goals</p>
              </div>

              <div className="space-y-4">
                {/* Units Toggle */}
                <div className="flex items-center justify-center gap-4 py-2">
                  <span className={`text-sm font-medium ${unitsPreference === 'imperial' ? 'text-foreground' : 'text-muted-foreground'}`}>
                    Imperial
                  </span>
                  <Switch 
                    checked={unitsPreference === 'metric'}
                    onCheckedChange={(checked) => setUnitsPreference(checked ? 'metric' : 'imperial')}
                  />
                  <span className={`text-sm font-medium ${unitsPreference === 'metric' ? 'text-foreground' : 'text-muted-foreground'}`}>
                    Metric
                  </span>
                </div>

                <div className="space-y-2">
                  <Label>Height</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                      className="text-xl"
                    />
                    <span className="text-muted-foreground">
                      {unitsPreference === 'imperial' ? 'in' : 'cm'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Current Weight</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                      className="text-xl"
                    />
                    <span className="text-muted-foreground">
                      {unitsPreference === 'imperial' ? 'lbs' : 'kg'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="w-full h-12">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="w-full h-12">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Activity Level */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center space-y-2">
                <Activity className="w-12 h-12 mx-auto text-primary" />
                <h1 className="text-2xl font-bold">Activity level</h1>
                <p className="text-muted-foreground">How active are you?</p>
              </div>

              <div className="space-y-2">
                {activityLevels.map((level) => (
                  <Card
                    key={level.value}
                    className={`p-4 cursor-pointer transition-all ${
                      activityLevel === level.value 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setActivityLevel(level.value as ActivityLevel)}
                  >
                    <div className="font-medium">{level.label}</div>
                    <div className="text-sm text-muted-foreground">{level.desc}</div>
                  </Card>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="w-full h-12">
                  Back
                </Button>
                <Button onClick={() => setStep(4)} className="w-full h-12">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Goal */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center space-y-2">
                <Target className="w-12 h-12 mx-auto text-primary" />
                <h1 className="text-2xl font-bold">Your goal</h1>
                <p className="text-muted-foreground">What would you like to achieve?</p>
              </div>

              <div className="space-y-2">
                {goals.map((goal) => (
                  <Card
                    key={goal.value}
                    className={`p-4 cursor-pointer transition-all ${
                      goalType === goal.value 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setGoalType(goal.value as GoalType)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{goal.icon}</span>
                      <div className="flex-1">
                        <div className="font-medium">{goal.label}</div>
                        <div className="text-sm text-muted-foreground">{goal.desc}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Preview Goals */}
              <Card className="p-4 bg-primary/5 border-primary">
                <div className="text-center space-y-2">
                  <div className="text-sm text-muted-foreground">Your Daily Goal</div>
                  <div className="text-3xl font-bold">{calculateGoals().daily_calories}</div>
                  <div className="text-sm text-muted-foreground">calories/day</div>
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                    <div>
                      <div className="text-xs text-muted-foreground">Protein</div>
                      <div className="font-medium">{calculateGoals().daily_protein}g</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Carbs</div>
                      <div className="font-medium">{calculateGoals().daily_carbs}g</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Fat</div>
                      <div className="font-medium">{calculateGoals().daily_fat}g</div>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(3)} className="w-full h-12">
                    Back
                  </Button>
                  <Button onClick={handleComplete} disabled={loading} className="w-full h-12">
                    {loading ? 'Setting up...' : 'Complete Setup'}
                  </Button>
                </div>
                <Button variant="ghost" onClick={handleSkip} className="w-full">
                  Skip for now
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
