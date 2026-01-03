import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Activity, Target, TrendingUp } from 'lucide-react';

interface ProfileData {
  age: number | null;
  gender: string | null;
  height: number | null;
  activity_level: string | null;
  units_preference: string;
}

interface GoalsData {
  current_weight: number | null;
  goal_weight: number | null;
  daily_calories: number;
}

export default function HealthMetricsWidget() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [goals, setGoals] = useState<GoalsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, goalsRes] = await Promise.all([
        supabase.from('profiles').select('age, gender, height, activity_level, units_preference').eq('id', user.id).maybeSingle(),
        supabase.from('user_goals').select('current_weight, goal_weight, daily_calories').eq('user_id', user.id).maybeSingle(),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (goalsRes.data) setGoals(goalsRes.data);
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateBMI = () => {
    if (!profile?.height || !goals?.current_weight) return null;
    
    const isImperial = profile.units_preference === 'imperial';
    let heightM: number;
    let weightKg: number;

    if (isImperial) {
      heightM = (profile.height * 2.54) / 100;
      weightKg = goals.current_weight * 0.453592;
    } else {
      heightM = profile.height / 100;
      weightKg = goals.current_weight;
    }

    return weightKg / (heightM * heightM);
  };

  const calculateBMR = () => {
    if (!profile?.height || !goals?.current_weight || !profile?.age || !profile?.gender) return null;
    
    const isImperial = profile.units_preference === 'imperial';
    let heightCm: number;
    let weightKg: number;

    if (isImperial) {
      heightCm = profile.height * 2.54;
      weightKg = goals.current_weight * 0.453592;
    } else {
      heightCm = profile.height;
      weightKg = goals.current_weight;
    }

    if (profile.gender === 'male') {
      return 10 * weightKg + 6.25 * heightCm - 5 * profile.age + 5;
    } else {
      return 10 * weightKg + 6.25 * heightCm - 5 * profile.age - 161;
    }
  };

  const calculateTDEE = () => {
    const bmr = calculateBMR();
    if (!bmr || !profile?.activity_level) return null;

    const multipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    return bmr * (multipliers[profile.activity_level] || 1.2);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-yellow-600' };
    if (bmi < 25) return { label: 'Normal', color: 'text-green-600' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-orange-600' };
    return { label: 'Obese', color: 'text-red-600' };
  };

  const getWeightToGoal = () => {
    if (!goals?.current_weight || !goals?.goal_weight) return null;
    const diff = goals.current_weight - goals.goal_weight;
    const isImperial = profile?.units_preference === 'imperial';
    const unit = isImperial ? 'lbs' : 'kg';
    return { value: Math.abs(diff).toFixed(1), unit, isLosing: diff > 0 };
  };

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-20 bg-muted rounded" />
      </Card>
    );
  }

  const bmi = calculateBMI();
  const tdee = calculateTDEE();
  const weightToGoal = getWeightToGoal();
  const bmiCategory = bmi ? getBMICategory(bmi) : null;

  // Don't show if no meaningful data
  if (!bmi && !tdee && !weightToGoal) return null;

  return (
    <Card className="overflow-hidden border border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Health Metrics
        </h3>
        
        <div className="grid grid-cols-3 gap-3">
          {/* BMI */}
          {bmi && bmiCategory && (
            <div className="text-center space-y-1">
              <div className="w-10 h-10 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                <Activity className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-xl font-bold">{bmi.toFixed(1)}</div>
              <div className={`text-xs font-medium ${bmiCategory.color}`}>
                {bmiCategory.label}
              </div>
            </div>
          )}

          {/* TDEE */}
          {tdee && (
            <div className="text-center space-y-1">
              <div className="w-10 h-10 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-xl font-bold">{Math.round(tdee)}</div>
              <div className="text-xs text-muted-foreground">TDEE</div>
            </div>
          )}

          {/* Weight to Goal */}
          {weightToGoal && (
            <div className="text-center space-y-1">
              <div className="w-10 h-10 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                <Target className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-xl font-bold">{weightToGoal.value}</div>
              <div className="text-xs text-muted-foreground">
                {weightToGoal.unit} to go
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
