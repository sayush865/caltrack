-- Create function to initialize user goals for new users
CREATE OR REPLACE FUNCTION public.initialize_user_goals()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_goals (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to initialize goals when user is created
DROP TRIGGER IF EXISTS on_user_created_initialize_goals ON public.profiles;
CREATE TRIGGER on_user_created_initialize_goals
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_goals();