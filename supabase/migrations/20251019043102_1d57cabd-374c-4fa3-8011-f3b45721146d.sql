-- Add onboarding_completed flag to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add goal_type to user_goals
ALTER TABLE public.user_goals 
ADD COLUMN IF NOT EXISTS goal_type TEXT DEFAULT 'maintain' CHECK (goal_type IN ('lose', 'maintain', 'gain'));