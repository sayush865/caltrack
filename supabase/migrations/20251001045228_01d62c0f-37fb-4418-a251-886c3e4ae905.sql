-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create food_logs table
CREATE TABLE public.food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT,
  food_name TEXT,
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
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own food logs"
  ON public.food_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own food logs"
  ON public.food_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own food logs"
  ON public.food_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own food logs"
  ON public.food_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for auto-creating profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for food_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_logs;