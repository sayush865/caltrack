-- Create meal_templates table for storing favorite meals
CREATE TABLE public.meal_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  food_name TEXT NOT NULL,
  calories NUMERIC,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC,
  fiber NUMERIC,
  sugar NUMERIC,
  sodium NUMERIC,
  vitamin_a NUMERIC,
  vitamin_c NUMERIC,
  calcium NUMERIC,
  iron NUMERIC,
  meal_type TEXT,
  image_url TEXT,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.meal_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for meal_templates
CREATE POLICY "Users can view own meal templates" 
ON public.meal_templates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own meal templates" 
ON public.meal_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal templates" 
ON public.meal_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal templates" 
ON public.meal_templates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create weekly_challenges table for gamification
CREATE TABLE public.weekly_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_type TEXT NOT NULL,
  target INTEGER NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  week_start DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for weekly_challenges
CREATE POLICY "Users can view own weekly challenges" 
ON public.weekly_challenges 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own weekly challenges" 
ON public.weekly_challenges 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly challenges" 
ON public.weekly_challenges 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for meal_templates updated_at
CREATE TRIGGER update_meal_templates_updated_at
BEFORE UPDATE ON public.meal_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();