-- Create user_streaks table for tracking logging streaks
CREATE TABLE public.user_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own streaks" 
ON public.user_streaks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streaks" 
ON public.user_streaks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks" 
ON public.user_streaks 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_streaks_updated_at
BEFORE UPDATE ON public.user_streaks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update streak when user logs food
CREATE OR REPLACE FUNCTION public.update_user_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  last_date DATE;
  curr_streak INTEGER;
  long_streak INTEGER;
BEGIN
  current_user_id := NEW.user_id;
  
  -- Get current streak data
  SELECT last_active_date, current_streak, longest_streak 
  INTO last_date, curr_streak, long_streak
  FROM user_streaks 
  WHERE user_id = current_user_id;
  
  -- If no streak record exists, create one
  IF NOT FOUND THEN
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_active_date)
    VALUES (current_user_id, 1, 1, CURRENT_DATE);
    RETURN NEW;
  END IF;
  
  -- If already logged today, do nothing
  IF last_date = CURRENT_DATE THEN
    RETURN NEW;
  END IF;
  
  -- If logged yesterday, increment streak
  IF last_date = CURRENT_DATE - INTERVAL '1 day' THEN
    curr_streak := curr_streak + 1;
    IF curr_streak > long_streak THEN
      long_streak := curr_streak;
    END IF;
  -- If more than 1 day gap, reset streak
  ELSE
    curr_streak := 1;
  END IF;
  
  -- Update the streak record
  UPDATE user_streaks 
  SET current_streak = curr_streak,
      longest_streak = long_streak,
      last_active_date = CURRENT_DATE
  WHERE user_id = current_user_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to update streak on food log insert
CREATE TRIGGER on_food_log_update_streak
AFTER INSERT ON public.food_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_user_streak();