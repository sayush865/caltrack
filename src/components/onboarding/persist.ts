// Writes the finished quiz to profiles + user_goals. Lives here (not src/hooks)
// because at signup time the fresh session hasn't propagated through
// AuthProvider yet — we write with the uid returned by signUp directly.

import { supabase } from "@/integrations/supabase/client";
import { clearDraft, computePlan, type QuizAnswers } from "./quiz";

const EXERCISE_DAYS: Record<NonNullable<QuizAnswers["exerciseDays"]>, number> = {
  "0-1": 1,
  "2-3": 3,
  "4-5": 5,
  "6+": 6,
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Persist quiz answers: profiles (age/gender/height/activity/units/
 * onboarding_completed) + user_goals (targets from lib/energy.ts, weights in kg).
 * NEVER overwrites an existing username; fills it from the email prefix only
 * when the trigger left it null. Clears the local draft on success.
 */
export async function completeOnboarding(
  uid: string,
  email: string | null,
  answers: QuizAnswers,
): Promise<void> {
  const plan = computePlan(answers);
  if (!plan) throw new Error("Plan is incomplete");

  // -- profiles ---------------------------------------------------
  const { data: prof, error: profSelectError } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", uid)
    .maybeSingle();
  if (profSelectError) throw profSelectError;

  const fallbackUsername = email ? email.split("@")[0] : null;
  const profilePatch = {
    age: answers.age ?? null,
    gender: answers.sex ?? null,
    height: answers.heightCm !== undefined ? Math.round(answers.heightCm) : null, // cm
    activity_level: answers.activity ?? null,
    units_preference: answers.units,
    onboarding_completed: true,
    ...(prof?.username ? {} : fallbackUsername ? { username: fallbackUsername } : {}),
  };

  if (prof) {
    const { error } = await supabase.from("profiles").update(profilePatch).eq("id", uid);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("profiles").insert({ id: uid, email, ...profilePatch });
    if (error) throw error;
  }

  // -- user_goals -------------------------------------------------
  const goalWeightKg =
    answers.goalWeightKg !== undefined
      ? round1(answers.goalWeightKg)
      : answers.weightKg !== undefined
        ? round1(answers.weightKg) // maintain: goal = current
        : null;

  const goalsPatch = {
    daily_calories: plan.calories,
    daily_protein: plan.protein,
    daily_carbs: plan.carbs,
    daily_fat: plan.fat,
    daily_fiber: plan.fiber,
    goal_type: plan.goal,
    current_weight: answers.weightKg !== undefined ? round1(answers.weightKg) : null,
    goal_weight: goalWeightKg,
    weekly_exercise_days: answers.exerciseDays ? EXERCISE_DAYS[answers.exerciseDays] : 3,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: goalsSelectError } = await supabase
    .from("user_goals")
    .select("id")
    .eq("user_id", uid)
    .maybeSingle();
  if (goalsSelectError) throw goalsSelectError;

  if (existing) {
    const { error } = await supabase.from("user_goals").update(goalsPatch).eq("user_id", uid);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("user_goals").insert({ ...goalsPatch, user_id: uid });
    if (error) throw error;
  }

  clearDraft();
}
