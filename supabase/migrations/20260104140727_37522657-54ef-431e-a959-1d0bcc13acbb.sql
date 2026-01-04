-- Create exercise_logs table for tracking user workouts
CREATE TABLE public.exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  exercise_name TEXT NOT NULL,
  exercise_type TEXT NOT NULL, -- cardio, strength, flexibility, sports
  duration_minutes INTEGER NOT NULL,
  calories_burned NUMERIC NOT NULL,
  intensity TEXT, -- low, moderate, high, very_high
  distance_km NUMERIC, -- for running, cycling, etc.
  sets INTEGER, -- for strength training
  reps INTEGER, -- for strength training
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  status INTEGER DEFAULT 1
);

-- Enable RLS on exercise_logs
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for exercise_logs
CREATE POLICY "Users can view own exercise logs"
ON public.exercise_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercise logs"
ON public.exercise_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercise logs"
ON public.exercise_logs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercise logs"
ON public.exercise_logs FOR DELETE
USING (auth.uid() = user_id);

-- Create exercise_database table with common exercises and MET values
CREATE TABLE public.exercise_database (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- cardio, strength, sports, flexibility
  met_value NUMERIC NOT NULL, -- Metabolic Equivalent of Task
  description TEXT,
  icon TEXT, -- emoji
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on exercise_database (public read access)
ALTER TABLE public.exercise_database ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view exercise database"
ON public.exercise_database FOR SELECT
USING (true);

-- Add exercise-related goals to user_goals
ALTER TABLE public.user_goals
ADD COLUMN daily_exercise_minutes INTEGER NOT NULL DEFAULT 30,
ADD COLUMN weekly_exercise_days INTEGER NOT NULL DEFAULT 4,
ADD COLUMN daily_active_calories INTEGER NOT NULL DEFAULT 300;

-- Enable realtime for exercise_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.exercise_logs;