// Client-side seed list used as the browse source when exercise_database is
// empty server-side (unseeded in prod). MET values from the Compendium of
// Physical Activities (rounded, moderate-effort defaults).

export interface SeedExercise {
  id: string;
  name: string;
  category: "Cardio" | "Strength" | "Sports" | "Flexibility";
  met: number;
  description?: string;
}

export const EXERCISE_SEED: SeedExercise[] = [
  // Cardio
  { id: "seed-walking", name: "Walking (brisk)", category: "Cardio", met: 4.3, description: "5.5 km/h, firm surface" },
  { id: "seed-jogging", name: "Jogging", category: "Cardio", met: 7.0, description: "Easy conversational pace" },
  { id: "seed-running", name: "Running", category: "Cardio", met: 9.8, description: "About 10 km/h" },
  { id: "seed-cycling", name: "Cycling", category: "Cardio", met: 7.5, description: "Moderate effort, 19-22 km/h" },
  { id: "seed-swimming", name: "Swimming (laps)", category: "Cardio", met: 7.0, description: "Freestyle, moderate effort" },
  { id: "seed-elliptical", name: "Elliptical trainer", category: "Cardio", met: 5.0, description: "Moderate effort" },
  { id: "seed-rowing", name: "Rowing machine", category: "Cardio", met: 7.0, description: "Moderate effort" },
  { id: "seed-jump-rope", name: "Jump rope", category: "Cardio", met: 11.0, description: "Continuous skipping" },
  { id: "seed-stairs", name: "Stair climbing", category: "Cardio", met: 8.0, description: "Stairs or stepmill" },
  { id: "seed-hiit", name: "HIIT workout", category: "Cardio", met: 8.0, description: "Interval circuits" },
  { id: "seed-hiking", name: "Hiking", category: "Cardio", met: 6.0, description: "Cross-country trails" },
  { id: "seed-dancing", name: "Dancing", category: "Cardio", met: 5.5, description: "Aerobic or general dance" },
  // Strength
  { id: "seed-weights", name: "Weight training", category: "Strength", met: 5.0, description: "Free weights or machines" },
  { id: "seed-bodyweight", name: "Bodyweight workout", category: "Strength", met: 3.8, description: "Push-ups, squats, lunges" },
  { id: "seed-crossfit", name: "CrossFit", category: "Strength", met: 5.6, description: "Mixed functional training" },
  { id: "seed-kettlebell", name: "Kettlebell workout", category: "Strength", met: 8.0, description: "Swings and circuits" },
  { id: "seed-circuit", name: "Circuit training", category: "Strength", met: 4.3, description: "Moderate stations, some aerobic" },
  // Sports
  { id: "seed-badminton", name: "Badminton", category: "Sports", met: 5.5, description: "Social singles or doubles" },
  { id: "seed-cricket", name: "Cricket", category: "Sports", met: 4.8, description: "Batting and bowling" },
  { id: "seed-football", name: "Football", category: "Sports", met: 7.0, description: "Casual game" },
  { id: "seed-basketball", name: "Basketball", category: "Sports", met: 6.5, description: "General play" },
  { id: "seed-tennis", name: "Tennis", category: "Sports", met: 7.3, description: "General play" },
  { id: "seed-table-tennis", name: "Table tennis", category: "Sports", met: 4.0, description: "Singles or doubles" },
  { id: "seed-squash", name: "Squash", category: "Sports", met: 9.5, description: "General play" },
  { id: "seed-volleyball", name: "Volleyball", category: "Sports", met: 4.0, description: "Casual 6-a-side" },
  // Flexibility
  { id: "seed-yoga", name: "Yoga", category: "Flexibility", met: 2.5, description: "Hatha / general flow" },
  { id: "seed-pilates", name: "Pilates", category: "Flexibility", met: 3.0, description: "Mat work, general" },
  { id: "seed-stretching", name: "Stretching", category: "Flexibility", met: 2.3, description: "Mild stretching routine" },
];

/** kcal = MET x weight(kg) x hours. All weights stored in kg (lib/units contract). */
export function exerciseCalories(met: number, weightKg: number, minutes: number): number {
  return Math.round(met * weightKg * (minutes / 60));
}

export function intensityFromMet(met: number): "low" | "moderate" | "high" | "very_high" {
  if (met < 4) return "low";
  if (met < 7) return "moderate";
  if (met < 10) return "high";
  return "very_high";
}

export function intensityLabel(met: number): string {
  if (met < 4) return "Low";
  if (met < 7) return "Moderate";
  if (met < 10) return "High";
  return "Very high";
}
