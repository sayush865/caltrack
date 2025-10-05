import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HealthMetricsProps {
  age?: number | null;
  gender?: string | null;
  height?: number | null;
  currentWeight?: number | null;
  activityLevel?: string | null;
  unitsPreference: 'imperial' | 'metric';
}

export const HealthMetrics = ({ 
  age, 
  gender, 
  height, 
  currentWeight, 
  activityLevel,
  unitsPreference 
}: HealthMetricsProps) => {
  
  const calculateBMI = () => {
    if (!height || !currentWeight) return null;
    
    if (unitsPreference === 'imperial') {
      // BMI = (weight in lbs / (height in inches)^2) * 703
      return ((currentWeight / (height * height)) * 703).toFixed(1);
    } else {
      // BMI = weight in kg / (height in meters)^2
      const heightInMeters = height / 100;
      return (currentWeight / (heightInMeters * heightInMeters)).toFixed(1);
    }
  };

  const calculateBMR = () => {
    if (!height || !currentWeight || !age || !gender) return null;
    
    let bmr: number;
    
    if (unitsPreference === 'imperial') {
      // Mifflin-St Jeor Equation (imperial)
      const weightInKg = currentWeight * 0.453592;
      const heightInCm = height * 2.54;
      
      if (gender === 'male') {
        bmr = (10 * weightInKg) + (6.25 * heightInCm) - (5 * age) + 5;
      } else {
        bmr = (10 * weightInKg) + (6.25 * heightInCm) - (5 * age) - 161;
      }
    } else {
      // Mifflin-St Jeor Equation (metric)
      if (gender === 'male') {
        bmr = (10 * currentWeight) + (6.25 * height) - (5 * age) + 5;
      } else {
        bmr = (10 * currentWeight) + (6.25 * height) - (5 * age) - 161;
      }
    }
    
    return Math.round(bmr);
  };

  const calculateTDEE = () => {
    const bmr = calculateBMR();
    if (!bmr || !activityLevel) return null;
    
    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extra_active: 1.9
    };
    
    const multiplier = activityMultipliers[activityLevel] || 1.2;
    return Math.round(bmr * multiplier);
  };

  const bmi = calculateBMI();
  const bmr = calculateBMR();
  const tdee = calculateTDEE();

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { text: 'Underweight', color: 'text-blue-500' };
    if (bmi < 25) return { text: 'Normal', color: 'text-green-500' };
    if (bmi < 30) return { text: 'Overweight', color: 'text-yellow-500' };
    return { text: 'Obese', color: 'text-red-500' };
  };

  if (!bmi && !bmr && !tdee) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Health Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Complete your profile information to see calculated health metrics
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health Metrics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bmi && (
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">BMI</span>
              <span className="text-2xl font-bold">{bmi}</span>
            </div>
            <p className={`text-xs ${getBMICategory(Number(bmi)).color}`}>
              {getBMICategory(Number(bmi)).text}
            </p>
          </div>
        )}
        
        {bmr && (
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">BMR</span>
              <span className="text-2xl font-bold">{bmr}</span>
            </div>
            <p className="text-xs text-muted-foreground">Basal Metabolic Rate (cal/day)</p>
          </div>
        )}
        
        {tdee && (
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">TDEE</span>
              <span className="text-2xl font-bold">{tdee}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total Daily Energy Expenditure</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
