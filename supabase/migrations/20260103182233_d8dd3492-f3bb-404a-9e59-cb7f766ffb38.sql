-- Add daily_fiber column to user_goals table
ALTER TABLE public.user_goals 
ADD COLUMN IF NOT EXISTS daily_fiber integer NOT NULL DEFAULT 25;