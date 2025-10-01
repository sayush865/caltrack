-- Drop the foreign key constraint from profiles table
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Drop the foreign key constraint from food_logs table
ALTER TABLE public.food_logs DROP CONSTRAINT IF EXISTS food_logs_user_id_fkey;

-- Insert a dummy profile for the development user ID
INSERT INTO public.profiles (id, email)
VALUES ('00000000-0000-0000-0000-000000000000', 'dev@example.com')
ON CONFLICT (id) DO NOTHING;