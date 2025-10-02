-- Add username column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Update the handle_new_user function to support username from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data->>'username'
  );
  RETURN NEW;
END;
$$;

-- Create a function to find user by username or email
CREATE OR REPLACE FUNCTION public.get_user_by_username_or_email(identifier text)
RETURNS TABLE (
  user_id uuid,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT id, profiles.email
  FROM public.profiles
  WHERE profiles.username = identifier OR profiles.email = identifier
  LIMIT 1;
END;
$$;

-- Insert test user (username: test, password: tst)
-- Note: We'll create this via the auth system in the app